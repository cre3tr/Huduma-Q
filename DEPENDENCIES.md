# Dependency Updates Record

Note: the npm manifest for this repo lives in `frontend/`, not at the root.
This record sits at the repo root because it covers the repo, not the package.

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
