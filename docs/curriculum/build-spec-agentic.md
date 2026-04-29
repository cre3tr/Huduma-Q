# HudumaQ — Agentic Build Spec

> Paste this into your agentic IDE (Cursor, Windsurf, etc.) as your build prompt.
> Build frontend first with graceful error handling for unimplemented backend calls,
> then implement Cloud Functions to wire everything up.

---

## What You're Building

**HudumaQ** — A two-sided web app that lets Kenyan citizens book time slots for Huduma Centre national ID services (new ID, replace lost ID, collect ID), and gives Huduma Centre staff a live dashboard to manage those appointments.

**Demo scenarios:**
- SC1: Citizen walks in with no appointment → waits 7 hours for a 10-minute process
- SC2: Citizen visits HudumaQ → books a slot in minutes → arrives at their time → dedicated intake lane → done in 10 minutes

**Live at:** Not yet deployed. Build first, deploy to Vercel (frontend) + Firebase (backend).

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + Vite 5 + React Router 6 + Tailwind CSS |
| Database | Firestore (Firebase) |
| Auth | Firebase Auth — Google provider (staff only) |
| Cloud Functions | Firebase Cloud Functions — Python 3.12, 2nd gen |
| Email | Resend (3,000/month free tier) |
| PDF | jsPDF (client-side, no server round-trip) |
| Calendar | ICS file — plain text Blob, no library needed |
| Rate feedback | Google Forms — external link in email |
| Hosting | Vercel (frontend) + Firebase/GCP (backend) + Cloudflare (DNS/CDN) |

**Firebase plan required:** Blaze (pay-as-you-go). Spark plan blocks outbound network calls (Resend) and scheduled functions. Cost at demo scale = ~$0.

---

## Environment Variables

### Frontend — `.env` (also create `.env.example` with blank values)
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

### Cloud Functions — Firebase environment config
```
RESEND_API_KEY=
RATE_FORM_URL=        # Google Form URL for rate experience
APP_URL=              # Production Vercel URL (for magic links)
```

---

## File Structure

```
hudumaq/
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Landing.jsx
│   │   │   ├── CheckEmail.jsx
│   │   │   ├── Verify.jsx
│   │   │   ├── ServiceSelect.jsx
│   │   │   ├── Review.jsx
│   │   │   ├── Success.jsx
│   │   │   ├── ExpiredLink.jsx
│   │   │   ├── StaffLogin.jsx
│   │   │   ├── StaffPending.jsx
│   │   │   └── StaffResolved.jsx
│   │   ├── components/
│   │   │   ├── SlotGrid.jsx
│   │   │   ├── ServiceCard.jsx
│   │   │   ├── AppointmentRow.jsx
│   │   │   └── CountdownTimer.jsx
│   │   ├── context/
│   │   │   └── BookingContext.jsx
│   │   ├── lib/
│   │   │   ├── firebase.js
│   │   │   ├── auth.js
│   │   │   ├── slots.js
│   │   │   ├── appointments.js
│   │   │   ├── pdf.js
│   │   │   └── ics.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── package.json
│   ├── vercel.json
│   └── .env.example
│
├── functions/
│   ├── main.py
│   ├── email.py
│   ├── codes.py
│   └── requirements.txt
│
├── seed/
│   └── seed.py
│
├── firestore.rules
├── firestore.indexes.json
├── firebase.json
└── .firebaserc
```

---

## Build Order

### Phase 1 — Frontend (graceful error handling for all backend calls)

1. Project scaffold (file structure, package.json, vite.config, tailwind, firebase.js, App.jsx routing, BookingContext shell)
2. Landing.jsx + CheckEmail.jsx
3. Verify.jsx + BookingContext full implementation + ExpiredLink.jsx
4. ServiceSelect.jsx + ServiceCard.jsx + SlotGrid.jsx + CountdownTimer.jsx
5. Review.jsx
6. Success.jsx + pdf.js + ics.js
7. StaffLogin.jsx + auth.js
8. StaffPending.jsx + AppointmentRow.jsx
9. StaffResolved.jsx

### Phase 2 — Backend (wire up each Cloud Function)

10. Cloud Functions scaffold (main.py, email.py, codes.py, requirements.txt, firebase.json, .firebaserc)
11. `send_verification_email` — wires up Landing.jsx submit
12. `hold_slot` — wires up SlotGrid slot selection
13. `confirm_booking` — wires up Review.jsx confirm button
14. `verify_arrival` — wires up StaffPending verify button
15. `sweep_missed` — scheduled function, no UI
16. Seed script (seed.py) + Firestore security rules + composite index
17. Deployment (Vercel + Firebase deploy)

---

## Frontend Spec

### App.jsx — Routing

React Router 6. All routes client-side. `vercel.json` rewrites all paths to `index.html`.

```
Route         Component         Guard
/             Landing.jsx       Public
/check-email  CheckEmail.jsx    Public
/verify       Verify.jsx        Public (token in ?token= param)
/book         ServiceSelect.jsx Requires BookingContext.citizen
/review       Review.jsx        Requires BookingContext.heldSlot
/success      Success.jsx       Requires BookingContext.confirmedAppointment
/expired      ExpiredLink.jsx   Public
/staff        StaffLogin.jsx    Public
/staff/pending   StaffPending.jsx  Requires Firebase Auth + staff doc
/staff/resolved  StaffResolved.jsx Requires Firebase Auth + staff doc
```

If a guarded route is accessed without required state → redirect to `/`.

### vercel.json
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

---

### BookingContext.jsx

In-memory state only. Persists across route navigation within session. Resets on page reload.

```js
{
  citizen: {
    firstName: string,
    lastName: string,
    email: string,
    idNumber: string,
    phone: string
  },
  sessionToken: string,           // Firestore sessions doc ID
  selectedService: null | "new_id" | "replace_id" | "collect_id",
  heldSlot: null | {
    slotId: string,
    date: string,
    time: string,
    duration: number,
    heldUntil: timestamp
  },
  confirmedAppointment: null | {
    appointmentId: string,
    service: string,
    date: string,
    time: string,
    centreLocation: string
  }
}
```

Expose: `citizen`, `sessionToken`, `selectedService`, `heldSlot`, `confirmedAppointment` + setters for each.

---

### lib/firebase.js

Firebase app init using `VITE_FIREBASE_*` env vars.

Exports: `db` (Firestore instance), `auth` (Auth instance), `functions` (Cloud Functions instance).

```js
import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { getFunctions } from 'firebase/functions'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const auth = getAuth(app)
export const functions = getFunctions(app)
```

---

### lib/auth.js

```js
// signInWithGoogle() — Firebase Auth Google provider sign-in
// checkStaffAccess(uid) — reads staff/{uid} doc, returns boolean
// signOutStaff() — Firebase Auth sign-out + redirect to /staff
```

`checkStaffAccess` reads Firestore `staff/{uid}`. If doc missing → return false (not authorized).

---

### lib/slots.js

```js
// fetchSlots(date, service) — Firestore query on slots collection
//   filtered by date and service, returns slots with client-side expiry applied
// isAvailable(slot) — returns true if:
//   status === "available" OR (status === "held" AND heldUntil < Date.now())
```

Key behavior: **lazy expiry**. Slots with `status === "held"` but `heldUntil` in the past are treated as available client-side. No background sweeper for holds.

---

### lib/appointments.js

```js
// getCitizenAppointments(email) — fetches all pending/resolved appointments
//   for a citizen email (used for 2-hour gap rule in SlotGrid)
// getAppointment(appointmentId) — single appointment read
```

---

### lib/pdf.js

Uses jsPDF. `generatePDF(appointment)` produces and triggers browser download.

PDF contains: firstName, lastName, idNumber, service (human-readable label), date, time, centreLocation.

Human-readable service labels:
- `new_id` → "New ID Application"
- `replace_id` → "Replace Lost ID"
- `collect_id` → "Collect ID"

---

### lib/ics.js

`generateICS(appointment)` — produces a valid `.ics` file as a Blob. Triggers browser download as `hudumaq-appointment.ics`.

Compatible with Google Calendar, Outlook, Apple Calendar. No library needed — generate the ICS format string manually.

Required ICS fields: DTSTART, DTEND, SUMMARY, LOCATION, DESCRIPTION.

---

### Landing.jsx

Form fields: `firstName`, `lastName`, `email`, `idNumber` (must be exactly 8 digits), `phone`.

On submit:
- **Phase 1 (frontend only):** Call `send_verification_email` Cloud Function via `httpsCallable`. Show loading state. If function not yet deployed → catch error → show graceful inline message: "Verification service temporarily unavailable. Please try again shortly."
- On success: navigate to `/check-email`
- On validation error (8-digit check client-side): inline field error before calling function

---

### CheckEmail.jsx

- Displays the submitted email address (pass via router state or context)
- States: "Check your inbox. We sent a verification link to [email]. It expires in 15 minutes."
- No actions — waiting state only

---

### Verify.jsx

On mount:
1. Read `?token=` query param
2. Read `sessions/{token}` from Firestore
3. If `expiresAt < now` OR `used === true` → navigate to `/expired`
4. If valid → store citizen fields in `BookingContext` → navigate to `/book`

**Phase 1 note:** Firestore reads still work without Cloud Functions deployed. This page can be partially tested once Firebase is configured and a `sessions` doc is manually created for testing.

---

### ServiceSelect.jsx

- Renders three `ServiceCard` components
- On card select: collapses others, pre-populates citizen info from `BookingContext`
- `SlotGrid` appears below selected card (no page navigation)
- Bold notice: "You have 5 minutes to complete your booking once a slot is selected"
- On slot select: calls `hold_slot` Cloud Function → starts `CountdownTimer`
  - **Phase 1:** If function not deployed → catch error → show: "Slot hold unavailable — please try again shortly." Do not navigate.
- On `CountdownTimer` expiry: clear `heldSlot` from context → show "Time's up — please restart" → navigate to `/`
- On slot hold success: navigate to `/review`

---

### ServiceCard.jsx

Props: `service`, `title`, `duration`, `requirements` (list of strings), `selected`, `onSelect`

- Expanded when `selected === true`, collapsed otherwise
- Shows requirements list when expanded
- Pre-populated citizen details shown when selected

Service requirements:
- New ID Application (20 min): ["Original birth certificate", "2 passport photos", "KES 300 fee"]
- Replace Lost ID (10 min): ["Affidavit of loss", "2 passport photos", "KES 300 fee"]
- Collect ID (5 min): ["Original collection slip"]

---

### SlotGrid.jsx

Props: `date`, `service`, `slotDuration`, `existingAppointments`, `onSlotSelect`

- Fetches `slots` collection filtered by `date` and `service`
- Renders slots from 09:00 to 16:00 in `slotDuration`-minute increments
- Client-side expiry: if `status === "held"` and `heldUntil < now` → render as green (available)
- 2-hour gap rule: if `existingAppointments` contains a booking within 2 hours of a slot's time → render as black
- Green = available, Black = unavailable (taken, held, or within 2-hour gap)
- On green slot click: emit selected slot to parent via `onSlotSelect`
- Day navigation: today and tomorrow only

**Phase 1 note:** SlotGrid reads Firestore directly (not via Cloud Function). Works without functions deployed if Firestore is configured and `slots` collection is seeded.

---

### CountdownTimer.jsx

Props: `expiresAt` (timestamp), `onExpire` (callback)

- Displays `mm:ss` countdown
- Calls `onExpire()` when reaches zero
- Red color when under 60 seconds

---

### Review.jsx

Displays read-only summary:
- firstName, lastName, idNumber, phone (from `BookingContext.citizen`)
- service (human-readable), date, time
- centreLocation: "Huduma Centre Nairobi CBD" (hardcoded, not editable)

Confirm button:
- Calls `confirm_booking` Cloud Function
- **Phase 1:** If not deployed → catch error → show: "Booking confirmation unavailable — please try again shortly."
- On success: store `confirmedAppointment` in `BookingContext` → navigate to `/success`

---

### Success.jsx

Reads from `BookingContext.confirmedAppointment`.

Displays: service (human-readable), date, time, centreLocation.

Buttons:
- "Download PDF" → calls `generatePDF(confirmedAppointment)` from `lib/pdf.js`
- "Add to Calendar" → calls `generateICS(confirmedAppointment)` from `lib/ics.js`

Note: Confirmation email is sent by `confirm_booking` Cloud Function — no frontend action needed.

---

### ExpiredLink.jsx

Message: "This link has expired. Please return to the home page to start again."

Link to `/`.

---

### StaffLogin.jsx

- Google Sign-In button
- On sign-in: `auth.js` calls `signInWithGoogle()`, then `checkStaffAccess(uid)`
- If `staff/{uid}` doc missing → sign out → show: "Unauthorized — contact your administrator"
- If doc found → navigate to `/staff/pending`

---

### StaffPending.jsx

- Firestore `onSnapshot` listener: `appointments` where `date == today` AND `status == "pending"`, ordered by `time` ascending
- Renders `AppointmentRow` per result with `showVerifyButton={true}`
- On verify: calls `verify_arrival` Cloud Function with `appointmentId`
  - **Phase 1:** If not deployed → catch error → show inline error on that row
  - Row disappears automatically via `onSnapshot` when status changes to "resolved"
- Nav link to `/staff/resolved`

---

### StaffResolved.jsx

- Firestore one-time fetch + manual refresh button: `appointments` where `date == today` AND `status in ["resolved", "missed"]`
- Read-only — no action buttons
- Columns: date, time, service (human-readable), firstName, lastName, idNumber, phone, status badge, appointmentCode

---

### AppointmentRow.jsx

Props: `appointment`, `onVerify`, `showVerifyButton`

- Renders one table row
- Verify button calls `onVerify(appointment.id)` — disabled while loading
- Shows `appointmentCode` if present (resolved appointments)

---

## Cloud Functions Spec (Python 3.12)

All functions in `functions/main.py`. Helpers in `functions/email.py` and `functions/codes.py`.

### requirements.txt
```
firebase-functions>=0.1.0
firebase-admin>=6.0.0
resend>=0.7.0
```

### send_verification_email (HTTP callable)

**Input:** `{ firstName, lastName, email, idNumber, phone }`

**Logic:**
1. Validate: `idNumber` matches `^\d{8}$`, `email` is valid format
2. Create `sessions/{auto-id}`: `{ firstName, lastName, email, idNumber, phone, expiresAt: now+15min, used: false }`
3. Resend email to citizen: subject "Verify your HudumaQ booking", body contains `{APP_URL}/verify?token={docId}`

**Returns:** `{ "success": true }`

---

### hold_slot (HTTP callable)

**Input:** `{ slotId, sessionToken }`

**Logic:**
1. Verify `sessions/{sessionToken}` exists, `expiresAt > now`, `used === false`
2. Firestore transaction on `slots/{slotId}`:
   - If `status === "booked"` → raise `UNAVAILABLE`
   - If `status === "held"` AND `heldUntil > now` → raise `UNAVAILABLE`
   - Otherwise (available OR expired hold) → write `status: "held"`, `heldBy: sessionToken`, `heldUntil: now+5min`

**Returns:** `{ "success": true, "heldUntil": "<ISO timestamp>" }`

---

### confirm_booking (HTTP callable)

**Input:** `{ slotId, sessionToken }`

**Logic:**
1. Read `sessions/{sessionToken}` — validate not expired, not used
2. Firestore transaction:
   - Read `slots/{slotId}`: confirm `heldBy === sessionToken` AND `heldUntil > now`
   - Write slot: `status: "booked"`, `bookedBy: <new appointmentId>`
   - Create `appointments/{auto-id}` with all citizen + slot fields, `status: "pending"`, `createdAt: now`
   - Update `sessions/{sessionToken}`: `used: true`
3. Resend confirmation email to citizen: service, date, time, centreLocation

**Returns:** `{ "success": true, "appointmentId": "<id>" }`

---

### verify_arrival (HTTP callable)

**Input:** `{ appointmentId }` + Firebase Auth ID token in request header

**Logic:**
1. Decode Firebase Auth token from request header
2. Verify `staff/{uid}` doc exists
3. Read `appointments/{appointmentId}` — confirm `status === "pending"`
4. Generate code via `codes.py`: `{PREFIX}-{4_RANDOM_ALPHANUMERIC}`
   - Prefixes: `NID` → new_id, `RID` → replace_id, `COL` → collect_id
5. Update appointment: `status: "resolved"`, `appointmentCode: <code>`, `resolvedAt: now`
6. Resend email to citizen: appointment code
7. Resend email to citizen: rate experience link (Google Form URL from `RATE_FORM_URL` env)

**Returns:** `{ "success": true, "appointmentCode": "<code>" }`

---

### sweep_missed (scheduled — every 5 minutes)

**Logic:**
1. Get today's date string (`YYYY-MM-DD`)
2. Query `appointments` where `date == today` AND `status == "pending"`
3. For each: check if `time + 8 minutes < now`
4. If yes: update `status: "missed"`, `missedAt: now`
5. Resend missed slot email:
   - Courteous acknowledgment (may have been present but outside window)
   - Walk-in option: informational text, no system action
   - Reschedule option: link to `{APP_URL}`

**Firestore index required:** `appointments` — composite on `date ASC` + `status ASC`

---

### email.py — Email Templates

Implement these helpers using the Resend Python SDK:

```python
send_verification_email(to_email, verify_url)
send_confirmation_email(to_email, appointment)
send_appointment_code_email(to_email, appointment_code, service_label)
send_rate_experience_email(to_email, rate_form_url)
send_missed_slot_email(to_email, app_url)
```

Each sends a plain-text email (HTML optional but not required for demo).

---

### codes.py — Appointment Code Generator

```python
def generate_code(service: str) -> str:
    """
    Returns: "NID-A3K9" | "RID-X7P2" | "COL-M1Q8"
    Prefixes: new_id → NID, replace_id → RID, collect_id → COL
    Suffix: 4 random uppercase alphanumeric chars
    """
```

Use `random.choices(string.ascii_uppercase + string.digits, k=4)`.

---

## Data Model

### sessions/{auto-id}
```
firstName    string
lastName     string
email        string
idNumber     string    // 8-digit national ID
phone        string
expiresAt    timestamp // now + 15 minutes
used         boolean
```

### slots/{auto-id}
```
date         string    // "YYYY-MM-DD"
time         string    // "HH:MM" (24hr)
service      string    // "new_id" | "replace_id" | "collect_id"
duration     number    // 20 | 10 | 5
status       string    // "available" | "held" | "booked"
heldBy       string|null
heldUntil    timestamp|null
bookedBy     string|null
```

### appointments/{auto-id}
```
firstName         string
lastName          string
email             string
idNumber          string
phone             string
service           string
date              string
time              string
duration          number
centreLocation    string   // "Huduma Centre Nairobi CBD"
slotId            string
status            string   // "pending" → "resolved" | "missed"
appointmentCode   string|null
resolvedAt        timestamp|null
missedAt          timestamp|null
createdAt         timestamp
```

### staff/{uid}
```
email    string
name     string
```

---

## seed/seed.py

Generates `slots` collection for today and tomorrow. Run after Firebase project is configured.

**Slot generation logic:**
- Hours: 09:00–16:00
- `new_id`: 20-min slots → 21 slots/day
- `replace_id`: 10-min slots → 42 slots/day
- `collect_id`: 5-min slots → 84 slots/day
- Total: ~147 slots × 2 days = ~294 documents

**Also seeds:** `staff/{uid}` docs. Note: Firebase Auth UID only exists after a staff member logs in once. Run seed.py **after** first staff login.

---

## Firestore Security Rules

Write these to `firestore.rules`:

- `sessions/{docId}` — anyone can read (anonymous read with exact doc ID via token), Cloud Functions write only
- `slots/{slotId}` — anyone can read, Cloud Functions write only
- `appointments/{appointmentId}` — authenticated staff can read, Cloud Functions write only
- `staff/{uid}` — authenticated users can read their own doc (`uid == request.auth.uid`)

---

## Firestore Composite Index

`firestore.indexes.json`:
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
    }
  ]
}
```

---

## Key Technical Decisions (don't change these)

1. **Lazy slot expiry** — No scheduled sweeper for holds. `slots.js` checks `heldUntil < now` client-side. `hold_slot` treats expired holds as available in its transaction. Simpler system.

2. **No citizen Firebase Auth** — Citizens are NOT Firebase Auth users. Identity = short-lived Firestore `sessions` doc accessed via magic link token. Firebase Email Link Auth would create an Auth user — this violates the no-account-creation requirement.

3. **Google Forms for rate experience** — External link in resolved/missed emails. Zero build effort. Feedback lives in Google Sheets, not Firestore — acceptable.

4. **8-digit ID format check only** — Kenyan ID numbers are sequential integers. No seeded dataset needed — just validate `^\d{8}$`.

5. **2-hour gap rule is client-side only** — Enforced in `SlotGrid.jsx` display logic. `hold_slot` does not re-validate it. A determined user could bypass it by calling the function directly. Known gap, acceptable for demo.

---

## Design Direction

**Aesthetic:** Clean, precise, minimal. "Safe and trustworthy" — not clinical, not flashy. Every state clearly communicated. Government-adjacent credibility without the government aesthetic. Think Gran Turismo dashboard: no unnecessary elements, everything serving a function.

**Color system:**
- Slot available: green
- Slot unavailable: black
- Countdown under 60s: red
- Status badges: pending (yellow), resolved (green), missed (gray)

**Tailwind:** Use utility classes throughout. No CSS files unless unavoidable.

---

## Known Open Issues

1. **Staff UID seeding** — `staff/{uid}` docs require the Firebase Auth UID, which only exists after a staff member logs in. Run `seed.py` after first staff login.

2. **2-hour gap is client-side only** — `hold_slot` Cloud Function doesn't re-validate the gap rule. Flag in code comments.

3. **No resend for expired links** — Expired verification sessions require a full restart. This is by design.
