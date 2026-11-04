"""Server-side abuse limits for send_verification_email.

Counters live in the `rate_limits` collection, which firestore.rules denies to
every client. Keys never contain a raw email address: the per-address key is a
SHA-256 of the lowercased address.
"""
import hashlib
from datetime import timedelta

from firebase_admin import firestore

EMAIL_LIMIT = 3            # links per address per window
EMAIL_WINDOW = timedelta(hours=1)
DAILY_LIMIT = 200          # links per day across the project (Brevo free tier: 300/day)

COLLECTION = "rate_limits"


class RateLimited(Exception):
    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


def email_key(email: str) -> str:
    return "email_" + hashlib.sha256(email.strip().lower().encode("utf-8")).hexdigest()


def day_key(now) -> str:
    return "day_" + now.strftime("%Y-%m-%d")  # now is UTC


def check_and_count(db, email: str, now) -> None:
    """Count one link against both limits, or raise RateLimited (nothing counted)."""
    email_ref = db.collection(COLLECTION).document(email_key(email))
    day_ref = db.collection(COLLECTION).document(day_key(now))

    @firestore.transactional
    def run(transaction):
        email_snap = email_ref.get(transaction=transaction)
        day_snap = day_ref.get(transaction=transaction)

        e = email_snap.to_dict() if email_snap.exists else None
        if e and now - e["windowStart"] < EMAIL_WINDOW:
            email_count, window_start = e["count"], e["windowStart"]
        else:
            email_count, window_start = 0, now
        day_count = day_snap.to_dict()["count"] if day_snap.exists else 0

        if email_count >= EMAIL_LIMIT:
            raise RateLimited("Too many sign-in links requested for this email address. Please try again in an hour.")
        if day_count >= DAILY_LIMIT:
            raise RateLimited("The demo has reached its daily limit for sign-in emails. Please try again tomorrow.")

        transaction.set(email_ref, {"count": email_count + 1, "windowStart": window_start, "updatedAt": now})
        transaction.set(day_ref, {"count": day_count + 1, "updatedAt": now})

    run(db.transaction())


def refund(db, email: str, now) -> None:
    """Undo one check_and_count, for a link that was never sent. Never below 0."""
    email_ref = db.collection(COLLECTION).document(email_key(email))
    day_ref = db.collection(COLLECTION).document(day_key(now))

    @firestore.transactional
    def run(transaction):
        email_snap = email_ref.get(transaction=transaction)
        day_snap = day_ref.get(transaction=transaction)
        if email_snap.exists and email_snap.to_dict().get("count", 0) > 0:
            transaction.update(email_ref, {"count": email_snap.to_dict()["count"] - 1, "updatedAt": now})
        if day_snap.exists and day_snap.to_dict().get("count", 0) > 0:
            transaction.update(day_ref, {"count": day_snap.to_dict()["count"] - 1, "updatedAt": now})

    run(db.transaction())
