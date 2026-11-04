# Architecture

> Last verified 2026-11-04 against `84cbcf3`. Versions are left out: read
> `frontend/package-lock.json` and `functions/requirements.txt`. Stack, decisions
> and env vars: [CLAUDE.md](CLAUDE.md). Data model and function specs:
> [docs/spec.md](docs/spec.md).

## Shape

A static React SPA on Vercel talking to Firebase: Firestore for all state, Python
Cloud Functions (2nd gen, `us-central1`) for every write, and Firebase Auth
(Google provider) for staff only. Email goes out through Brevo.

```
Citizen browser ──► Vercel (frontend/dist, SPA rewrite)
   │   read: slots                      ┌──────────────┐
   ├──────────────────────────────────► │  Firestore   │
   │   call: send_verification_email    │ sessions     │
   ├───────────► Cloud Functions ─────► │ slots        │
   │             hold_slot              │ appointments │
   │             confirm_booking        │ staff        │
   │                                    └──────────────┘
Staff browser ─ Google sign-in ─► verify_arrival (checks staff/{uid})
Scheduler (every 5 min) ─► sweep_missed ─► marks no-shows, emails
Functions ─► Brevo (verification, confirmation, code, missed-slot, rating emails)
```

## Components

- **`frontend/src/pages/`** (10 pages): the citizen flow (Landing, CheckEmail,
  Verify, ServiceSelect, Review, Success, ExpiredLink) and the staff flow
  (StaffLogin, StaffPending, StaffResolved). `App.jsx` has no route guards; pages
  guard themselves.
- **`frontend/src/context/BookingContext.jsx`**: in-memory session state only.
- **`frontend/src/lib/`**: `firebase.js` (connects to local emulators in DEV),
  `slots.js` (lazy hold expiry), `pdf.js` (jsPDF receipt), `ics.js`,
  `appointments.js`, `auth.js`.
- **`functions/main.py`** (322 lines): the five functions. `emails.py` holds the
  Brevo helpers and templates; `codes.py` makes appointment codes
  (`NID-`, `RID-`, `COL-`).
- **`firestore.rules`, `firestore.indexes.json`, `firebase.json`**: rules,
  composite indexes and emulator ports.
- **`seed/seed.py`**: seeds today and tomorrow's slots and the staff document.

## How data flows

A citizen submits a form; `send_verification_email` creates a `sessions`
document (15-minute TTL) and emails the link holding its id. `Verify` resolves the link;
`hold_slot` marks a slot held for 5 minutes inside a transaction;
`confirm_booking` books it, writes the appointment and emails a confirmation.
The PDF receipt and ICS file are built in the browser. On arrival, staff run
`verify_arrival`, which issues the code and emails the rating link.
`sweep_missed` marks appointments missed after the 8-minute grace window.

## External dependencies at runtime

| Dependency | Used for | If it goes away |
|---|---|---|
| Vercel | frontend hosting | site down |
| Firebase (Firestore, Auth, Functions) | all state and logic | app down |
| Brevo | every email | bookings still commit; `confirm_booking` returns `emailSent: false` (BUILD.md); magic links fail |
| Google Forms | rating feedback link in emails | feedback link breaks |
| Cloudflare | DNS/CDN per CLAUDE.md | `[UNKNOWN]`; not visible in the repo |

## Decisions

No ADR folder. Decisions are in CLAUDE.md "Key Technical Decisions" and
[DEPENDENCIES.md](DEPENDENCIES.md) (DEP-1 to DEP-10).
