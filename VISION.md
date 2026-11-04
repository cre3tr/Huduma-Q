# Vision: what HudumaQ could become

> Last verified 2026-11-04 against `84cbcf3`. **"Proposed directions" is a set
> of suggestions by an agent, not decisions.** When Ian answers, record each
> answer and its date under "Decided".

## Decided

What the record says (`docs/scope.md`, `docs/prd.md`, CLAUDE.md "Key Technical
Decisions"):

- Scope is one Huduma Centre, ID services only, email only, web only.
- Citizens have no accounts; a short-lived session document is the identity.
- Slot holds expire lazily on the client and inside the `hold_slot` transaction.
- Email goes through Brevo, not Resend.
- No forward direction beyond the hackathon is recorded.

## Proposed directions (suggestions, not decisions)

1. **Freeze it as a documented demo (suggestion, recommended).** Keep it live,
   take dependency patches, and say plainly on the landing page that it is a
   demonstration. Cost: near zero.
2. **Run a pilot conversation with one Huduma Centre (alternative).** The
   product is only real if a centre will run a scheduled lane. That is a
   relationship question, not an engineering one, and it would reopen the cuts in
   `docs/scope.md` (identity checking, SMS).
3. **Archive it (alternative).** As done with kairi-demo and the-thirtieth.
   Stops dependency churn on a repo nobody is building.
4. **Reuse the slot-hold and booking core for Cartman clients (alternative).**
   The transactional hold-then-confirm flow suits Kenyan SMB appointment
   booking (clinics, salons). It would need real identity and payment decisions.

## Questions for Ian

1. **Is HudumaQ a finished hackathon entry, or a candidate product?** Nothing
   on file says. Direction 2 only applies to the second.
2. Should the live site stay up as a public demo?
   A visible "demo" notice, or taking it down,
   follows from this.
3. Was there a hackathon outcome worth recording in `docs/reflection.md`?
4. Is the dependency upkeep (PR #15 firebase 13 and the monthly Dependabot
   cycle) worth it for a dormant demo?

## Critique (agent's view, offered as pushback)

- **Its documentation tells two stories.** CLAUDE.md still leads with an April
  "Current Status" and an unticked pre-launch checklist, with the correction as
  a parenthesis. A cold agent reads the stale version first.
- **A demo that needs a daily hand-run script is not a demo you can leave up.**
  Slots cover only today and tomorrow and `seed/seed.py` must be re-run
  (CLAUDE.md "Day-of-Demo Checklist"), so unattended it will show an empty
  grid after two days. Whether it does today is `[UNKNOWN]`.
- **The most valuable part is the one that is most demo-shaped.** The booking
  flow works, but the identity step is email plus an 8-digit number with no
  verification against anything (`docs/scope.md`). Presenting it to a real
  centre would make that the first question.
