# AGENTS.md

This file provides guidance for AI coding agents working in this repository.

Project overview

- Yuki-no is a GitHub Action that tracks commits in a head repository and opens GitHub Issues in an upstream repository. It’s designed for documentation translation workflows and supports include/exclude glob filters, configurable labels, and optional release tracking.

Tooling and setup

- Node: v22+
- Package manager: Yarn Classic (v1.22 via Corepack)
- Install dependencies (first time or after updates):
  - corepack enable
  - yarn install
- Formatting: Prettier with @trivago/prettier-plugin-sort-imports (import ordering)

Common commands

- Type check only:
  - yarn type-check
- Lint (type-check + Prettier format on all TypeScript files, writes changes):
  - yarn lint
- Run all tests (unit + integration):
  - yarn test
- Run unit tests only (with coverage):
  - yarn test:unit
  - Note: src/tests/mockedRequests.test.ts only runs on CI for the upstream repo (requires CI=true, matching repo, and MOCKED_REQUEST_TEST auth). Locally it will be skipped.
- Run integration tests only:
  - yarn test:integration
- Run a single test (Vitest):
  - By file: yarn vitest --run src/tests/github/core.test.ts
  - By name: yarn vitest --run -t "Should list repository issues with the expected structure"

Local execution (development)

- The action reads configuration from environment variables. For local runs, put the minimal required values in .env and use yarn start:dev:
  - Minimal .env (example placeholders):
    ACCESS_TOKEN=your_pat_here
    HEAD_REPO=https://github.com/head_username/head_repo.git
    HEAD_REPO_BRANCH=main
    UPSTREAM_REPO=https://github.com/your_username/your_repo.git
    TRACK_FROM=head_commit_hash
  - Start locally with .env: yarn start:dev
  - Direct run without .env (provide env explicitly): yarn start
- Important:
  - When running outside GitHub Actions, UPSTREAM_REPO must be set (createConfig.inferUpstreamRepo() throws if GITHUB_REPOSITORY is missing).
  - The action clones the head repo into the OS temp directory and removes any pre-existing directory with the same name in that temp location before cloning (safe; does not touch your project directory).
  - To see info/success logs locally, set VERBOSE=true (log output is gated by the VERBOSE environment variable).

Code style and structure (for contributors and AI agents)

Prefer arrow functions

- Use arrow functions by default for module-level utilities, callbacks, and most helpers.
- Rationale: consistent this semantics, expression-friendly, concise, and easy to compose.
- Exceptions:
  - Class methods: prefer standard method syntax on the prototype.
  - Constructors: must be function/class declarations by nature.
  - Generators: use function\* when needed.
  - Hoisting needed at top-level: when a function must be called before it is defined, a function declaration may be used intentionally.
- Examples:

```ts
// Preferred
export const parseLines = (text?: string): string[] => {
  const t = text?.trim();
  if (!t) {
    return [];
  }
  return t.split('\n').filter(line => line.trim() !== '');
};

// Acceptable when hoisting is necessary
export function bootstrap(config: Config): void {
  // ...
}
```

File/module organization (place detailed implementation at the bottom)

- Organize each file top-down:
  1. Imports (grouped and separated — already enforced by Prettier import order)
  2. Public types and constants (exported)
  3. Public API (exported functions that orchestrate the main flow)
  4. Private/internal helpers (low-level, detailed implementation) — at the bottom
- Keep public surface concise and readable near the top. Push detailed logic, parsing, and utilities to the end of the file.
- Example skeleton:

```ts
// 1) Imports

// 2) Public types
export type SyncResult = { created: number; updated: number };

// 3) Public API
export const syncCommits = async (cfg: Config): Promise<SyncResult> => {
  const commits = await getCommits(cfg);
  const filtered = filterCommits(commits, cfg);
  return applyChanges(filtered, cfg);
};

// 4) Implementation details (bottom)
const getCommits = async (cfg: Config): Promise<Commit[]> => {
  // ...
};

const filterCommits = (commits: Commit[], cfg: Config): Commit[] => {
  // ...
};

const applyChanges = (commits: Commit[], cfg: Config): SyncResult => {
  // ...
};
```

Readability via blank lines

- Use exactly one blank line to separate logical blocks:
  - Between import groups (already handled by Prettier)
  - Between top-level declarations (types, constants, functions, classes)
  - Between logical sections inside a function: after guard clauses, before loops/condition blocks, before return blocks when it improves clarity
- Avoid multiple consecutive blank lines.
- Examples:

```ts
// Good
export const doWork = (items: Item[]): Result => {
  if (items.length === 0) {
    return emptyResult();
  }

  const prepared = prepare(items);

  for (const it of prepared) {
    processItem(it);
  }

  return toResult(prepared);
};

// Avoid
export const doWork = (items: Item[]): Result => {
  if (items.length === 0) return emptyResult();
  const prepared = prepare(items);
  for (const it of prepared) {
    processItem(it);
  }
  return toResult(prepared);
};
```

Control structures (if/for): use block statements

- Always wrap control bodies in braces and place them on their own lines, even for single statements.
- Avoid inline single-statement control flow like `if (x) doThing()` or `for (...) doThing()`; prefer blocks.
- Applies to: if/else, for, for...of/in, while, do...while.
- Rationale: improves readability, safer future edits, cleaner diffs, and easier to add logging.

Examples:

```ts
// Avoid
if (ready) doWork();

for (const f of files) process(f);

// Preferred
if (ready) {
  doWork();
}

for (const f of files) {
  process(f);
}

// Guard clauses still use blocks
if (!items.length) {
  return [];
}
```

Notes on tooling

- Prettier enforces formatting (quotes, trailing commas, import order separation), and we use @trivago/prettier-plugin-sort-imports to keep imports ordered.
- Blank-line usage and arrow-function preference are guidelines, not automatically enforced at the moment.
- If automated enforcement is desired later, consider adding ESLint with:
  - func-style: ["error", "expression"]
  - prefer-arrow-callback: "error"
  - padding-line-between-statements: [...]
- Type safety: Do not use the TypeScript any type. Prefer unknown with narrowing or module augmentation when necessary.

High-level architecture

- Entrypoint (src/index.ts): logs start/end and delegates to app.start().
- Runtime setup (app.ts):
  - createRuntime() builds runtime config from env (defaults for username/email/branch, label presets, release-tracking flags), initializes Git and GitHub clients.
- Synchronization (syncCommitsFlow):
  - getLatestSuccessfulRunISODate() determines a since-boundary from the workflow named "yuki-no". If maybe-first-run is indicated and there are no existing translation issues, it proceeds without a previous-run since filter.
  - getCommits() executes git log on the head branch, converts to Commit objects validated by Zod, then filters by include/exclude globs (picomatch). Invalid track-from values cause an error.
  - lookupCommitsInIssues() uses the search API in chunks (5 commits per query) to avoid duplicates by commit hash present in issue bodies.
  - createIssue() opens issues with configured labels and a commit URL.
- Release tracking (releaseTrackingFlow, optional):
  - For open and newly created issues, getRelease() resolves pre-release/release info per commit hash.
  - updateIssueLabelsByRelease() adds/removes release-tracking labels.
  - updateIssueCommentByRelease() writes a status comment (pre-release/release links). If the repository has no releases at all, a short guidance note is included.
- Key modules:
  - Configuration: src/createConfig.ts (env parsing, defaults, repoSpec inference)
  - Validation: src/validation/env.ts (env schema), src/validation/git.ts (commit schema)
  - Git access: src/git/\* (clone, git log parsing/separators, release discovery utils)
  - GitHub access: src/github/\* (Octokit client with retry/throttling, queries and mutations, commit-hash lookup from issue bodies)
  - Release tracking: src/releaseTracking/\* (comment + label updates based on release info)
  - Utilities: src/utils.ts (typed logging gated by VERBOSE, array helpers, ISO time normalizer)
- Testing:
  - Unit tests under src/tests cover config, git, GitHub, and release-tracking units (Vitest, v8 coverage)
  - Integration tests are located under src/tests/integration and run with vitest.integration.config.ts. They mock GitHub API calls using Nock (no real network calls).
