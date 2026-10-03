# HudumaQ — Build Doc

Created 2026-10-03. `CLAUDE.md` holds the architecture, stack and gotchas;
`DEPENDENCIES.md` holds dependency decisions (DEP-1 onward). This file logs
issues and how they were resolved, newest first.

## Issues hit, and how they were resolved

### `confirm_booking` reported a committed booking as failed when the email failed, 2026-10-03

**Found:** the DEP-9 emulator test (2026-10-02). With a dummy Brevo key, the
booking transaction committed (slot `booked`, session `used`, appointment
`pending`), and *then* `_send_confirmation_email` raised. The callable answered
`INTERNAL`, so `Review.jsx` showed "Booking confirmation failed — please try
again", and a retry could only get "Session already used".
**Fix:** `functions/main.py` catches the email failure, logs it with the
appointment id, and returns `{success, appointmentId, emailSent: false}`.
`Review.jsx` stores `emailSent` (an absent field counts as sent, so the frontend
is safe against either functions deploy). `Success.jsx` swaps the receipt line
to "Your confirmation email is delayed. Download the PDF below as your
receipt."
**Verified:**
- Emulator (`demo-hudumaq`, dummy key): `confirm_booking` → 200
  `emailSent: false`, the booking committed, and the error is logged.
- Headless render of `/success` in both states shows the right line (screenshot
  checked).
- `vite build` 0.
- ESLint: 40 problems over 27 files before and after, with the same rule hits in
  the two edited pages.

**Deploy:** the frontend ships with the push. The functions need
`firebase deploy --only functions --project hudumaq-2c732` (Ian).

### The Firestore emulator cannot test index removal, 2026-10-03

Ian approved removing composite index #1 `appointments(date, status)` if the
emulator passed every staff query without it. The control failed first: the
emulator answered StaffPending's query, which needs composite index #2 in
production, with no index at all. So the emulator does not enforce composite
indexes, and the test cannot show anything. Index #1 stays. See `CLAUDE.md`
"Known Gaps".

## Cheatsheet

```bash
# render a built frontend without real Firebase config (no .env locally):
VITE_FIREBASE_API_KEY=AIzaSyDemoPlaceholderKey0000000000000000 VITE_FIREBASE_PROJECT_ID=demo-hudumaq \
  npx vite build --outDir <scratch-dir>
# functions in the emulator with dummy secrets (delete the file afterwards):
#   functions/.secret.local: BREVO_API_KEY=..., BREVO_SENDER_EMAIL=..., APP_URL=..., RATE_FORM_URL=
firebase emulators:start --only functions,firestore --project demo-hudumaq
```
