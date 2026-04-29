import os
import sib_api_v3_sdk
from sib_api_v3_sdk.rest import ApiException

_api = None

def _get_api():
    global _api
    if _api is None:
        cfg = sib_api_v3_sdk.Configuration()
        cfg.api_key['api-key'] = os.environ["BREVO_API_KEY"]
        _api = sib_api_v3_sdk.TransactionalEmailsApi(sib_api_v3_sdk.ApiClient(cfg))
    return _api

def _get_sender():
    return {"name": "HudumaQ", "email": os.environ["BREVO_SENDER_EMAIL"]}

SERVICE_LABELS = {
    "new_id": "New ID Application",
    "replace_id": "Replace Lost ID",
    "collect_id": "Collect ID",
}

def _send(to_email: str, subject: str, text: str):
    try:
        _get_api().send_transac_email(sib_api_v3_sdk.SendSmtpEmail(
            sender=_get_sender(),
            to=[{"email": to_email}],
            subject=subject,
            text_content=text,
        ))
    except ApiException as e:
        raise RuntimeError(f"Brevo send failed: {e}")


def send_verification_email(to_email: str, verify_url: str, first_name: str):
    _send(
        to_email,
        "Verify your HudumaQ booking",
        f"""Hi {first_name},

Click the link below to verify your identity and start booking your appointment.
This link expires in 15 minutes.

{verify_url}

If you did not request this, ignore this email.

— HudumaQ"""
    )


def send_confirmation_email(to_email: str, appointment: dict):
    service_label = SERVICE_LABELS.get(appointment["service"], appointment["service"])
    _send(
        to_email,
        "Your HudumaQ appointment is confirmed",
        f"""Your appointment is confirmed.

Service:   {service_label}
Date:      {appointment["date"]}
Time:      {appointment["time"]}
Location:  {appointment["centreLocation"]}

Please arrive on time. You have an 8-minute grace window from your booked time.

— HudumaQ"""
    )


def send_appointment_code_email(to_email: str, appointment_code: str, service_label: str):
    _send(
        to_email,
        "Your HudumaQ appointment code",
        f"""Your appointment has been verified.

Appointment Code: {appointment_code}
Service: {service_label}

Present this code to the teller if requested.

— HudumaQ"""
    )


def send_rate_experience_email(to_email: str, rate_form_url: str):
    _send(
        to_email,
        "How was your HudumaQ experience?",
        f"""Thank you for using HudumaQ.

We'd love to hear about your experience. It takes less than a minute:

{rate_form_url}

— HudumaQ"""
    )


def send_missed_slot_email(to_email: str, first_name: str, app_url: str):
    _send(
        to_email,
        "We missed you at your HudumaQ appointment",
        f"""Hi {first_name},

We noticed your appointment window passed without a check-in. We understand things come up — you may have been present but outside the 8-minute window.

You have two options:

1. Join the walk-in queue
   Head to the walk-in counter at Huduma Centre Nairobi CBD. Staff will assist you when it's your turn.

2. Reschedule
   Start a fresh booking at: {app_url}

We hope to serve you soon.

— HudumaQ"""
    )
