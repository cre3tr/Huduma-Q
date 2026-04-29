# HudumaQ (working title)

## Idea
A citizen-facing scheduling portal for Huduma Centre ID services — book a time slot online, arrive at your time, skip the 6-hour walk-in queue.

## Who It's For
Kenyan citizens who need to replace or apply for a national ID and want to avoid losing a full workday in an unmanaged queue at a Huduma Centre. Secondary user: Huduma Centre staff who need a clean view of incoming scheduled appointments to run a separate, faster intake lane.

## Inspiration & References
- **eCitizen Kenya** (https://accounts.ecitizen.go.ke/en) — the existing government portal. Handles applications and payments but deprecated the document upload/scheduling flow for ID services, creating the exact gap this project fills. The promise that didn't hold.
- **Qminder** (https://www.qminder.com/solutions/government-appointment-scheduling-software/) — reference for clean hybrid queue management UI. Shows what a well-executed scheduled + walk-in system looks like on the staff side.
- **Waitwhile** (https://waitwhile.com/industries/government/) — virtual queue model. Citizens join remotely, show up when it's their turn. Validates the core scheduling concept at scale.
- **Design energy:** Safe and trustworthy — not clinical, not flashy. Clean, precise, minimal. Every state clearly communicated. The visual language of "this will work." Think Gran Turismo dashboard: no unnecessary elements, everything serving a function. Government-adjacent credibility without the government aesthetic.

## Goals
- Give citizens a way to book a specific time slot for ID services — and actually trust it'll be honored
- Eliminate the need to arrive at 7am and leave at 2pm for a 10-minute task
- Build something with real social utility, not a technical demo
- Demonstrate spec-driven development as a complete, repeatable workflow

## What "Done" Looks Like
A working web app demonstrable in two scenarios:

**SC1 — The problem:** Citizen walks in with no appointment. Spends 7 hours waiting for a 10-minute photo session.

**SC2 — The fix:** Citizen visits the landing page. No account creation — just email entry and ID number verification. System opens to service selection (new ID / replace lost ID / collect). Citizen picks a date and time slot. Slot is held for 8 minutes while booking is completed — released automatically if abandoned. Citizen receives email confirmation with appointment code. At the centre, they join a dedicated scheduled intake lane. If they miss their slot: option to join the walk-in queue or reschedule, with anti-double-booking reserve logic preventing conflicts.

Staff side: a dashboard showing the day's scheduled appointments by service type, time, and appointment code — with the ability to mark citizens as served.

## What's Explicitly Cut
- **Walk-in queue management** — walk-ins are already handled on-prem. This system doesn't touch that flow.
- **IFMIS-integrated document verification** — real-time validation against government databases requires API access unavailable for this build. Identity verified via email + ID number only.
- **Document upload** — cut for the same reason. Without IFMIS, it's file storage with no real verification value.
- **SMS notifications** — email only. SMS requires a third-party API and reads as suspicious in Kenya's context.
- **Mobile app** — web app only.
- **Multi-centre support** — scoped to a single Huduma Centre. No multi-location routing.

## Loose Implementation Notes
- **Stack:** React frontend, Python backend. Simple database — nothing over-engineered.
- **Auth:** No account creation. Citizen verifies via email + national ID number matched against a seeded dataset for demo purposes.
- **Slot holding mechanic:** 8-minute countdown. Slot marked "held" in DB when booking starts, auto-released on expiry. Core anti-double-booking mechanism.
- **Reschedule logic:** New slot held before old slot released — prevents a race condition where both slots free up simultaneously.
- **Staff dashboard:** Read-only for demo. Filters by service type, shows appointment code and status (scheduled / served / missed).
- **Email confirmation:** Can be mocked for demo — success screen with appointment code is sufficient if sending isn't feasible in the time window.
