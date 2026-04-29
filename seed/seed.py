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
