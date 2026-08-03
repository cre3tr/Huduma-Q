# HudumaQ

A two-sided web app for booking ID service appointments at Kenyan Huduma Centres. Citizens book a specific time slot via a magic-link flow (no account). Staff verify arrivals via a live dashboard. Built for a DevPost hackathon.

---

## Current Status (as of 2026-04-29)

**The core application is fully implemented.** All pages, components, cloud functions, and utilities are written and wired together. The app has not been deployed to production.

### What's done
- Complete citizen booking flow: Landing → CheckEmail → Verify → ServiceSelect → Review → Success → ExpiredLink
- Complete staff flow: StaffLogin (Google OAuth) → StaffPending (live snapshot) → StaffResolved (read-only)
- All 5 Cloud Functions: `send_verification_email`, `hold_slot`, `confirm_booking`, `verify_arrival`, `sweep_missed` (scheduled every 5 min)
- Firestore data model: sessions, slots, appointments, staff
- Email templates via Brevo
- Client-side PDF (jsPDF) and ICS calendar file generation
- Slot seeding script (`seed/seed.py`) — must be re-run each day of demo
- Firestore security rules and composite index config
- Deploy guide at `docs/deploy.md`

### What's not done (pre-launch checklist)
- [ ] Create Google Form for rate experience feedback → paste URL into `RATE_FORM_URL` Firebase secret
- [ ] Set up Brevo account → verify sender email → get API key → set `BREVO_API_KEY` + `BREVO_SENDER_EMAIL` secrets
- [ ] Deploy Cloud Functions to Firebase (Blaze plan required for outbound network + scheduled functions)
- [ ] Deploy frontend to Vercel → note production URL → set as `APP_URL` secret
- [ ] Add Vercel domain to Firebase Auth authorized domains (staff Google Sign-In fails without this)
- [ ] Log in as staff → copy UID from Firebase Console → update `seed/seed.py` → run it
- [ ] Re-run `seed.py` each morning of the demo (slots cover today + tomorrow only)
- [ ] `.env.example` file missing from `frontend/` — all required vars are in `docs/spec.md` and `docs/deploy.md`

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + Vite + React Router 6 + Tailwind CSS |
| Hosting | Vercel (frontend), Firebase/GCP (backend) |
| Database | Firestore |
| Auth | Firebase Auth — Google provider (staff only) |
| Functions | Firebase Cloud Functions — Python 3.12, 2nd gen, `us-central1` |
| Email | Brevo (sib_api_v3_sdk) — free tier, 300/day |
| PDF | jsPDF — client-side |
| Calendar | ICS blob — client-side, no library |
| DNS/CDN | Cloudflare |

> **Note:** `docs/spec.md` mentions Resend for email. The implementation uses **Brevo** instead. `docs/deploy.md` and `functions/emails.py` are the source of truth — ignore the Resend references in `spec.md`.

---

## Project Structure

```
Huduma-Q/
├── frontend/src/
│   ├── pages/          # 9 pages — citizen flow + staff flow
│   ├── components/     # SlotGrid, ServiceCard, AppointmentRow, CountdownTimer
│   ├── context/        # BookingContext — in-memory session state
│   ├── lib/            # firebase.js, auth.js, slots.js, appointments.js, pdf.js, ics.js
│   ├── App.jsx         # React Router setup (no route guards — pages self-guard)
│   └── main.jsx        # Wraps app in BookingProvider
├── functions/
│   ├── main.py         # All 5 Cloud Functions
│   ├── emails.py       # Brevo send helpers + all email templates
│   ├── codes.py        # Appointment code generator (NID-XXXX, RID-XXXX, COL-XXXX)
│   └── requirements.txt
├── seed/
│   └── seed.py         # Seeds today + tomorrow slots + staff doc
├── firestore.rules     # Security rules (sessions/slots public read; appointments auth-read)
├── firestore.indexes.json
├── firebase.json
└── docs/
    ├── prd.md          # Full product requirements with acceptance criteria
    ├── spec.md         # Technical spec — data model, function specs, routing table
    ├── scope.md        # Project idea, goals, explicit cuts
    └── deploy.md       # Step-by-step production deploy guide (use this, not spec.md for Brevo)
```

---

## Key Technical Decisions

**1. No citizen Firebase Auth — sessions as identity**
Citizens are not Auth users. A Firestore `sessions` doc (15-min TTL, magic link token) is the identity. Reason: PRD requires zero account creation. Firebase Email Link Auth still creates an Auth user.

**2. Lazy slot expiry — no scheduled hold sweeper**
Slot holds expire via client-side check (`heldUntil < now`) in `slots.js`, not a Cloud Function. The `hold_slot` function also treats expired holds as available in its transaction. Raw Firestore docs can say "held" when the hold is expired — this is intentional.

**3. Brevo for email, not Resend**
Brevo's free tier covers the demo volume. `emails.py` uses `sib_api_v3_sdk`. Env vars: `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`.

**4. Google Forms for rate experience**
Feedback form is an external Google Form linked in resolved/missed emails. Zero build effort. Feedback data lives in Google Sheets, not queryable in-app.

**5. Dev uses Firebase emulators**
`firebase.js` auto-connects to local emulators in `DEV` mode (Firestore :8080, Auth :9099, Functions :5001).

---

## Known Gaps (acceptable for demo)

- `appointments` Firestore rule allows read by any authenticated Google user, not just verified staff. `verify_arrival` Cloud Function enforces staff check server-side — safe for demo.
- The 2-hour gap rule between a citizen's own bookings is enforced client-side only (`SlotGrid.jsx`). Savvy users can bypass by calling `hold_slot` directly.
- Staff dashboard pages (`StaffPending`, `StaffResolved`) only check Firebase Auth presence, not the `staff/` doc, on mount. Backend enforces this for all write actions.

---

## Environment Variables

**Frontend (Vercel dashboard):**
```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

**Cloud Functions (Firebase Secret Manager):**
```
BREVO_API_KEY
BREVO_SENDER_EMAIL
RATE_FORM_URL
APP_URL
```

---

## Day-of-Demo Checklist

1. Re-run `seed/seed.py` (fresh slots for today + tomorrow)
2. Verify staff login works at `/staff`
3. Run full citizen flow: form → email → verify → slot → confirm → success
4. Check Brevo → Transactional → Logs for email delivery

---

## Toolchain note — 2026-08-03

The frontend build now runs **vite 8 (Rolldown)**, up from vite 5, with
`@vitejs/plugin-react` 6 — the two are peer-locked and cannot move independently.
See `DEPENDENCIES.md` at the repo root for the reasoning and for the one
remaining, unfixable `react-router` advisory.
