# Process Notes

## /scope

- **Idea origin:** Personal experience — 6+ hours at Huduma Centre just to get a photo taken for an ID replacement. The DL process had scheduling/express service; the ID side had nothing.
- **How idea evolved:** Started as a general scheduler, sharpened into a two-path system (walk-in vs. remote), then cut further when IFMIS dependency and walk-in management were recognized as out of scope. Final form: citizen-facing slot booking portal with dedicated scheduled intake lane.
- **Key pushback moments:** Ian identified that eCitizen already tried document upload for IDs and deprecated it — reframing the project from "novel idea" to "fix what the government proved was needed but abandoned." Also cut walk-in management himself when prompted to scope cut.
- **What resonated:** The SC1 vs SC2 demo framing. The 8-minute slot hold mechanic (came from Ian unprompted — smart, concrete, shows systems thinking). The "safe, trustworthy, excited" design brief.
- **References that landed:** eCitizen as the foil (he used it, it failed him). Qminder and Waitwhile acknowledged but not deeply engaged with — Ian had a clear vision before seeing them.
- **Deepening rounds:** 1 round. Surfaced platform (web), design emotional brief (safe/trustworthy/excited), confirmation method (email over SMS), and the full SC1/SC2 demo narrative with the slot hold and reschedule mechanics. The extra round materially improved the scope doc — the demo scenarios and 8-minute hold mechanic came entirely from that round.
- **Active shaping:** Ian drove the direction strongly. Cut walk-in management himself. Identified IFMIS as a blocker unprompted. Proposed the 8-minute hold mechanic without prompting. The SC1/SC2 framing was entirely his. Minimal passive acceptance — most of the key scope decisions came from him.

## /onboard

- **Technical experience:** Intermediate. Python + React (full-stack). Not a beginner, but hasn't shipped a lot of complete projects.
- **Learning goals:** Wants to understand how to break a project into a spec and build module by module. The process itself is the prize, not just the app.
- **Creative sensibility:** Precision simulation games (Gran Turismo, Forza), conscious alternative trap (Joyner Lucas, Jaden), Westworld. Strong social conscience around Africa and extractionist systems. Clean aesthetic + depth + purpose.
- **Prior SDD experience:** Has done UI/UX mockups and schemas before — so the planning instinct is there. New to formalized end-to-end spec-driven development.
- **What brought them here:** Frustrated with the idea-to-tangible-thing gap. Curious about SDD specifically. Tech Support background gives strong intuition for UX pain points.
- **Energy/engagement:** Focused, direct, thoughtful. Not here to mess around — has a specific thing they want to learn.

## /prd

- **Key additions vs scope doc:** Phone number added as a collected field (not verified). Two distinct timers clarified: 5-minute booking hold (online session) vs 8-minute grace window (physical arrival). Service-specific slot durations surfaced (20/10/5 min) — a significant detail not in scope. Day navigation window pinned to one day in advance. Appointment code clarified as staff-side generated and alphanumeric/service-encoded, not shown to citizen during booking.
- **"What if" moments that landed:** The 2-hour gap rule for multiple bookings (Ian defined it, not prompted). The slot race condition (first submission wins). The missed slot auto-detection (Ian wanted zero friction — no staff action needed). The distinction between the 5-min booking hold and the 8-min grace window (Ian corrected a misread from the scope doc).
- **Pushback / strong opinions:** Ian redirected the walk-in option in the missed slot email — it's informational only, not a system action. Held firm on staff dashboard being read-only (no reschedule/cancel). Wanted automatic triggers everywhere to reduce friction.
- **Scope guard moments:** Location field stayed as pre-populated single centre (Ian acknowledged multi-centre is the real need but scoped it as future). Rate experience form kept minimal (two fields only). No resend for expired verification links — deliberate reset-by-design.
- **Deepening rounds:** 2 rounds. Round 1 surfaced: slot duration variance by service (20/10/5 min), appointment code format, staff inability to reschedule/cancel, service card content (what to bring), rate experience form structure. Round 2 surfaced: day-by-day slot navigation with one-day-ahead limit, PDF content (clean appointment slip), walk-in option as informational only, the Devpost wow moment as SC1/SC2 contrast, race condition resolution (first submission wins). Both rounds materially improved the PRD — round 1 in particular added a structurally significant requirement (slot duration by service type).
- **Active shaping:** Ian drove requirements throughout. Corrected the timer distinction (5-min vs 8-min) without prompting. Defined the 2-hour gap rule for multiple bookings independently. Framed the "wow moment" as a human contrast (knowing where you're going vs watching a friend wait 4+ hours) rather than a technical feature — clear that he understands the product story. Minimal passive acceptance.

## /spec

- **Stack decisions:** React + Vite (frontend), Firebase full suite (Firestore + Auth + Cloud Functions Python 3.12), Vercel (frontend hosting), Cloudflare (DNS/CDN), Resend (email — chosen over SendGrid after confirming SendGrid killed free tier May 2025), jsPDF (client-side PDF), Google Forms (rate experience — zero build effort).
- **Key architectural decisions:** (1) Lazy slot expiry — no background sweeper for holds, client-side `heldUntil` check instead. (2) No Firebase Auth for citizens — short-lived Firestore `sessions` doc as identity (magic link flow). (3) Google Forms for rate experience — Ian confirmed immediately, no discussion needed. (4) Citizen ID validation: simplified from seeded dataset to 8-digit format check only — Ian's insight that Kenyan ID numbers are sequential made a seeded lookup unnecessary.
- **Firebase plan:** Blaze required regardless (Spark blocks outbound network calls). Ian accepted this once explained that hackathon-scale usage stays within free quotas.
- **What Ian was confident about:** Stack direction (React + Python + Firebase) — came in with this already. Google Forms decision was instant. Simplifying citizen ID validation was his idea.
- **What Ian was uncertain about / asked questions:** Cloud Function usage limits — raised proactively, not prompted. This shows systems thinking. Resolved by explaining Blaze free tier and proposing lazy expiry to reduce scheduled function footprint.
- **Deepening rounds:** 0 rounds chosen. Ian moved through each architecture section with "OK" or "Sounds good" — decisive and confident. No deepening needed; the mandatory phase surfaced the one meaningful open question (rate experience form) and one smart simplification (ID validation).
- **Active shaping:** Ian simplified citizen ID validation himself (sequential 8-digit numbers → format check only, no seeded dataset). Raised Cloud Function cost concern proactively. Otherwise deferred to proposed architecture — appropriate for someone learning the SDD workflow rather than asserting full technical ownership.

## /build

- **Build mode:** Autonomous. Full checklist executed in a single session.
- **What was built:** All 5 Cloud Functions (send_verification_email, hold_slot, confirm_booking, verify_arrival, sweep_missed), all 9 pages (citizen + staff flows), all 4 components, BookingContext, and all lib utilities (firebase.js, auth.js, slots.js, appointments.js, pdf.js, ics.js). Firestore security rules, composite index config, and seed script all complete.
- **Email provider switch mid-build:** spec.md specified Resend; implementation switched to **Brevo** (sib_api_v3_sdk) after confirming Brevo's free tier (300/day) covers demo volume. All email logic in `functions/emails.py`. Resend was never implemented.
- **Key bug encountered — 401 Unauthorized from Brevo:** `send_verification_email` returned HTTP 500 in production. Root cause: BREVO_API_KEY in Firebase Secret Manager was invalid. Complicated by a second issue: `functions/.env` had a conflicting plain env var `BREVO_API_KEY` that caused a "Secret environment variable overlaps non-secret environment variable" deploy error. Resolution: cleared `.env`, re-deployed, updated Secret Manager with the correct key from Brevo dashboard.
- **Debugging 2nd gen Cloud Functions:** Firebase CLI (`firebase functions:log`) only surfaces admin audit events for 2nd gen (Cloud Run) functions — not Python execution logs. Actual stderr/stdout goes to Google Cloud Logging. This wasn't documented anywhere obvious; took a few wrong turns before landing on `console.cloud.google.com/logs`.
- **Lazy initialization pattern:** Module-level Brevo SDK client rewrote to lazy init (`_get_api()`) to ensure `BREVO_API_KEY` is available at call time, not at container startup.
- **Feature additions during/after build:** (1) Past-time slot blocking — client-side in SlotGrid (filter by `isPast()`), server-side in `hold_slot` transaction (parse slot datetime in EAT, compare to `datetime.now(nairobi_tz)`). (2) Specific error message for past-slot attempts in ServiceSelect.jsx. (3) 25-second auto-logout on Success page via `resetBooking()` in BookingContext. (4) Full UI redesign to "Claude design" aesthetic: clean gray-50 backgrounds, white cards with `rounded-2xl shadow-sm`, HQ brand mark, sticky staff header.
- **What Ian drove:** Identified the BREVO_API_KEY conflict from the error message. Pushed for the specific past-slot error message vs generic retry copy. Requested the 25-second auto-logout (described the kiosk scenario without prompting). Requested the UI redesign by name ("Claude design").
- **Vercel auto-deploy gap:** Frontend changes were local only — not pushed to git. Vercel deploys from git. UI and logic fixes weren't live until `git push`. Reinforced: local file edits ≠ deployed.

## /reflect

- **What was completed:** Full two-sided web app matching the PRD. Every epic has a corresponding page and at least one Cloud Function. Email flow works end-to-end (verified via Brevo dashboard). Staff Google OAuth + Firestore staff check working. PDF and ICS generation client-side. Slot seeding script configured with real staff UID.
- **What was cut / remains pre-launch:** Google Form for rate experience not created yet. Functions not deployed to Firebase (Blaze plan required). Frontend not pushed to Vercel yet. `.env.example` missing from `frontend/`. Firestore composite index needs to be built in console before going live.
- **Biggest learning moment:** The gap between "code written" and "deployed and working." Three separate times something was "done" that wasn't actually live: (1) lazy Brevo init (code fix, not deployed), (2) past-slot UI filter (file edited, not pushed to git), (3) API key itself (code correct, secret wrong). Spec-driven development gets you to correct code fast — deployment is its own discipline.
- **Spec-driven payoff:** Every component was already named and specced before writing code. Build time was almost entirely execution, not decision-making. The process notes show 0 deepening rounds at `/spec` — Ian came in confident, and the spec held. No major re-architecting happened during build.
- **What would be different with more time:** Real-time slot refresh (Firestore `onSnapshot` on SlotGrid), QR code on the PDF, multi-centre support, proper test coverage (currently zero automated tests).
- **What Ian is taking away:** A repeatable workflow from idea → spec → working app. The feeling of shipping something with real social utility. Concrete experience with Firebase Cloud Functions, Secret Manager, and the 2nd gen logging quirks that aren't in the docs.
