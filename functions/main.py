import logging
import os
import traceback
from datetime import datetime, timedelta, timezone

import firebase_admin
from firebase_admin import auth as firebase_auth, firestore
from firebase_functions import https_fn, scheduler_fn, options

from codes import generate_code
from emails import (
    send_verification_email as _send_verification_email,
    send_confirmation_email as _send_confirmation_email,
    send_appointment_code_email as _send_appointment_code_email,
    send_rate_experience_email as _send_rate_experience_email,
    send_missed_slot_email as _send_missed_slot_email,
)

firebase_admin.initialize_app()

options.set_global_options(
    secrets=["BREVO_API_KEY", "BREVO_SENDER_EMAIL", "APP_URL", "RATE_FORM_URL"]
)

class _LazyDB:
    _client = None
    def __getattr__(self, name):
        if type(self)._client is None:
            type(self)._client = firestore.client()
        return getattr(type(self)._client, name)

db = _LazyDB()

SERVICE_LABELS = {
    "new_id": "New ID Application",
    "replace_id": "Replace Lost ID",
    "collect_id": "Collect ID",
}

@https_fn.on_call(region="us-central1")
def send_verification_email(req: https_fn.CallableRequest):
    logging.info(f"Boundary Inbound Payload: {req.data}")
    try:
        return _send_verification_email_impl(req)
    except https_fn.HttpsError:
        raise
    except Exception:
        logging.error(f"send_verification_email unhandled exception:\n{traceback.format_exc()}")
        raise https_fn.HttpsError("internal", "Internal error — check Cloud Logging for traceback.")

def _send_verification_email_impl(req: https_fn.CallableRequest):
    import re
    data = req.data
    first_name = data.get("firstName", "").strip()
    last_name = data.get("lastName", "").strip()
    email = data.get("email", "").strip().lower()
    id_number = data.get("idNumber", "").strip()
    phone = data.get("phone", "").strip()

    if not re.match(r"^\d{8}$", id_number):
        raise https_fn.HttpsError("invalid-argument", "ID number must be exactly 8 digits.")
    if not re.match(r"^[^@]+@[^@]+\.[^@]+$", email):
        raise https_fn.HttpsError("invalid-argument", "Invalid email address.")

    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=15)

    session_ref = db.collection("sessions").document()
    session_ref.set({
        "firstName": first_name,
        "lastName": last_name,
        "email": email,
        "idNumber": id_number,
        "phone": phone,
        "expiresAt": expires_at,
        "used": False,
    })

    app_url = os.environ.get("APP_URL", "http://localhost:5173")
    verify_url = f"{app_url}/verify?token={session_ref.id}"

    _send_verification_email(email, verify_url, first_name)

    return {"success": True}

@https_fn.on_call(region="us-central1")
def hold_slot(req: https_fn.CallableRequest):
    logging.info(f"Boundary Inbound Payload: {req.data}")

    slot_id = req.data.get("slotId")
    session_token = req.data.get("sessionToken")

    if not slot_id or not session_token:
        raise https_fn.HttpsError("invalid-argument", "slotId and sessionToken required.")

    # Validate session
    session_ref = db.collection("sessions").document(session_token)
    session_snap = session_ref.get()

    if not session_snap.exists:
        raise https_fn.HttpsError("not-found", "Session not found.")

    session = session_snap.to_dict()
    now = datetime.now(timezone.utc)

    if session.get("used"):
        raise https_fn.HttpsError("failed-precondition", "Session already used.")
    if session["expiresAt"] <= now:
        raise https_fn.HttpsError("failed-precondition", "Session expired.")

    slot_ref = db.collection("slots").document(slot_id)
    held_until = now + timedelta(minutes=5)

    @firestore.transactional
    def hold_in_transaction(transaction):
        slot_snap = slot_ref.get(transaction=transaction)
        if not slot_snap.exists:
            raise https_fn.HttpsError("not-found", "Slot not found.")

        slot = slot_snap.to_dict()

        nairobi_tz = timezone(timedelta(hours=3))
        slot_dt = datetime.fromisoformat(f"{slot['date']}T{slot['time']}:00").replace(tzinfo=nairobi_tz)
        if slot_dt <= datetime.now(nairobi_tz):
            raise https_fn.HttpsError("failed-precondition", "Slot time has already passed.")

        if slot["status"] == "booked":
            raise https_fn.HttpsError("unavailable", "Slot already booked.")

        if slot["status"] == "held":
            held_until_existing = slot.get("heldUntil")
            if held_until_existing and held_until_existing > now:
                raise https_fn.HttpsError("unavailable", "Slot is currently held.")

        transaction.update(slot_ref, {
            "status": "held",
            "heldBy": session_token,
            "heldUntil": held_until,
        })

    transaction = db.transaction()
    hold_in_transaction(transaction)

    return {"success": True, "heldUntil": held_until.isoformat()}

@https_fn.on_call(region="us-central1")
def confirm_booking(req: https_fn.CallableRequest):
    logging.info(f"Boundary Inbound Payload: {req.data}")

    slot_id = req.data.get("slotId")
    session_token = req.data.get("sessionToken")

    if not slot_id or not session_token:
        raise https_fn.HttpsError("invalid-argument", "slotId and sessionToken required.")

    session_ref = db.collection("sessions").document(session_token)
    session_snap = session_ref.get()

    if not session_snap.exists:
        raise https_fn.HttpsError("not-found", "Session not found.")

    session = session_snap.to_dict()
    now = datetime.now(timezone.utc)

    if session.get("used"):
        raise https_fn.HttpsError("failed-precondition", "Session already used.")
    if session["expiresAt"] <= now:
        raise https_fn.HttpsError("failed-precondition", "Session expired.")

    slot_ref = db.collection("slots").document(slot_id)
    appointment_ref = db.collection("appointments").document()
    appointment_id = appointment_ref.id

    @firestore.transactional
    def confirm_in_transaction(transaction):
        slot_snap = slot_ref.get(transaction=transaction)
        if not slot_snap.exists:
            raise https_fn.HttpsError("not-found", "Slot not found.")

        slot = slot_snap.to_dict()

        if slot.get("heldBy") != session_token:
            raise https_fn.HttpsError("failed-precondition", "Slot not held by this session.")
        if slot.get("heldUntil") <= now:
            raise https_fn.HttpsError("failed-precondition", "Slot hold expired.")

        transaction.update(slot_ref, {
            "status": "booked",
            "bookedBy": appointment_id,
        })

        transaction.set(appointment_ref, {
            "firstName": session["firstName"],
            "lastName": session["lastName"],
            "email": session["email"],
            "idNumber": session["idNumber"],
            "phone": session["phone"],
            "service": slot["service"],
            "date": slot["date"],
            "time": slot["time"],
            "duration": slot["duration"],
            "centreLocation": "Huduma Centre Nairobi CBD",
            "slotId": slot_id,
            "status": "pending",
            "appointmentCode": None,
            "resolvedAt": None,
            "missedAt": None,
            "createdAt": now,
        })

        transaction.update(session_ref, {"used": True})

    transaction = db.transaction()
    confirm_in_transaction(transaction)

    # Send confirmation email (after transaction commits)
    slot_data = slot_ref.get().to_dict()
    appointment_data = {
        "service": slot_data["service"],
        "date": slot_data["date"],
        "time": slot_data["time"],
        "centreLocation": "Huduma Centre Nairobi CBD",
    }
    _send_confirmation_email(session["email"], appointment_data)

    return {"success": True, "appointmentId": appointment_id}

@https_fn.on_call(region="us-central1")
def verify_arrival(req: https_fn.CallableRequest):
    logging.info(f"Boundary Inbound Payload: {req.data}")

    # Require Firebase Auth
    if not req.auth:
        raise https_fn.HttpsError("unauthenticated", "Authentication required.")

    uid = req.auth.uid
    appointment_id = req.data.get("appointmentId")

    if not appointment_id:
        raise https_fn.HttpsError("invalid-argument", "appointmentId required.")

    # Verify staff access
    staff_snap = db.collection("staff").document(uid).get()
    if not staff_snap.exists:
        raise https_fn.HttpsError("permission-denied", "Not authorized as staff.")

    appointment_ref = db.collection("appointments").document(appointment_id)
    appointment_snap = appointment_ref.get()

    if not appointment_snap.exists:
        raise https_fn.HttpsError("not-found", "Appointment not found.")

    appointment = appointment_snap.to_dict()

    if appointment["status"] != "pending":
        raise https_fn.HttpsError("failed-precondition", "Appointment is not pending.")

    code = generate_code(appointment["service"])
    now = datetime.now(timezone.utc)

    appointment_ref.update({
        "status": "resolved",
        "appointmentCode": code,
        "resolvedAt": now,
    })

    service_label = SERVICE_LABELS.get(appointment["service"], appointment["service"])
    rate_form_url = os.environ.get("RATE_FORM_URL", "")

    _send_appointment_code_email(appointment["email"], code, service_label)
    _send_rate_experience_email(appointment["email"], rate_form_url)

    return {"success": True, "appointmentCode": code}

@scheduler_fn.on_schedule(
    schedule="every 5 minutes",
    region="us-central1",
    timezone="Africa/Nairobi"
)
def sweep_missed(event: scheduler_fn.ScheduledEvent):
    logging.info("Boundary Inbound Payload: sweep_missed running")

    nairobi_tz = timezone(timedelta(hours=3))  # EAT = UTC+3
    now = datetime.now(nairobi_tz)
    today_str = now.strftime("%Y-%m-%d")
    app_url = os.environ.get("APP_URL", "")

    pending_query = (
        db.collection("appointments")
        .where("date", "==", today_str)
        .where("status", "==", "pending")
    )

    docs = pending_query.stream()
    missed_count = 0

    for doc in docs:
        appt = doc.to_dict()

        # Parse appointment time in Nairobi timezone
        appt_time_str = f"{appt['date']}T{appt['time']}:00"
        appt_time = datetime.fromisoformat(appt_time_str).replace(tzinfo=nairobi_tz)
        grace_end = appt_time + timedelta(minutes=8)

        if now > grace_end:
            doc.reference.update({
                "status": "missed",
                "missedAt": now,
            })
            _send_missed_slot_email(appt["email"], appt["firstName"], app_url)
            missed_count += 1
            logging.info(f"Marked missed: {doc.id}")

    logging.info(f"sweep_missed complete. Marked {missed_count} appointments missed.")

