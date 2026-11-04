"""Scheduled deletion of stale data. Logs counts only, never document contents."""
import logging
from datetime import date, timedelta

PER_RUN_CAP = 500  # per collection; a backlog drains over successive runs

SESSION_GRACE = timedelta(hours=1)    # after expiresAt
APPOINTMENT_AGE = timedelta(days=7)   # after the appointment date
RATE_LIMIT_AGE = timedelta(days=2)    # after last update


def _delete(db, query) -> int:
    refs = [d.reference for d in query.limit(PER_RUN_CAP).stream()]
    if refs:
        batch = db.batch()
        for ref in refs:
            batch.delete(ref)
        batch.commit()
    return len(refs)


def purge_stale(db, now, local_today: str) -> dict:
    """now: timezone-aware datetime. local_today: YYYY-MM-DD in the centre's timezone."""
    cutoff_date = (date.fromisoformat(local_today) - APPOINTMENT_AGE).isoformat()
    counts = {
        "sessions": _delete(db, db.collection("sessions").where("expiresAt", "<", now - SESSION_GRACE)),
        "appointments": _delete(db, db.collection("appointments").where("date", "<", cutoff_date)),
        "rate_limits": _delete(db, db.collection("rate_limits").where("updatedAt", "<", now - RATE_LIMIT_AGE)),
    }
    logging.info(f"purge_stale deleted: {counts}")
    return counts
