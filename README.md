# HudumaQ

> Last verified 2026-11-04 against `84cbcf3`, clean tree on `main`.

A two-sided web app for booking ID-service appointments at Kenyan Huduma
Centres. Citizens pick a time slot through an emailed magic link (no account);
staff verify arrivals on a live dashboard. React frontend on Vercel, Python
Cloud Functions and Firestore on Firebase, email through Brevo (stack source:
`frontend/package.json`, `firebase.json`, `functions/requirements.txt`). Built
for a DevPost hackathon, submitted 2026-04-29 (`docs/reflection.md`).

## Status

**Deployed hackathon demo, not under active development.** Live at
<https://huduma-q.vercel.app>: `/` returned HTTP 200, and an unknown path
`/zzz-nonexistent` also returned 200 (the SPA rewrite in `frontend/vercel.json`,
expected). Since August 2026 the commits are dependency updates and docs
(`git log`: 48 commits in all; latest `84cbcf3`, 2026-11-03). Slots are seeded
by hand and cover only today and tomorrow (`CLAUDE.md`), so a booking attempt
today needs `seed/seed.py` to have been run recently; whether the live data is
seeded is `[UNKNOWN]`, not checked. Open: PR #15 (firebase 12 to 13). The repo
is **public**.

## Quick start

```bash
cd frontend && npm install
npm run dev        # vite; connects to local Firebase emulators in DEV
npm run build      # vite build
npm run lint       # eslint .
```

Copy `frontend/.env.example` to `.env` and fill the six `VITE_FIREBASE_*`
values. Functions and Firestore run in the emulators
(`firebase emulators:start --only functions,firestore`, ports in
`firebase.json`); the cheatsheet and dummy-secret recipe are in
[BUILD.md](BUILD.md). There is no test suite.

## Where everything lives

| Question | File |
|---|---|
| Why does this exist? | [MISSION.md](MISSION.md) |
| What could it become? Questions for Ian | [VISION.md](VISION.md) |
| What is open | [BACKLOG.md](BACKLOG.md) |
| Reporting a vulnerability | [SECURITY.md](SECURITY.md) |
| How it is built | [ARCHITECTURE.md](ARCHITECTURE.md) |
| Stack, decisions, known gaps, env vars | [CLAUDE.md](CLAUDE.md) |
| Issues hit and resolutions, cheatsheet | [BUILD.md](BUILD.md) |
| Dependency decisions, DEP-1 to DEP-10 | [DEPENDENCIES.md](DEPENDENCIES.md) |
| Product requirements and technical spec | [docs/prd.md](docs/prd.md), [docs/spec.md](docs/spec.md) |
| Scope and explicit cuts | [docs/scope.md](docs/scope.md) |
| Production deploy guide | [docs/deploy.md](docs/deploy.md) |
| Hackathon reflection | [docs/reflection.md](docs/reflection.md) |
| Build curriculum notes | `docs/curriculum/` |

## Traps a cold start hits

1. **`CLAUDE.md` opens with an April status ("Current Status as of
   2026-04-29") and a pre-launch checklist.** A correction note says the app is
   deployed; the checklist is kept as written. Trust BUILD.md and
   DEPENDENCIES.md for later state.
2. **`docs/spec.md` names Resend for email; the code uses Brevo.**
   `docs/deploy.md` and `functions/emails.py` are the source of truth
   (CLAUDE.md "Stack").
3. **The Firestore emulator does not enforce composite indexes**, so it cannot
   show that an index is removable (CLAUDE.md "Known Gaps").
4. **Deploys are manual.** The frontend ships with a push to Vercel; functions
   and Firestore rules/indexes are deployed by Ian with the Firebase CLI or
   console (BUILD.md, `docs/deploy.md`).
