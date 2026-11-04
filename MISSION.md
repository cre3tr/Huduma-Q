# Mission: why HudumaQ exists

> Last verified 2026-11-04 against `84cbcf3`. Each claim names its source. A
> claim with no source is marked as inference.

## What it was for

**A hackathon entry with a real-world problem** [HIGH]. Source:
`docs/reflection.md` ("Submitted: 2026-04-29", spec-driven workflow via the
hackathon-guide plugin) and `../haven-ea/context/repo-map.md` row `Huduma-Q`:
"Civic appointment booking for Kenyan Huduma Centres. Shipped for a hackathon."

The problem it targets: national-ID services at Huduma Centres run on
unmanaged walk-in queues where a 10-minute task can take a workday, and
eCitizen "deprecated the document upload/scheduling flow for ID services"
(`docs/scope.md`, "Inspiration & References" and "Goals"). The stated goal is
"real social utility, not a technical demo" plus a demonstration of
spec-driven development as a repeatable workflow (`docs/scope.md`).

## What it is for now

A deployed demo at <https://huduma-q.vercel.app> (HTTP 200, 2026-11-04) and a
public portfolio piece. Inference [MEDIUM], not on record: its remaining value
is as evidence of full-stack delivery (React, Firebase, Python functions,
transactional slot holds). No document says it is kept for that reason.

## What it is not

- Not a government service and not integrated with one: identity is email plus
  an 8-digit ID number, with no IFMIS check; SMS, document upload, walk-in
  queues and multi-centre support were cut (`docs/scope.md`, "Explicitly Cut").
- No obligation: `haven-ea` records no buyer, client or revenue for it
  (grepped `context/goals.md` and `decisions/log.md`; the log's only mentions are
  cleanup items).

## Unknowns

- `[UNKNOWN]` Whether the hackathon produced any result or follow-up. Checked:
  `docs/reflection.md`, CLAUDE.md, BUILD.md.
- `[UNKNOWN]` Whether any Huduma Centre was ever approached. No file says.
- `[UNKNOWN]` Whether the app has ever been used by a real citizen.
