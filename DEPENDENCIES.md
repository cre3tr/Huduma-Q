# Dependency Updates Record

Note: the npm manifest for this repo lives in `frontend/`, not at the root.
This record sits at the repo root because it covers the repo, not the package.

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
