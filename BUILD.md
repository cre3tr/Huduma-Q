# HudumaQ — Build Doc

Created 2026-10-03. `CLAUDE.md` holds the architecture, stack and gotchas;
`DEPENDENCIES.md` holds dependency decisions (DEP-1 onward). This file logs
issues and how they were resolved, newest first.

## Issues hit, and how they were resolved

### Sign-in returned 500: the Brevo API key had been deactivated, 2026-11-04

- **Symptom:** after the hardening deploy, `send_verification_email` returned
  500, and Landing showed "Could not send verification email".
- **Diagnosis:**
  - Agents can't read production logs (the auto-mode classifier blocks it), so
    the call was replayed in the emulator with a dummy Brevo key.
  - The sample-ID check, both rate-limit counters and the session write all
    succeeded. Only the Brevo send failed (`RuntimeError: Brevo send failed:
    (401)`). That cleared the new code up to the send.
- **Cause, in two layers,** read from the Cloud Run stderr logs with `gcloud
  logging read` (logName `run.googleapis.com/stderr`; `firebase functions:log`
  shows only the deploy audit entries for Gen 2):
  1. Until 12:07 UTC, Brevo answered `401 {"message":"API Key is not enabled"}`.
     Ian reactivated the key.
  2. From 12:41 UTC it answered `401 "We have detected you are using an
     unrecognised IP address 2600:1900:…"`. Brevo's **Authorised IPs** list
     blocks the function, and Cloud Functions have no fixed outbound IP, so
     adding the one address would not last.
- The Brevo 401 body does not echo the recipient address. That answers the
  open question about tracebacks carrying PII, for this error at least.
- **Rule:** when sign-in fails with 500, check Brevo's API key status and its
  Authorised IPs before suspecting the code. Neither is visible from the repo.
- ~~**Known wart:** a failed send still counts against the 3-per-hour address
  limit, so three failures lock that address out for an hour.~~ Fixed in
  `3d479c2`: `refund()` gives the counters back and deletes the unusable
  session. It was emulator-tested. The deploy was blocked for agents by the
  auto-mode classifier, so Ian deployed it himself on 2026-11-04 with:
  `firebase deploy --only functions:send_verification_email --project hudumaq-2c732`.

### Hardening pass and demo labelling, 2026-11-04

Decision (Ian): the site stops taking real personal data and says it is not a
government service. Commits `6c967e7` (banner, sample ID/phone, email footers),
`4ca01c7` (appointments readable by staff only, `tests/firestore-rules.test.mjs`),
`009883f` (log field names, not payloads), `dbe39e4` (`functions/rate_limit.py`:
3 links/address/hour, 200/day), `4d5654d` (`functions/cleanup.py`: scheduled
purge), `845dfea` (backlog note), `918ad49` (2-hour gap server-side, staff
check on mount), `32ea61e` (headers and CSP in `frontend/vercel.json`),
`39bc84f` (minimatch override).
**Gotchas:**
- Closing `appointments` reads broke the citizen-side lookup behind the old
  client 2-hour check (it failed soft to an empty list), so that lookup and
  `lib/appointments.js` were removed along with the server-side rule.
- A CSP probe against a build with no `VITE_FIREBASE_*` renders an empty page
  (Firebase throws at init) and shows zero violations: hollow. Build with dummy
  values (see Cheatsheet) before probing.
- The rules test and `cleanup`/`rate_limit` checks run with
  `firebase emulators:exec --project demo-huduma --only firestore "<cmd>"`.
- ~~Not deployed.~~ **Deployed 2026-11-04.** The rules and all 5 functions went
  out with `firebase deploy --only firestore:rules,functions`, and the frontend
  through `main` (`33999d4`, then the lint commit `73301cb`). Ian approved the
  first-run purge of the backlog. Production probes:
  - a non-sample ID returned `INVALID_ARGUMENT "Demo only: use the sample ID number."`;
  - anonymous lists of `sessions`, `appointments` and `rate_limits` returned 403, and `slots` returned 200;
  - headless Chrome found 0 CSP violations on `/` and `/staff`, with the
    banner rendered, while an injected inline script and style were blocked.

  ~~Not exercised: staff Google sign-in~~. Ian confirmed on production on
  2026-11-04 that it works under the new CSP: the Google popup, the
  `staff/{uid}` check on mount, and StaffPending's staff-only `appointments`
  query, which rendered "No pending appointments for today" with no permission
  error. Still not exercised: a full booking with a real email.
- **The Firebase CLI needs `functions/venv`** to discover the Python
  functions. Recreate it with `py -3.14 -m venv functions/venv` and then
  `functions/venv/Scripts/python.exe -m pip install -r functions/requirements.txt`.
  It is gitignored and listed in `firebase.json` `functions.ignore`, so it stays
  out of the upload (7.78 KB packaged).
- **Lint is clean:** 38 problems became 0. `react/prop-types` is off, because
  React 19 ignores propTypes. `useBooking` lives in `context/bookingState.js`.

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
*Done, confirmed 2026-10-29:* `firebase functions:list --json` shows all five
functions ACTIVE on `python312`, and each one's source object has a GCS
`generation` of 2026-10-03 10:18–10:19 UTC (13:18 EAT). That is after this
entry's commit (`6f3d694`, 10:37 EAT), and no `functions/` commit has landed
since. The upload's contents weren't diffed, so it's [HIGH] that a deploy
happened after the fix and [MEDIUM] that it carries it.

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
