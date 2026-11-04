# Backlog

> Last verified 2026-11-04 against `39bc84f`. **This file is an index.** Detail
> lives in [DEPENDENCIES.md](DEPENDENCIES.md) (DEP-1 to DEP-10),
> [BUILD.md](BUILD.md) and CLAUDE.md "Known Gaps". The repo is public, so
> security findings are not listed here; the owner tracks them privately.

## Blocked on Ian

- [ ] **Finished demo, candidate product, or archive?** [VISION.md](VISION.md)
  Q1. Everything below is optional until this is answered.
- [ ] **Composite index #1 `appointments(date, status)`** is kept because the
  emulator cannot prove it removable (BUILD.md). Removal needs a production test;
  Ian runs the Firestore deploy.
- [ ] **Pre-launch checklist in CLAUDE.md** (Google Form `RATE_FORM_URL`,
  Brevo secrets, Firebase Auth authorised domains) is the April list, kept as
  written. Which items are done in production is `[UNKNOWN]` from the repo
  alone; the 2026-10-03 functions deploy implies the secrets exist
  (BUILD.md).
- [ ] **App Check (reCAPTCHA) for the callable functions.** Needs a reCAPTCHA
  key registered in the Firebase console, then `enforceAppCheck` on the
  functions and the client initialisation. Ian to register the key. Until then
  the per-address and daily limits in `functions/rate_limit.py` are the only
  abuse control on `send_verification_email`.
- [ ] **Two-factor sign-in for staff accounts.** Staff sign in with Google
  only. Enabling 2-Step Verification on the staff Google accounts (or an
  identity-platform MFA policy) is Ian's decision.
- [ ] **Deploy the 2026-11-04 hardening commits.** Rules, functions and
  frontend all changed. The first run of the scheduled purge deletes the
  existing backlog of expired sessions and appointments older than 7 days
  (500 per collection per run), so confirm that is acceptable before
  `firebase deploy`. Vercel must be on the new `frontend/vercel.json`.

## Accepted for the demo

- [x] **Identity is not verified beyond a working email inbox.** By design:
  the ID number and phone are fixed sample values (2026-11-04) and the site
  says it is a demo. Revisit only if the answer to VISION.md Q1 is "candidate
  product".

## Dependencies

- [ ] **PR #15: firebase 12.19.0 to 13.1.0** (major), open since 2026-11-01.
  `gh pr list -R cre3tr/Huduma-Q --state open`. Its branch passes `npm ci` and
  `npm run build` (2026-11-04). Still needs a booking flow run in the
  emulators and a staff login check. See DEP-5 for the `@grpc/grpc-js` constraint
  under firebase.
- [ ] **DEP-4: eslint 10 is blocked** by `eslint-plugin-react` peers
  (DEPENDENCIES.md). Revisit when a release admits eslint 10.
- [ ] Dependency alert status is tracked privately; DEPENDENCIES.md has the
  dated history.

## Bugs and defects

- [ ] **ESLint reports 40 problems over 27 files** (BUILD.md, 2026-10-03,
  before and after the last fix). Re-run `npm run lint` in `frontend/` for the
  current count; not run in this pass.
- ~~**Client-side-only 2-hour gap rule** between one citizen's bookings~~
  resolved 2026-11-04, 918ad49 (enforced in `hold_slot` and `confirm_booking`).
- [ ] **No tests** for any function or page.

## Docs drift (new 2026-11-04)

- [ ] `CLAUDE.md` says "9 pages" in Project Structure; `frontend/src/pages/`
  holds 10 (`ls frontend/src/pages | wc -l`: 10; CheckEmail, ExpiredLink,
  Landing, Review, ServiceSelect, StaffLogin, StaffPending, StaffResolved,
  Success, Verify).
- [ ] `docs/scope.md` says the slot hold is an "8-minute countdown"; `docs/prd.md`
  and `functions/main.py` (`held_until = now + timedelta(minutes=5)`) say 5. The
  8 minutes in the PRD is the missed-appointment grace window.
- [ ] `CLAUDE.md` ends with a dated Dependabot count line (2026-10-29) that is
  no longer current; re-measure rather than read it.
- [ ] `CLAUDE.md` "Current Status (as of 2026-04-29)" and its unticked
  checklist sit above the correction in a parenthesis. A heading rewrite would
  help a cold agent; the file is left untouched here.
- [ ] `docs/spec.md` names Resend for email; the code uses Brevo (already
  flagged in CLAUDE.md).
- [ ] `../haven-ea/context/repo-map.md` row `Huduma-Q` has no live URL or
  remote; the repo is `cre3tr/Huduma-Q`, public.

## Ideas (unprioritised, not commitments)

- ~~A visible "demo" notice on the landing page (VISION.md Q2).~~ resolved
  2026-11-04, 6c967e7.
- A scheduled seed so the slot grid is never empty (CLAUDE.md "Day-of-Demo
  Checklist" has this as a manual step).
- A CI workflow running `npm run lint` and `npm run build`; none exists
  (`.github/` holds only `dependabot.yml`).
