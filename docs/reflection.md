# HudumaQ — Hackathon Reflection

**Submitted:** 2026-04-29  
**Builder:** Ian (Cre3tr)  
**Workflow:** Spec-driven development via the hackathon-guide plugin

---

## What We Built

A two-sided web app for booking ID service appointments at Kenyan Huduma Centres — and actually following through on a promise eCitizen Kenya made and abandoned.

**Citizen flow:** Landing form → magic-link email verification → service selection (New ID / Replace Lost ID / Collect ID) → slot grid with live availability → 5-minute hold → review → confirm → success screen with PDF slip and ICS calendar file.

**Staff flow:** Google OAuth login → live pending appointments dashboard → one-click verify arrival (generates alphanumeric appointment code, sends to citizen via email) → read-only resolved/missed view.

**Backend:** 5 Firebase Cloud Functions in Python 3.12. All email via Brevo. Firestore for all state. Scheduled `sweep_missed` function marks no-shows automatically every 5 minutes — zero staff action required.

---

## The Demo Scenario

**SC1 — The problem:** Citizen walks in with no appointment. Spends 7 hours waiting for a 10-minute photo session.

**SC2 — The fix:** Citizen visits the landing page at home. No account. Just email + ID number. Picks a time slot. Arrives at their time. Joins a dedicated scheduled intake lane. Staff verifies in one click. Done.

The contrast isn't a feature — it's the whole point.

---

## What Worked

**The spec paid off.** Every page, component, and function was named and described before a single line of code was written. Build time was almost entirely execution. No major re-architecting mid-build. The checklist held.

**Firebase full-stack.** Firestore + Cloud Functions + Auth in one project is genuinely fast to build on. The transaction API for the slot hold race condition was exactly what the spec called for, and it worked first try.

**Lazy session identity.** Not using Firebase Auth for citizens (short-lived Firestore `sessions` doc via magic link) was the right call. Zero account creation friction. Exactly what the PRD required.

**Client-side PDF + ICS.** jsPDF and plain ICS blob generation — no server round-trip, no dependency, no cost. Simple and solid.

---

## What Got Hard

**The gap between "code written" and "deployed and working."**

This happened three separate times:
1. Brevo API key in Firebase Secret Manager was invalid → `send_verification_email` returned 500 in production. Code was correct. Secret was wrong.
2. A conflicting plain env var in `functions/.env` caused a "Secret environment variable overlaps non-secret" deploy error. Took iteration to find.
3. Frontend changes (past-slot UI filter, UI redesign) were written locally but not pushed to git → Vercel was still serving old code. Nothing was broken. Nothing was deployed.

Spec-driven development gets you to correct code fast. Deployment is its own discipline. Next project: treat deploy as part of the checklist, not a step after.

**2nd gen Cloud Functions logging.** `firebase functions:log` doesn't show Python execution logs for 2nd gen (Cloud Run) functions — only admin audit events. Actual tracebacks live in Google Cloud Logging at `console.cloud.google.com/logs`. This isn't documented prominently. Cost a session.

---

## Key Decisions

| Decision | Why | Tradeoff |
|---|---|---|
| No citizen Firebase Auth — sessions as identity | PRD requires zero account creation. Firebase Email Link Auth still creates an Auth user. | No persistent citizen identity across sessions. A citizen can't look up their booking later. Acceptable. |
| Brevo over Resend | Brevo free tier (300/day) covers demo volume. Resend was specced but Brevo was confirmed at build time. | Minor API difference (sib_api_v3_sdk vs resend-python). Already abstracted behind `emails.py`. |
| Lazy slot expiry — no sweeper for holds | Eliminates one Cloud Function. `slots.js` checks `heldUntil < now` client-side. `hold_slot` treats expired holds as available in its transaction. | Raw Firestore docs can say "held" when the hold is expired. UI and booking logic are both correct — only the raw doc lags. |
| Google Forms for rate experience | Zero build effort. Two-field form. Feedback in Google Sheets, not Firestore. | Not queryable within the app. Acceptable for demo. |
| Past-time blocking at both layers | Client-side: `isPast()` in SlotGrid filters the UI. Server-side: `hold_slot` transaction parses slot datetime in EAT and rejects past times. | Belt-and-suspenders. The client check is cosmetic; the server check is the real guard. |

---

## What Was Cut and Why

- **Walk-in queue management** — walk-ins are handled on-prem. Touching that system requires integration that doesn't exist.
- **IFMIS verification** — real identity check against government databases requires API access unavailable for this build. ID number collected, not verified.
- **SMS notifications** — email only. SMS requires a third-party API and reads as suspicious in Kenya's mobile context.
- **Multi-centre support** — single Huduma Centre for the demo. The real need, but out of scope.
- **Real-time slot refresh** — slots don't update live as others book. Citizen must navigate away and back. Would need Firestore `onSnapshot` on SlotGrid. Cut for time.

---

## What's Left Before Launch

- [ ] Create Google Form for rate experience → paste URL into `RATE_FORM_URL` Firebase secret
- [ ] Deploy Cloud Functions to Firebase (Blaze plan required)
- [ ] Deploy frontend to Vercel → set as `APP_URL` secret
- [ ] Add Vercel domain to Firebase Auth authorized domains
- [ ] Run `seed/seed.py` with actual staff UID
- [ ] Create `frontend/.env.example` with all required `VITE_FIREBASE_*` keys listed

---

## What I'd Do Differently

1. **Treat secrets setup as day-one infrastructure.** Don't write a function that depends on a secret before the secret exists in the environment. Set up Secret Manager first.
2. **Push to git after every working state.** Local edits are invisible to Vercel. Git push is the unit of "done" for the frontend.
3. **Add at least one smoke test per Cloud Function.** Even a single `curl` call in a deploy script. The 401 error would have been caught in 5 minutes instead of a session.
4. **Use `onSnapshot` in SlotGrid from the start.** The live update gap is the most obvious UX gap in the citizen flow. Not hard to add — just didn't make the checklist.

---

## The Bigger Point

Kenyan citizens lose full workdays to a process that takes 10 minutes. eCitizen proved the demand was real and then walked away from it. HudumaQ is a working answer to a real problem — not a technical demo. That framing drove every scope decision: cut multi-centre, cut SMS, cut walk-in management, cut document upload — and ship something that actually works for the core case.

The spec-driven workflow made that possible in a hackathon window. The thinking happened before the building. The building was mostly execution.
