# HudumaQ — Backend Build Spec

> Paste this into your agentic IDE as your Phase 2 build prompt.
> The frontend is already complete. This spec covers all Python Cloud Functions,
> seed script, Firestore rules, and deployment.

---

## Context

HudumaQ is a citizen slot-booking portal for Kenyan ID services at Huduma Centres.
The frontend (React + Vite) is already built and deployed at Vercel. It calls these
Cloud Functions via Firebase SDK `httpsCallable`. Function names must match exactly —
the frontend is already wired to them.

**Frontend calls these functions by name:**
- `send_verification_email` ← Landing.jsx
- `hold_slot` ← ServiceSelect.jsx
- `confirm_booking` ← Review.jsx
- `verify_arrival` ← StaffPending.jsx
- `sweep_missed` ← scheduled (no frontend call)

---

## Stack

| Layer | Tech |
|---|---|
| Runtime | Python 3.12 |
| Functions | Firebase Cloud Functions 2nd gen |
| Database | Firestore |
| Email | Resend Python SDK |
| Scheduling | Cloud Scheduler (via Firebase) |
| Hosting | Firebase / GCP (Blaze plan required) |

**Firebase plan:** Blaze (pay-as-you-go). Spark plan blocks outbound HTTP calls (Resend)
and scheduled functions. Hackathon-scale usage stays within free quotas.

---

## File Structure

```
hudumaq/
├── functions/
│   ├── main.py              # All function definitions
│   ├── email.py             # Resend send helpers + email templates
│   ├── codes.py             # Appointment code generator
│   └── requirements.txt
│
├── seed/
│   └── seed.py              # Seeds today+tomorrow slots + staff docs
│
├── firestore.rules
├── firestore.indexes.json
├── firebase.json
└── .firebaserc
```

---

## Environment Variables

Set via Firebase CLI before deploying:

```bash
firebase functions:secrets:set RESEND_API_KEY
firebase functions:secrets:set RATE_FORM_URL
firebase functions:secrets:set APP_URL
```

Or for local emulation, use a `.env` file in `/functions/`:
```
RESEND_API_KEY=re_xxxxxxxxxxxx
RATE_FORM_URL=https://forms.gle/xxxxxxxx
APP_URL=https://your-app.vercel.app
```

---

## firebase.json

```json
{
  "functions": {
    "source": "functions",
    "runtime": "python312"
  },
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  }
}
```

---

## .firebaserc

```json
{
  "projects": {
    "default": "YOUR_FIREBASE_PROJECT_ID"
  }
}
```

---

## requirements.txt

```
firebase-functions>=0.1.0
firebase-admin>=6.5.0
resend>=2.0.0
```

---

## Data Model (reference — already designed)

### sessions/{auto-id}
```
firstName    string
lastName     string
email        string
idNumber     string      # 8-digit Kenyan national ID
phone        string
expiresAt    timestamp   # now + 15 minutes
used         boolean
```

### slots/{auto-id}
```
date         string      # "YYYY-MM-DD"
time         string      # "HH:MM" 24hr, e.g. "09:00"
service      string      # "new_id" | "replace_id" | "collect_id"
duration     number      # 20 | 10 | 5 (minutes)
status       string      # "available" | "held" | "booked"
heldBy       string|null # sessionToken
heldUntil    timestamp|null
bookedBy     string|null # appointmentId
```

### appointments/{auto-id}
```
firstName         string
lastName          string
email             string
idNumber          string
phone             string
service           string      # "new_id" | "replace_id" | "collect_id"
date              string      # "YYYY-MM-DD"
time              string      # "HH:MM"
duration          number
centreLocation    string      # "Huduma Centre Nairobi CBD"
slotId            string
status            string      # "pending" → "resolved" | "missed"
appointmentCode   string|null # set on verify_arrival
resolvedAt        timestamp|null
missedAt          timestamp|null
createdAt         timestamp
```

### staff/{uid}
```
email    string
name     string
```
Note: `uid` = Firebase Auth UID. Run seed.py AFTER staff member logs in once.

---

## functions/codes.py

```python
import random
import string

SERVICE_PREFIXES = {
    "new_id": "NID",
    "replace_id": "RID",
    "collect_id": "COL",
}

def generate_code(service: str) -> str:
    prefix = SERVICE_PREFIXES.get(service, "HQ")
    suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=4))
    return f"{prefix}-{suffix}"
```

---

## functions/email.py

Use the Resend Python SDK. All emails are plain text (HTML optional, not required for demo).

```python
import os
import resend

resend.api_key = os.environ.get("RESEND_API_KEY")

SERVICE_LABELS = {
    "new_id": "New ID Application",
    "replace_id": "Replace Lost ID",
    "collect_id": "Collect ID",
}

def send_verification_email(to_email: str, verify_url: str, first_name: str):
    resend.Emails.send({
        "from": "HudumaQ <noreply@yourdomain.com>",
        "to": to_email,
        "subject": "Verify your HudumaQ booking",
        "text": f"""Hi {first_name},

Click the link below to verify your identity and start booking your appointment.
This link expires in 15 minutes.

{verify_url}

If you did not request this, ignore this email.

— HudumaQ"""
    })

def send_confirmation_email(to_email: str, appointment: dict):
    service_label = SERVICE_LABELS.get(appointment["service"], appointment["service"])
    resend.Emails.send({
        "from": "HudumaQ <noreply@yourdomain.com>",
        "to": to_email,
        "subject": "Your HudumaQ appointment is confirmed",
        "text": f"""Your appointment is confirmed.

Service:   {service_label}
Date:      {appointment["date"]}
Time:      {appointment["time"]}
Location:  {appointment["centreLocation"]}

Please arrive on time. You have an 8-minute grace window from your booked time.

— HudumaQ"""
    })

def send_appointment_code_email(to_email: str, appointment_code: str, service_label: str):
    resend.Emails.send({
        "from": "HudumaQ <noreply@yourdomain.com>",
        "to": to_email,
        "subject": "Your HudumaQ appointment code",
        "text": f"""Your appointment has been verified.

Appointment Code: {appointment_code}
Service: {service_label}

Present this code to the teller if requested.

— HudumaQ"""
    })

def send_rate_experience_email(to_email: str, rate_form_url: str):
    resend.Emails.send({
        "from": "HudumaQ <noreply@yourdomain.com>",
        "to": to_email,
        "subject": "How was your HudumaQ experience?",
        "text": f"""Thank you for using HudumaQ.

We'd love to hear about your experience. It takes less than a minute:

{rate_form_url}

— HudumaQ"""
    })

def send_missed_slot_email(to_email: str, first_name: str, app_url: str):
    resend.Emails.send({
        "from": "HudumaQ <noreply@yourdomain.com>",
        "to": to_email,
        "subject": "We missed you at your HudumaQ appointment",
        "text": f"""Hi {first_name},

We noticed your appointment window passed without a check-in. We understand things come up — you may have been present but outside the 8-minute window.

You have two options:

1. Join the walk-in queue
   Head to the walk-in counter at Huduma Centre Nairobi CBD. Staff will assist you when it's your turn.

2. Reschedule
   Start a fresh booking at: {app_url}

We hope to serve you soon.

— HudumaQ"""
    })
```

---

## functions/main.py

```python
import logging
import os
from datetime import datetime, timedelta, timezone

import firebase_admin
from firebase_admin import auth as firebase_auth, firestore
from firebase_functions import https_fn, scheduler_fn, options

from codes import generate_code
from email import (
    send_verification_email,
    send_confirmation_email,
    send_appointment_code_email,
    send_rate_experience_email,
    send_missed_slot_email,
)

firebase_admin.initialize_app()
db = firestore.client()

SERVICE_LABELS = {
    "new_id": "New ID Application",
    "replace_id": "Replace Lost ID",
    "collect_id": "Collect ID",
}
```

### send_verification_email function

```python
@https_fn.on_call(region="us-central1")
def send_verification_email_fn(req: https_fn.CallableRequest):
    logging.info(f"send_verification_email called: {req.data}")

    data = req.data
    first_name = data.get("firstName", "").strip()
    last_name = data.get("lastName", "").strip()
    email = data.get("email", "").strip().lower()
    id_number = data.get("idNumber", "").strip()
    phone = data.get("phone", "").strip()

    # Validate
    import re
    if not re.match(r"^\d{8}$", id_number):
        raise https_fn.HttpsError("invalid-argument", "ID number must be exactly 8 digits.")
    if not re.match(r"^[^@]+@[^@]+\.[^@]+$", email):
        raise https_fn.HttpsError("invalid-argument", "Invalid email address.")

    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=15)

    # Create session doc
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

    send_verification_email(email, verify_url, first_name)

    return {"success": True}
```

**Register with correct name** (must match frontend `httpsCallable` call):
```python
# At bottom of main.py, register with exact name the frontend calls:
send_verification_email = send_verification_email_fn
```

> **Important:** Python function names can't have underscores as Firebase export names by default.
> Use the `name` parameter in the decorator or alias at the bottom. See deployment note below.

### hold_slot function

```python
@https_fn.on_call(region="us-central1")
def hold_slot_fn(req: https_fn.CallableRequest):
    logging.info(f"hold_slot called: {req.data}")

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
```

### confirm_booking function

```python
@https_fn.on_call(region="us-central1")
def confirm_booking_fn(req: https_fn.CallableRequest):
    logging.info(f"confirm_booking called: {req.data}")

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
    send_confirmation_email(session["email"], appointment_data)

    return {"success": True, "appointmentId": appointment_id}
```

### verify_arrival function

```python
@https_fn.on_call(region="us-central1")
def verify_arrival_fn(req: https_fn.CallableRequest):
    logging.info(f"verify_arrival called: {req.data}")

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

    send_appointment_code_email(appointment["email"], code, service_label)
    send_rate_experience_email(appointment["email"], rate_form_url)

    return {"success": True, "appointmentCode": code}
```

### sweep_missed function (scheduled)

```python
@scheduler_fn.on_schedule(
    schedule="every 5 minutes",
    region="us-central1",
    timezone="Africa/Nairobi"
)
def sweep_missed_fn(event: scheduler_fn.ScheduledEvent):
    logging.info("sweep_missed running")

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
            send_missed_slot_email(appt["email"], appt["firstName"], app_url)
            missed_count += 1
            logging.info(f"Marked missed: {doc.id}")

    logging.info(f"sweep_missed complete. Marked {missed_count} appointments missed.")
```

---

## Function Name Registration (Critical)

Firebase exports functions by their Python identifier name. The frontend calls them
with underscores (`send_verification_email`, `hold_slot`, etc.). Ensure each function
is exported with the correct name in `main.py`:

```python
# At the bottom of main.py, after all function definitions:
# These names MUST match what the frontend calls via httpsCallable()

send_verification_email = send_verification_email_fn
hold_slot = hold_slot_fn
confirm_booking = confirm_booking_fn
verify_arrival = verify_arrival_fn
sweep_missed = sweep_missed_fn
```

---

## seed/seed.py

Run this after Firebase is configured and after a staff member has logged in once
(so their Firebase Auth UID exists).

```python
import firebase_admin
from firebase_admin import firestore
from datetime import datetime, timedelta, timezone

firebase_admin.initialize_app()
db = firestore.client()

SERVICES = [
    {"id": "new_id", "duration": 20},
    {"id": "replace_id", "duration": 10},
    {"id": "collect_id", "duration": 5},
]

def generate_slots_for_date(date_str: str):
    batch = db.batch()
    count = 0

    for service in SERVICES:
        duration = service["duration"]
        current = datetime(2000, 1, 1, 9, 0)   # 09:00
        end = datetime(2000, 1, 1, 16, 0)       # 16:00

        while current < end:
            ref = db.collection("slots").document()
            batch.set(ref, {
                "date": date_str,
                "time": current.strftime("%H:%M"),
                "service": service["id"],
                "duration": duration,
                "status": "available",
                "heldBy": None,
                "heldUntil": None,
                "bookedBy": None,
            })
            current += timedelta(minutes=duration)
            count += 1

    batch.commit()
    print(f"Seeded {count} slots for {date_str}")

def seed_staff(uid: str, email: str, name: str):
    db.collection("staff").document(uid).set({
        "email": email,
        "name": name,
    })
    print(f"Seeded staff: {name} ({uid})")

if __name__ == "__main__":
    nairobi_tz = timezone(timedelta(hours=3))
    now = datetime.now(nairobi_tz)
    today = now.strftime("%Y-%m-%d")
    tomorrow = (now + timedelta(days=1)).strftime("%Y-%m-%d")

    generate_slots_for_date(today)
    generate_slots_for_date(tomorrow)

    # Replace with actual Firebase Auth UID after first login:
    seed_staff(
        uid="REPLACE_WITH_STAFF_UID",
        email="staff@huduma.go.ke",
        name="Demo Staff"
    )
```

**How to get the staff UID:**
1. Start the frontend dev server
2. Navigate to `/staff` and sign in with Google
3. Open browser console: `firebase.auth().currentUser.uid`
4. Paste that UID into `seed.py` above
5. Run `python seed/seed.py`

---

## firestore.rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Sessions: anyone can read by exact doc ID (magic link), Cloud Functions write
    match /sessions/{docId} {
      allow read: if true;
      allow write: if false;  // Cloud Functions only via Admin SDK
    }

    // Slots: anyone can read (for SlotGrid), Cloud Functions write
    match /slots/{slotId} {
      allow read: if true;
      allow write: if false;
    }

    // Appointments: authenticated staff can read, Cloud Functions write
    match /appointments/{appointmentId} {
      allow read: if request.auth != null;
      allow write: if false;
    }

    // Staff: authenticated users can read their own doc
    match /staff/{uid} {
      allow read: if request.auth != null && request.auth.uid == uid;
      allow write: if false;
    }
  }
}
```

---

## firestore.indexes.json

```json
{
  "indexes": [
    {
      "collectionGroup": "appointments",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "date", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "appointments",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "date", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "time", "order": "ASCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

---

## Deployment Order

### 1. Firebase project setup
```bash
npm install -g firebase-tools
firebase login
firebase init          # select Functions, Firestore
firebase use YOUR_PROJECT_ID
```

### 2. Set secrets
```bash
firebase functions:secrets:set RESEND_API_KEY
firebase functions:secrets:set RATE_FORM_URL
firebase functions:secrets:set APP_URL
```

### 3. Deploy Firestore rules and indexes
```bash
firebase deploy --only firestore
```

### 4. Deploy Cloud Functions
```bash
firebase deploy --only functions
```

### 5. Seed data
```bash
# Get staff UID from first Google login (see seed.py instructions)
# Then:
python seed/seed.py
```

### 6. Add production domain to Firebase Auth
In Firebase Console → Authentication → Settings → Authorized domains:
Add your Vercel production domain (e.g. `hudumaq.vercel.app`)

---

## Key Technical Decisions (do not change)

1. **No Firebase Auth for citizens** — Citizens are NOT Auth users. Identity =
   short-lived Firestore `sessions` doc. Magic link = `APP_URL/verify?token={docId}`.
   Do not use Firebase Email Link Auth (it creates Auth users, violating no-account requirement).

2. **Lazy slot expiry** — No scheduled function clears held slots. `hold_slot`
   checks `heldUntil > now` in its transaction and treats expired holds as available.
   The frontend also checks `isAvailable()` client-side. Both are required.

3. **sweep_missed timezone** — Nairobi is EAT (UTC+3). The sweep must compare
   appointment times in EAT, not UTC. `datetime.fromisoformat` + `replace(tzinfo=nairobi_tz)`
   is the correct approach.

4. **Confirmation email after transaction** — `send_confirmation_email` is called
   after the Firestore transaction commits, not inside it. Email delivery failure
   should not roll back a successful booking.

5. **Rate experience email** — Sent immediately on `verify_arrival`, not on a separate
   trigger. Two emails go out simultaneously: appointment code + rate experience.

---

## Common Errors to Watch For

- **`email` module name conflict** — Python has a built-in `email` module. If you
  name your file `email.py`, import it as `from email import ...` will import the
  built-in instead. Rename your file to `emails.py` and update the import in `main.py`.

- **Firestore timestamp comparisons** — Admin SDK returns `DatetimeWithNanoseconds`
  objects. Compare with `datetime` objects that have timezone info. Use `timezone.utc`
  consistently.

- **Function name mismatch** — Firebase exports by Python identifier. If the export
  alias at the bottom of `main.py` doesn't match the `httpsCallable('name')` call
  in the frontend, the call silently fails with a "not-found" error.

- **Blaze plan** — If you see "Billing account not configured" errors when deploying
  scheduled functions or when Resend calls fail, the project is on Spark plan.
  Upgrade to Blaze in Firebase Console → Usage and billing.
