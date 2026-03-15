# Phase 1 Main Patch Mapping

This note records how the approved phase-1 intent from `main` was mapped into the current `next` layout.

## Mapping

- Branch-aware commit scan
  - `main:src/git/getCommits.ts`
  - `next:packages/core/utils-infra/getCommits.ts`
  - Replaced the fixed `origin/main` ref with `origin/${config.headRepoSpec.branch}` so the current head repo branch drives commit comparison.

- MAYBE_FIRST_RUN runtime wiring
  - `main:action.yml`
  - `next:action.yml`
  - Added the `Check if first run` composite-action step and forwarded `MAYBE_FIRST_RUN` into the runtime env.
  - `main:src/createConfig.ts`
  - `next:packages/core/createConfig.ts`
  - `next:packages/core/types/config.ts`
  - `next:packages/core/index.ts`
  - Added `config.maybeFirstRun` in the current config shape and passed it into the core orchestration path.

- Latest successful run stabilization
  - `main:src/github/getLatestSuccessfulRunISODate.ts`
  - `next:packages/core/utils-infra/getLatestSuccessfulRunISODate.ts`
  - Switched to querying completed runs, filtering successful `yuki-no` runs, and preserving the first-run fallback when `MAYBE_FIRST_RUN=true`.
  - Instead of copying `main` issue helpers verbatim, the `next` implementation uses the existing GitHub client plus a local tracked-issue existence check that matches current label/hash semantics.
  - E2E-only timestamp mocking from `main` was intentionally deferred to phase 2.
