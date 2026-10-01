# Dependency Updates Record

Note: the npm manifest for this repo lives in `frontend/`, not at the root.
This record sits at the repo root because it covers the repo, not the package.

## DEP-6: eslint-plugin-react-hooks 5.2.0 → 7.1.1 — one new finding, fix deferred — 2026-10-01
**Context:** Dependabot #11 was green, but `vite build` never runs lint, so
green proved nothing about this package. v7 adds the React-Compiler rules and
pulls in 26 packages (`@babel/core` toolchain, `hermes-parser`, `zod`). None
of them appears in `npm audit`. Its 5 hits are the known grpc chain plus
fflate.
**Decision (Ian, 2026-10-01):** Take v7 now, and defer the one real finding.
Lint over the same 27 files goes **40 → 41**. The only new rule hit is
`react-hooks/set-state-in-effect` at `src/components/CountdownTimer.jsx:14`.
That's a synchronous `setTimeLeft(calculateTimeLeft())` at the top of the
effect, an extra render whenever `expiresAt` changes.
**Deferred fix, ready to apply.** Keep `now` in state
(`useState(() => Date.now())`), have the interval only call
`setNow(Date.now())`, and compute `timeLeft` from `expiresAt` and `now`
during render. Fire `onExpire` from the interval when it reaches 0, as
today. **Why deferred:** this timer drives the booking-hold expiry
(`Review.jsx:106` → `onExpire`), and the Claude Browser pane throttles
`setInterval`, so the change can't be verified there. Verify it in a real
browser by holding a slot and letting it expire.
**Verified on:** main — see the commit adding this entry. `npm ci` 0 from
the grafted lockfile (10 `libc` fields kept), build 0, CSS class-identical
(173, preflight present).
**Confidence:** HIGH on the counts (per-rule JSON diff over the same 27 files).

## DEP-5: `@grpc/grpc-js` 1.9.16 under firebase — blocked upstream, not overridden — 2026-10-01
**Context:** 2 advisories (high + low) were filed 2026-10-01, both fixed in 1.13.6.
The path is `firebase@12.19.0 → @firebase/firestore@4.17.2 → @grpc/grpc-js@1.9.16`.
4.17.2 is the latest firestore and declares `~1.9.0`, a tilde range that can
never reach 1.13.
**Decision:** Accepted and recorded. **No `overrides` entry.** Forcing a minor
jump of firebase's own transport layer is a different risk class from a pure-JS
pin. **It does not ship, measured:** `grep -l 'grpc-js\|@grpc'` over the 4
built JS chunks at `2d73ee2` returns 0. Controls `webchannel` and
`firestore.googleapis.com` each hit 1 chunk. The only "grpc" strings in the
bundle are Firestore's own GRPC status codes and `grpcFlowControlWindow`, not
the Node package.
**Recheck trigger:** a `@firebase/firestore` release whose grpc-js range admits
≥ 1.13.6. Then `npm update` alone should clear it.
**Verified on:** main @ `2d73ee2` — 3 open alerts: these 2, plus fflate (DEP-3).
**Confidence:** HIGH on both the block (manifest range read from the
registry) and non-shipping (bundle grep, with a positive control).

## DEP-4: eslint 10 — blocked by eslint-plugin-react — 2026-10-01
**Context:** Dependabot #10 (eslint 9.39.4 → 10.11.0) failed `npm install` with
ERESOLVE. `eslint-plugin-react@7.37.5` is the latest, and it peers
`eslint: ^3 || … || ^9.7`.
**Decision:** Don't take eslint 10. A scoped Dependabot `ignore` on
`eslint >= 10.0.0` in `.github/dependabot.yml`. #10 closed.
**Recheck trigger:** an `eslint-plugin-react` release whose peer admits `^10`.
Remove the ignore and bump both together, as coupled majors in one install.
**Verified on:** main — see the commit adding this entry.
**Confidence:** HIGH — peer range read from the registry 2026-10-01.

## DEP-3: fflate `unzipSync` DoS (GHSA, fixed in 0.8.3) — accepted, not fixed — 2026-09-05

**Context:** Dependabot alert #37, medium severity, `fflate@0.8.2`, `scope:
runtime`, "unzipSync can enter an infinite loop when parsing malformed ZIP64
archives." Arrives via `jspdf@4.2.1 → fflate` (`npm ls fflate` — one path, no
alternates). `jspdf` is genuinely used here for client-side PDF generation
(appointment confirmations), so GitHub's `runtime` scope call is correct.

**Decision:** do not bump. Traced every reference to `fflate` inside jsPDF's
actual bundled code — both `dist/jspdf.es.js` (browser) and
`dist/jspdf.node.js` — and every single one is `zlibSync`
(`jspdf.es.js:52,13309,14857,14878`; same shape in the node bundle).
`zlibSync` is **compression**, used to shrink outgoing PDF stream data.
`unzipSync` — the function this CVE is actually about, which parses an
**incoming** ZIP64 archive and can infinite-loop on malformed input — is never
imported or called anywhere in jsPDF. This repo's own `src/` also never calls
`fflate` directly (`grep -rn "unzipSync\|fflate" src/` → zero hits). The
vulnerable function is present in the dependency tree; the vulnerable code
path is not reachable from anything this app does.

**Consequences:** no risk today. If jsPDF ever starts using `unzipSync`
internally (e.g. a future font-embedding feature that unpacks a font
collection), or a future dependency reaches it some other way, this
conclusion needs re-deriving, not assumed to still hold — check `npm ls
fflate` and re-grep jsPDF's bundle for `unzipSync` before trusting this entry
again per Iron Law VI. The alert stays open on GitHub; this is a documented,
deliberate accept, not an oversight.

**Verified on:** `frontend/node_modules/jspdf@4.2.1` — 2026-09-05.
**Confidence:** HIGH — read directly from jsPDF's own bundled source, both
browser and Node builds; not inferred from the advisory or the package name.

## DEP-2: vite 5 → 8 with @vitejs/plugin-react — 2026-08-03

**Context:** `@vitejs/plugin-react` 6 peer-requires `vite ^8`, and plugin-react 4
rejects vite 8, so the two cannot move independently — Dependabot raised them as
separate PRs, each of which failed `npm ci` with `ERESOLVE`. vite 5 also has no
patched release for GHSA-fx2h-pf6j-xcff, GHSA-v6wh-96g9-6wx3 or
GHSA-4w7w-66w2-5vf9, so a major bump was the only available fix.

**Decision:** one commit — `vite ^5.4.10 → ^8.2.0` and
`@vitejs/plugin-react ^4.3.3 → ^6.0.5`.

**Consequences:** the build now runs vite 8 (Rolldown). No `manualChunks`
conversion was needed. Built CSS verified unchanged in substance — preflight
present, utilities and `sm:`/`md:` variants intact.

**Verified on:** main @ `7e142be` — 1 open alert.
**Confidence:** HIGH — `npm run build` exit 0; CSS checked by grepping for real
utility classes, not by file size.

## DEP-1: in-range security updates — 2026-08-03

**Context:** eight packages with open advisories, all already inside existing
caret ranges — no manifest edit required.

**Decision:** lockfile-only. `websocket-driver 0.7.4 → 0.7.5` (the **critical**,
reachable at runtime, arriving via `firebase → @firebase/database →
faye-websocket`), `dompurify 3.4.1 → 3.4.13`, `protobufjs 7.5.6 → 7.6.5`,
`@grpc/grpc-js 1.9.15 → 1.9.16`, `react-router-dom 7.14.2 → 7.18.2`, plus
`js-yaml`, `brace-expansion` and `@babel/core`.

**Consequences:** the `react-router-dom` bump cleared six of seven react-router
alerts. **The seventh cannot be fixed and should not be retried** —
GHSA-qwww-vcr4-c8h2 patches at `react-router@8.3.0`, but there is no
`react-router-dom@8`: v7 merged the two packages and `react-router-dom` is now a
re-export shim depending on `react-router@7.18.2`. Closing it means migrating
imports to `react-router@8` directly, which is a repo-wide mechanical change with
a real test burden. Accepted, not forgotten.

Separately, `npm run lint` exits 1 both before and after with 39 pre-existing
`react/prop-types` errors. Unrelated to this work and left untouched.

**Verified on:** main @ `ec6b2d6` — build exit 0.
**Confidence:** HIGH — verified against a clean build.
