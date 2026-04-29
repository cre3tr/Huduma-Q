# HudumaQ — Technical Spec

## Stack

- **Frontend:** React 18 + Vite 5 + React Router 6 + Tailwind CSS
  - [React docs](https://react.dev) | [Vite docs](https://vitejs.dev) | [React Router docs](https://reactrouter.com) | [Tailwind docs](https://tailwindcss.com)
- **Database:** Firestore (Firebase)
  - [Firestore docs](https://firebase.google.com/docs/firestore)
- **Auth:** Firebase Auth — Google provider (staff only)
  - [Firebase Auth Google Sign-In docs](https://firebase.google.com/docs/auth/web/google-signin)
- **Server-side logic:** Firebase Cloud Functions — Python 3.12, 2nd gen
  - [Cloud Functions Python docs](https://firebase.google.com/docs/functions/get-started?gen=2nd)
- **Email:** Resend — 3,000/month free tier
  - [Resend docs](https://resend.com/docs) | [Python SDK](https://resend.com/docs/send-with-python)
- **PDF:** jsPDF — client-side, no server round-trip
  - [jsPDF docs](https://github.com/parallax/jsPDF)
- **Calendar:** ICS file — generated client-side as plain text Blob, no library needed
- **Rate experience form:** Google Forms — external link in resolved email, manually created
- **Deployment:** Vercel (frontend) + Firebase/GCP (backend) + Cloudflare (DNS/CDN)

---

## Runtime & Deployment

- **Frontend:** Vercel, hobby tier. `vercel.json` rewrites all paths to `index.html` for client-side routing. Production domain added to Firebase Auth authorized domains once.
- **Backend:** Firebase Blaze (pay-as-you-go) plan required — Spark plan blocks outbound network calls (Resend) and scheduled functions. Cost at hackathon scale is effectively zero.
- **CDN/DNS:** Cloudflare sits in front of the Vercel production domain.

**Environment variables:**

Frontend (Vercel dashboard + `.env.example`):
```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

Cloud Functions (Firebase environment config):
```
RESEND_API_KEY
RATE_FORM_URL     # Google Form URL for rate experience
APP_URL           # Production Vercel URL (for magic links)
```

---

## Architecture Overview

```
Citizen / Staff Browser
        │
        ▼ HTTPS
  Cloudflare (DNS + CDN)
        │
        ▼
  React + Vite  ──── Firebase SDK ────────────────────────────────────────────┐
  (Vercel)                                                                    ▼
                                                              Firebase (GCP)
                                                  ┌───────────────────────────────────┐
                                                  │  Firestore        Firebase Auth   │
                                                  │  (database)       (Google OAuth)  │
                                                  │                                   │
                                                  │  Cloud Functions (Python 3.12)    │
                                                  │  ├── send_verification_email      │
                                                  │  ├── hold_slot                    │
                                                  │  ├── confirm_booking              │
                                                  │  ├── verify_arrival               │
                                                  │  └── sweep_missed (scheduled/5m)  │
                                                  └──────────────┬────────────────────┘
                                                                 │
                                                                 ▼
                                                             Resend
                                                   (transactional email)
```

### Citizen booking data flow

```
1. Citizen submits form
        │
        ▼
   Cloud Function: send_verification_email
        ├── validates 8-digit ID + email format
        ├── creates sessions/{docId} { email, idNumber, firstName,
        │   lastName, phone, expiresAt: +15min, used: false }
        └── Resend sends magic link → {APP_URL}/verify?token={docId}
        │
2. Citizen clicks link → Verify.jsx
        ├── reads sessions/{token} from Firestore
        ├── checks expiresAt and used flag
        └── stores citizen data in BookingContext → navigates to /book
        │
3. Citizen selects service + slot → Cloud Function: hold_slot
        ├── Firestore transaction on slots/{slotId}
        ├── confirms status === "available" (or held with expired heldUntil)
        └── writes status: "held", heldBy: sessionToken, heldUntil: now + 5min
        │
4. Citizen confirms → Cloud Function: confirm_booking
        ├── Firestore transaction: slot → "booked"
        ├── creates appointments/{id} with full citizen + slot details
        ├── marks sessions/{docId} used: true
        └── Resend sends confirmation email
        │
5. Success.jsx
        ├── renders appointment details from BookingContext
        ├── pdf.js → generates downloadable appointment slip
        └── ics.js → generates .ics calendar file download
```

### Staff data flow

```
1. Staff → Google Sign-In → Firebase Auth
        └── auth.js checks staff/{uid} doc exists → navigates to /staff/pending

2. StaffPending.jsx
        └── onSnapshot: appointments where date==today and status=="pending", ordered by time

3. Verify button → Cloud Function: verify_arrival
        ├── validates Firebase Auth token + staff/{uid} doc
        ├── generates appointment code: {PREFIX}-{4_ALPHANUMERIC}
        ├── updates appointment: status: "resolved", appointmentCode, resolvedAt
        ├── Resend: appointment code email to citizen
        └── Resend: rate experience email (Google Form link) to citizen

4. sweep_missed Cloud Function (every 5 min, scheduled)
        ├── queries appointments where status=="pending" and time + 8min < now
        ├── updates each: status: "missed", missedAt
        └── Resend: missed slot email (walk-in instructions + reschedule link)
```

---

## Frontend

### Routing

`App.jsx` — React Router 6. All routes are client-side. `vercel.json` catches all paths and serves `index.html`.

| Route | Component | Guard |
|---|---|---|
| `/` | `Landing.jsx` | Public |
| `/check-email` | `CheckEmail.jsx` | Public |
| `/verify` | `Verify.jsx` | Public (token in `?token=` param) |
| `/book` | `ServiceSelect.jsx` | Requires `BookingContext.citizen` |
| `/review` | `Review.jsx` | Requires `BookingContext.heldSlot` |
| `/success` | `Success.jsx` | Requires `BookingContext.confirmedAppointment` |
| `/expired` | `ExpiredLink.jsx` | Public |
| `/staff` | `StaffLogin.jsx` | Public |
| `/staff/pending` | `StaffPending.jsx` | Requires Firebase Auth + staff doc |
| `/staff/resolved` | `StaffResolved.jsx` | Requires Firebase Auth + staff doc |

If a guarded route is accessed without the required state, redirect to `/`.

### BookingContext (context/BookingContext.jsx)

Implements `prd.md > Citizen Identity Verification` and `prd.md > Service Selection and Slot Booking`.

In-memory state only — persists across route navigation within the session, resets on page reload.

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

If a citizen navigates away during an active hold, the Firestore slot doc remains "held" until the lazy expiry triggers (checked client-side on next fetch).

### Pages

#### Landing.jsx
Implements `prd.md > Citizen Identity Verification`.

- Form fields: `firstName`, `lastName`, `email`, `idNumber` (must be exactly 8 digits), `phone`
- On submit: calls `send_verification_email` Cloud Function
- On success: navigates to `/check-email`
- On error: inline field error message

#### CheckEmail.jsx
Implements `prd.md > Citizen Identity Verification` (waiting state).

- Displays the submitted email address
- States link expires in 15 minutes
- No further actions — waiting state only

#### Verify.jsx
Implements `prd.md > Citizen Identity Verification` (token validation).

- Reads `?token=` query param on mount
- Reads `sessions/{token}` from Firestore
- If `expiresAt < now` or `used === true`: navigates to `/expired`
- If valid: stores citizen fields in `BookingContext`, navigates to `/book`

#### ServiceSelect.jsx
Implements `prd.md > Service Selection and Slot Booking`.

- Renders three `ServiceCard` components: New ID Application (20 min), Replace Lost ID (10 min), Collect ID (5 min)
- Selecting a card collapses the other two, pre-populates citizen info from `BookingContext`
- `SlotGrid` appears below selected card — no page navigation
- Bold notice: "You have 5 minutes to complete your booking once a slot is selected"
- On slot select: calls `hold_slot` Cloud Function, starts `CountdownTimer` (5 min)
- On `CountdownTimer` expiry: clears `heldSlot` from context, shows "Time's up — please restart" message, navigates to `/`

#### Review.jsx
Implements `prd.md > Service Selection and Slot Booking` (review step).

- Displays: firstName, lastName, idNumber, phone, service, date, time, centreLocation ("Huduma Centre Nairobi CBD" — fixed, not editable)
- All fields read-only
- Confirm button: calls `confirm_booking` Cloud Function
- On success: stores confirmed appointment in `BookingContext`, navigates to `/success`

#### Success.jsx
Implements `prd.md > Booking Confirmation`.

- Displays: service, date, time, centreLocation
- "Download PDF" button: calls `pdf.js` → triggers browser download
- "Add to Calendar" button: calls `ics.js` → triggers `.ics` download
- Confirmation email already sent by `confirm_booking` Cloud Function

#### ExpiredLink.jsx
- Message: "This link has expired. Please return to the home page to start again."
- Link to `/`

#### StaffLogin.jsx
Implements `prd.md > Staff Dashboard — Pending Appointments` (auth entry).

- Google Sign-In button
- On sign-in: `auth.js` checks `staff/{uid}` Firestore doc
- If doc missing: signs out, shows "Unauthorized — contact your administrator"
- If doc found: navigates to `/staff/pending`

#### StaffPending.jsx
Implements `prd.md > Staff Dashboard — Pending Appointments`.

- Firestore `onSnapshot` listener: `appointments` where `date == today` and `status == "pending"`, ordered by `time` ascending
- Renders `AppointmentRow` per result with Verify button
- On verify: calls `verify_arrival` Cloud Function — row disappears automatically via `onSnapshot`
- Nav link to `/staff/resolved`

#### StaffResolved.jsx
Implements `prd.md > Staff Dashboard — Resolved Appointments`.

- Firestore query (one-time fetch + manual refresh): `appointments` where `date == today` and `status in ["resolved", "missed"]`
- Read-only — no action buttons
- Columns: date, time, service, firstName, lastName, idNumber, phone, status badge, appointmentCode

### Components

#### SlotGrid.jsx
Implements `prd.md > Service Selection and Slot Booking` (slot display).

Props: `date`, `service`, `slotDuration`, `existingAppointments` (citizen's other bookings for 2-hour gap check), `onSlotSelect`

- Fetches `slots` collection filtered by `date` and `service`
- Client-side expiry: if `status === "held"` and `heldUntil < now`, render as available (green)
- 2-hour gap rule: if `existingAppointments` contains a booking within 2 hours of this slot's time, render as black
- Renders slots from 09:00 to 16:00 in `slotDuration`-minute increments
- Green = available, Black = unavailable (taken, held, or within 2-hour gap)
- On green slot click: emit selected slot to parent

#### ServiceCard.jsx
Props: `service`, `title`, `duration`, `requirements` (list of strings), `selected`, `onSelect`

- Expanded when `selected === true`, collapsed otherwise
- Shows requirements list when expanded
- Pre-populated citizen details shown when selected

#### AppointmentRow.jsx
Props: `appointment`, `onVerify`, `showVerifyButton`

- Renders one table row
- Verify button calls `onVerify(appointment.id)` — disabled while loading

#### CountdownTimer.jsx
Props: `expiresAt` (timestamp), `onExpire` (callback)

- Displays `mm:ss` countdown
- Calls `onExpire()` when reaches zero
- Red color when under 60 seconds

### lib/

#### firebase.js
Firebase app init using `VITE_FIREBASE_*` env vars. Exports: `db` (Firestore instance), `auth` (Auth instance), `functions` (Cloud Functions instance).

#### auth.js
- `signInWithGoogle()` — Firebase Auth Google provider sign-in
- `checkStaffAccess(uid)` — reads `staff/{uid}`, returns boolean
- `signOutStaff()` — Firebase Auth sign-out + redirect to `/staff`

#### slots.js
- `fetchSlots(date, service)` — Firestore query, returns slots with client-side expiry applied
- `isAvailable(slot)` — returns true if `status === "available"` OR (`status === "held"` AND `heldUntil < Date.now()`)

#### appointments.js
- `getCitizenAppointments(email)` — fetches all pending/resolved appointments for a citizen email (for 2-hour gap rule)
- `getAppointment(appointmentId)` — single appointment read

#### pdf.js
- `generatePDF(appointment)` — uses jsPDF to produce and download appointment slip
- Slip contains: firstName, lastName, idNumber, service (human-readable label), date, time, centreLocation

#### ics.js
- `generateICS(appointment)` — produces a valid `.ics` file as a Blob
- Triggers browser download as `hudumaq-appointment.ics`
- Compatible with Google Calendar, Outlook, Apple Calendar

---

## Cloud Functions (Python 3.12)

All functions registered in `functions/main.py`. Helpers in `functions/email.py` (Resend templates) and `functions/codes.py` (appointment code generator).

### send_verification_email (HTTP callable)
Implements `prd.md > Citizen Identity Verification`.

**Input:**
```json
{ "firstName": "", "lastName": "", "email": "", "idNumber": "", "phone": "" }
```

**Logic:**
1. Validate: `idNumber` matches `^\d{8}$`, `email` is valid format
2. Create `sessions/{auto-id}`: `{ firstName, lastName, email, idNumber, phone, expiresAt: now+15min, used: false }`
3. Send Resend email to `email`: subject "Verify your HudumaQ booking", body contains `{APP_URL}/verify?token={docId}`

**Returns:** `{ "success": true }`

---

### hold_slot (HTTP callable)
Implements `prd.md > Service Selection and Slot Booking` (hold mechanic).

**Input:**
```json
{ "slotId": "", "sessionToken": "" }
```

**Logic:**
1. Verify `sessions/{sessionToken}` exists, `expiresAt > now`, `used === false`
2. Firestore transaction on `slots/{slotId}`:
   - Read current state
   - If `status === "booked"`: raise `UNAVAILABLE`
   - If `status === "held"` AND `heldUntil > now`: raise `UNAVAILABLE`
   - Otherwise (available OR expired hold): write `status: "held"`, `heldBy: sessionToken`, `heldUntil: now+5min`

**Returns:** `{ "success": true, "heldUntil": "<ISO timestamp>" }`

---

### confirm_booking (HTTP callable)
Implements `prd.md > Booking Confirmation`.

**Input:**
```json
{ "slotId": "", "sessionToken": "" }
```

**Logic:**
1. Read `sessions/{sessionToken}` — validate not expired, not used
2. Firestore transaction:
   - Read `slots/{slotId}`: confirm `heldBy === sessionToken` AND `heldUntil > now`
   - Write slot: `status: "booked"`, `bookedBy: <new appointmentId>`
   - Create `appointments/{auto-id}` with all citizen fields + slot fields, `status: "pending"`, `createdAt: now`
   - Update `sessions/{sessionToken}`: `used: true`
3. Send Resend confirmation email: service, date, time, centreLocation, calendar ICS attachment (or link)

**Returns:** `{ "success": true, "appointmentId": "<id>" }`

---

### verify_arrival (HTTP callable)
Implements `prd.md > Staff Dashboard — Pending Appointments` (verify action).

**Input:**
```json
{ "appointmentId": "" }
```
Requires Firebase Auth ID token in request header.

**Logic:**
1. Decode Firebase Auth token from request
2. Verify `staff/{uid}` doc exists in Firestore
3. Read `appointments/{appointmentId}` — confirm `status === "pending"`
4. Generate code via `codes.py`: `{SERVICE_PREFIX}-{4_RANDOM_ALPHANUMERIC}` (e.g., `NID-A3K9`)
   - Prefixes: `NID` → new_id, `RID` → replace_id, `COL` → collect_id
5. Update appointment: `status: "resolved"`, `appointmentCode: <code>`, `resolvedAt: now`
6. Resend email to citizen: appointment code
7. Resend email to citizen: rate experience (Google Form URL from `RATE_FORM_URL` env)

**Returns:** `{ "success": true, "appointmentCode": "<code>" }`

---

### sweep_missed (scheduled — every 5 minutes)
Implements `prd.md > Missed Appointment Handling`.

**Logic:**
1. Get today's date string (`YYYY-MM-DD`)
2. Query `appointments` where `date == today` AND `status == "pending"`
3. For each result: check if `time + 8 minutes < now`
4. If yes: update `status: "missed"`, `missedAt: now`
5. Send Resend missed slot email to citizen:
   - Courteous acknowledgment
   - Walk-in option: informational text directing to the walk-in counter (no system action)
   - Reschedule option: link to `{APP_URL}` to start fresh

**Firestore index required:** `appointments` — composite index on `date ASC` + `status ASC`

---

## Data Model

### sessions/{auto-id}
Short-lived citizen verification tokens. TTL: 15 minutes.

```
firstName    string
lastName     string
email        string
idNumber     string      // 8-digit national ID
phone        string
expiresAt    timestamp
used         boolean
```

### slots/{auto-id}
Pre-generated by `seed.py` for today and tomorrow. One doc per slot per service.

```
date         string      // "YYYY-MM-DD"
time         string      // "HH:MM" (24hr, e.g. "09:00")
service      string      // "new_id" | "replace_id" | "collect_id"
duration     number      // 20 | 10 | 5 (minutes)
status       string      // "available" | "held" | "booked"
heldBy       string|null // sessionToken
heldUntil    timestamp|null
bookedBy     string|null // appointmentId
```

**Slot generation logic (seed.py):**
- Hours: 09:00–16:00
- `new_id`: 20-min slots → 21 slots/day
- `replace_id`: 10-min slots → 42 slots/day
- `collect_id`: 5-min slots → 84 slots/day
- Total: ~147 slots × 2 days = ~294 documents

### appointments/{auto-id}
Central state document. Shared by citizen flow, staff dashboard, and sweep_missed function.

```
// Citizen info (copied from session at confirm time)
firstName         string
lastName          string
email             string
idNumber          string
phone             string

// Booking info
service           string      // "new_id" | "replace_id" | "collect_id"
date              string      // "YYYY-MM-DD"
time              string      // "HH:MM"
duration          number
centreLocation    string      // "Huduma Centre Nairobi CBD"
slotId            string

// Status lifecycle
status            string      // "pending" → "resolved" | "missed"
appointmentCode   string|null // set on verify_arrival
resolvedAt        timestamp|null
missedAt          timestamp|null
createdAt         timestamp
```

### staff/{uid}
Pre-seeded. `uid` = Firebase Auth UID (requires first login before seeding).

```
email    string
name     string
```

---

## File Structure

```
hudumaq/
├── frontend/                          # React + Vite — deployed to Vercel
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Landing.jsx            # Citizen entry — verification form
│   │   │   ├── CheckEmail.jsx         # "Check your email" waiting state
│   │   │   ├── Verify.jsx             # Token validation → unlocks booking
│   │   │   ├── ServiceSelect.jsx      # Service cards + slot grid
│   │   │   ├── Review.jsx             # Pre-populated confirm screen
│   │   │   ├── Success.jsx            # Confirmation + PDF + calendar link
│   │   │   ├── ExpiredLink.jsx        # Expired link error state
│   │   │   ├── StaffLogin.jsx         # Google sign-in for staff
│   │   │   ├── StaffPending.jsx       # Live pending appointments dashboard
│   │   │   └── StaffResolved.jsx      # Read-only resolved appointments
│   │   ├── components/
│   │   │   ├── SlotGrid.jsx           # Green/black slot calendar
│   │   │   ├── ServiceCard.jsx        # Collapsible service selection card
│   │   │   ├── AppointmentRow.jsx     # Single row in staff dashboard table
│   │   │   └── CountdownTimer.jsx     # 5-min booking hold countdown
│   │   ├── context/
│   │   │   └── BookingContext.jsx     # Citizen session state across flow
│   │   ├── lib/
│   │   │   ├── firebase.js            # Firebase app init + SDK exports
│   │   │   ├── auth.js                # Google sign-in + staff whitelist check
│   │   │   ├── slots.js               # Slot fetching + lazy expiry logic
│   │   │   ├── appointments.js        # Firestore appointment reads
│   │   │   ├── pdf.js                 # jsPDF appointment slip generation
│   │   │   └── ics.js                 # ICS calendar file generation
│   │   ├── App.jsx                    # React Router 6 setup + route guards
│   │   └── main.jsx                   # App entry point
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   ├── vercel.json                    # Rewrites all routes → index.html
│   └── .env.example                   # Firebase key template
│
├── functions/                         # Firebase Cloud Functions — Python 3.12
│   ├── main.py                        # All function definitions + registration
│   ├── email.py                       # Resend send helpers + email templates
│   ├── codes.py                       # Appointment code generator
│   └── requirements.txt               # firebase-functions, resend, etc.
│
├── seed/
│   └── seed.py                        # Seeds today+tomorrow slots + staff docs
│
├── firestore.rules                    # Security rules
├── firestore.indexes.json             # Composite index: date + status
├── firebase.json                      # Firebase project config
├── .firebaserc                        # Firebase project alias
├── docs/
│   ├── learner-profile.md
│   ├── scope.md
│   ├── prd.md
│   └── spec.md
└── process-notes.md
```

---

## Key Technical Decisions

### 1. Lazy slot expiry — no scheduled sweeper for holds
Slot holds are not cleared by a background function. Instead, `slots.js` checks `heldUntil < now` client-side on every fetch, and `hold_slot` treats an expired hold as available in its transaction.

**Why:** Eliminates one Cloud Function and one Cloud Scheduler job. Simpler system.
**Tradeoff:** Firestore slot docs can say "held" when the hold is actually expired. The UI and booking logic are both correct — only the raw document lags.

### 2. No citizen Firebase Auth accounts — session docs as identity
Citizens are not Firebase Auth users. Identity is a short-lived Firestore `sessions` document accessed via a magic link token.

**Why:** The PRD explicitly requires no account creation. Firebase Email Link Auth would still create an Auth user, violating this.
**Tradeoff:** No persistent citizen identity. A citizen cannot look up their booking after the session ends. Acceptable per PRD scope.

### 3. Google Forms for rate experience
Rate experience feedback is collected via an external Google Form linked in the resolved/missed emails.

**Why:** Zero build effort. The feedback requirement is minimal (two fields). Building a form page in the app adds work with no architectural value.
**Tradeoff:** Feedback data lives in Google Sheets, not Firestore. Not queryable within the app.

---

## Dependencies & External Services

| Service | Purpose | Tier | Docs |
|---|---|---|---|
| Firebase (Blaze) | Firestore + Auth + Cloud Functions + Cloud Scheduler | Pay-as-you-go (free at hackathon scale) | [firebase.google.com/docs](https://firebase.google.com/docs) |
| Resend | Transactional email | Free — 3,000/month, 100/day | [resend.com/docs](https://resend.com/docs) |
| Vercel | Frontend hosting | Free hobby tier | [vercel.com/docs](https://vercel.com/docs) |
| Cloudflare | DNS + CDN | Free | [developers.cloudflare.com](https://developers.cloudflare.com) |
| jsPDF | Client-side PDF generation | MIT | [github.com/parallax/jsPDF](https://github.com/parallax/jsPDF) |
| Google Forms | Rate experience feedback form | Free | [forms.google.com](https://forms.google.com) |

---

## Open Issues

1. **Firestore security rules** — rules must be written carefully: `sessions` readable only by token holder (anonymous read with exact doc ID), `appointments` writable only by Cloud Functions, `slots` publicly readable but writable only by Cloud Functions, `staff` readable only by authenticated staff users. Design and write during `/build`.

2. **Staff UID seeding** — `staff/{uid}` docs require the Firebase Auth UID, which only exists after a staff member logs in for the first time. `seed.py` must be run after first login. Document this in setup instructions.

3. **2-hour gap rule is client-side only** — the gap rule is enforced in `SlotGrid.jsx` display logic. The `hold_slot` Cloud Function does not re-validate it. A determined user could bypass it by calling the function directly. Acceptable for a demo — flag as a known gap.
