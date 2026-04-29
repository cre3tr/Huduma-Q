# HudumaQ — Product Requirements

## Problem Statement

Kenyan citizens who need national ID services at Huduma Centres routinely spend 6+ hours in unmanaged walk-in queues for a process that takes under 10 minutes. There is no functional online scheduling option — eCitizen Kenya attempted and deprecated it, leaving the gap wide open. HudumaQ fills that gap with a slot-booking portal that guarantees citizens a specific time to arrive, and gives Huduma Centre staff a clean view of incoming scheduled appointments to run a dedicated, faster intake lane.

---

## User Stories

### Epic: Citizen Identity Verification

- **As a citizen who needs ID services**, I want to confirm who I am without creating an account, so that I can start booking without bureaucratic friction.
  - [ ] Landing page shows input fields for: first name, last name, email address, national ID number, and phone number
  - [ ] Submitting the form sends a verification email with a time-limited link to the provided address
  - [ ] Page immediately transitions to a "Check your email" state after submission — no other action is available
  - [ ] The verification link expires after 15 minutes
  - [ ] Clicking an expired link shows a clear error message and instructs the citizen to restart from the beginning
  - [ ] There is no resend option — expired sessions require a full restart

- **As a citizen who submitted the verification form**, I want to know the email is on its way and what to do next, so that I'm not left staring at a blank screen.
  - [ ] "Check your email" screen shows the email address the link was sent to
  - [ ] Screen clearly states the link expires in 15 minutes
  - [ ] No further action is possible on this screen — it is a waiting state only

---

### Epic: Service Selection and Slot Booking

- **As a verified citizen**, I want to select the ID service I need and pick a time slot, so that I can secure a guaranteed appointment without standing in a walk-in queue.
  - [ ] Clicking the verification link opens directly to the service selection screen
  - [ ] Three service cards are displayed: **New ID Application**, **Replace Lost ID**, **Collect ID**
  - [ ] Each service card displays what the citizen needs to bring or prepare for that service
  - [ ] Selecting a card collapses the other two cards
  - [ ] The selected card pre-populates the citizen's info from the verification step (first name, last name, ID number, phone number)
  - [ ] The slot display appears on the same screen immediately below the selected card — no page navigation
  - [ ] A bold, prominent message informs the citizen they have **5 minutes** to complete booking once a slot is selected
  - [ ] If 5 minutes expire before booking is confirmed, the held slot is released and the citizen must restart from the verification step

- **As a verified citizen choosing a slot**, I want to see which times are available for my selected service, so that I can pick a slot that works for me without guessing.
  - [ ] Slots are displayed one day at a time, from 9:00 AM to 4:00 PM
  - [ ] Slot duration adapts to the selected service: **20 minutes** for New ID Application, **10 minutes** for Replace Lost ID, **5 minutes** for Collect ID
  - [ ] Available slots are shown in **green**
  - [ ] Unavailable slots (taken by other citizens, or within 2 hours of the citizen's own existing appointment) are shown in **black**
  - [ ] Citizens can navigate between today and tomorrow — no booking beyond one day in advance
  - [ ] If a citizen already has an active appointment, any slot within a 2-hour window of that appointment shows as black
  - [ ] A citizen may hold multiple bookings as long as no two are within 2 hours of each other
  - [ ] When two citizens attempt to book the same slot simultaneously, the first submission wins — the other citizen's slot turns black

- **As a verified citizen mid-booking**, I want to review my details before confirming, so that I can catch any errors before the appointment is locked.
  - [ ] Review screen shows: first name, last name, national ID number, phone number, selected service, booked date, booked time, and centre location
  - [ ] Centre location is pre-populated (single fixed Huduma Centre for demo) and is not an editable field
  - [ ] A clear confirm button is visible
  - [ ] Confirming the booking locks in the appointment and triggers the confirmation flow

---

### Epic: Booking Confirmation

- **As a citizen who just confirmed a booking**, I want immediate on-screen confirmation and a record I can keep, so that I trust my appointment is real and I know exactly what to do on the day.
  - [ ] A success screen appears immediately after confirming
  - [ ] Success screen displays: service type, date, time, and centre location
  - [ ] Success screen includes a **calendar link** (to add the appointment to the citizen's calendar)
  - [ ] Success screen includes a **Download PDF** button
  - [ ] The PDF is a formatted appointment slip containing: citizen first name, last name, national ID number, service type, date, time, and centre location
  - [ ] A confirmation email is sent simultaneously to the citizen's email address
  - [ ] The confirmation email contains the same details and the same calendar link and PDF download option

---

### Epic: Missed Appointment Handling

- **As a citizen who missed their scheduled slot**, I want to know I missed it and understand my options clearly, so that I can decide what to do without having to contact anyone.
  - [ ] The system automatically detects a missed appointment when the 8-minute grace window expires without staff verification — no manual staff action required
  - [ ] A courteous missed slot email is sent automatically to the citizen
  - [ ] The email acknowledges the citizen may have been physically present but outside the window
  - [ ] The email presents two clear options:
    - **Join the walk-in queue** — informational text directing the citizen to the walk-in counter; no system action
    - **Reschedule** — a direct link back to the landing page to start a fresh booking flow
  - [ ] The missed appointment is automatically moved to the Resolved view on the staff dashboard

---

### Epic: Staff Dashboard — Pending Appointments

- **As a Huduma Centre teller**, I want to see today's scheduled appointments and verify citizens as they arrive, so that I can process scheduled visitors quickly through a dedicated intake lane.
  - [ ] Staff access the dashboard via a login screen requiring credentials and a Huduma-specific tag (pre-seeded for demo)
  - [ ] Dashboard opens to the **Pending** view by default
  - [ ] Pending view lists today's scheduled appointments sorted by time, earliest first
  - [ ] Each row shows: date, time, service type, citizen first name, last name, national ID number, phone number, and an action item
  - [ ] Staff can verify a citizen's arrival — this action:
    - Generates a unique alphanumeric appointment code that encodes the service type
    - Displays the appointment code on screen (readable to citizen or read aloud by staff)
    - Sends the appointment code to the citizen's email address simultaneously
  - [ ] The citizen's appointment grace window is **8 minutes** from their booked time
  - [ ] If the 8-minute window expires without staff verification, the system automatically marks the appointment as missed and moves it to Resolved — no staff action needed
  - [ ] Staff cannot reschedule or cancel appointments from the dashboard

---

### Epic: Staff Dashboard — Resolved Appointments

- **As a Huduma Centre teller**, I want to view completed and missed appointments for the day, so that I have a clear record of what's been handled.
  - [ ] A **Resolved** view is accessible from the dashboard — separate from Pending
  - [ ] Resolved view displays completed (served) and missed appointments
  - [ ] Resolved view is read-only — no actions available
  - [ ] A rate experience email is sent automatically when an appointment moves to Resolved
  - [ ] The rate experience email links to a short form with two fields:
    - **Wait time** — how long did it take to get served? (numeric input, in minutes)
    - **Issues / suggestions** — open free-text field

---

## What We're Building

The complete two-sided web app covering both the citizen booking journey and the staff management view:

1. **Citizen verification flow** — identity entry, 15-min TTL email link, "check your email" waiting state, expired link error
2. **Service selection** — dynamic card interaction, service-specific info, pre-populated citizen details
3. **Slot booking** — green/black slot display, service-specific slot durations (20/10/5 min), day navigation (today + tomorrow), 2-hour gap rule, 5-minute booking hold, race condition handling (first submission wins)
4. **Review and confirm** — pre-populated review screen, single fixed location, confirm action
5. **Success state** — on-screen confirmation, calendar link, PDF appointment slip download, confirmation email
6. **Missed appointment automation** — 8-minute grace window, automatic missed detection, courteous missed slot email with walk-in and reschedule options
7. **Staff login** — credential + Huduma tag authentication, pre-seeded for demo
8. **Staff pending view** — sorted appointment list, citizen details per row, verify action, appointment code generation (on screen + email)
9. **Staff resolved view** — read-only history, automatic rate experience email with wait time + free text form

---

## What We'd Add With More Time

- **Real-time slot refresh** — slots update live as other citizens book, no page reload required
- **Citizen appointment history** — returning citizens can view their past and upcoming bookings
- **Email resend option** — a way to re-send the verification link without a full restart
- **QR code on the PDF** — faster check-in at the centre by scanning instead of reading out details
- **Analytics view for centre managers** — appointment volume by service type, peak hours, show-up rates
- **Multi-centre support** — location selection for citizens, separate dashboards per centre
- **IFMIS integration** — real identity verification against government databases when API access is available
- **SMS notifications** — alternative to email for citizens without reliable inbox access (pending trusted SMS provider)
- **Walk-in queue integration** — connecting the scheduled lane to the physical walk-in management system

---

## Non-Goals

- **Walk-in queue management** — walk-ins are handled on-prem. This system does not touch the walk-in flow in any way.
- **IFMIS document verification** — real-time validation against government databases requires API access unavailable for this build. Identity is collected, not verified.
- **Document upload** — without IFMIS, file uploads have no verification value and are cut entirely.
- **SMS notifications** — requires a third-party API and reads as suspicious to Kenyan users. Email only.
- **Mobile app** — web app only. Responsive design may be considered but a native app is out of scope.
- **Multi-centre support** — single Huduma Centre for the demo. No location routing or multi-site logic.

---

## Open Questions

- **Calendar link format:** Google Calendar link, ICS file download, or both? Likely an `.ics` file covers the most cases — confirm at `/spec`. Can wait until then.
- **Rate experience form hosting:** Is the feedback form a page within the app, or an embedded external form tool? Needs a decision at `/spec` — affects what gets built.
- **Pre-seeded demo data:** How many test citizen records are in the seeded dataset, and what format are they? (Name + ID number at minimum.) Needs a decision before `/spec` to inform data design.
- **Slot view layout:** Does the day view show all slots from 9 AM to 4 PM in a single scrollable list, or is there a different layout? Can decide at `/build`.
