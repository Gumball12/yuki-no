# AGENTS.md

This file provides guidance to LLM/AI coding agents working with this repository. It is agent‑agnostic and compatible with commonly used agents (e.g., Claude Code, Gemini CLI, Codex CLI, Cursor, Warp, Cline).

## 1. Purpose

Concise, actionable rules for agents to work safely and effectively in this repo.

## 2. Environment & Workspace

- Node.js v22.12.0+ (do not downgrade)
- Package manager: pnpm workspaces
- Run all commands from the repository root

## 3. Agent Workflow

- Setup
  - `corepack enable`
  - `pnpm install`
- Validate
  - `pnpm type-check`
  - `pnpm test`
  - `pnpm lint`
- Build (when needed)
  - `pnpm -r build`
  - `pnpm --filter <package> build`
- Prefer non‑interactive, pager‑free, and safe operations.
- For package-specific commands and examples, refer to each package's README (e.g., `packages/release-tracking/README.md`, `packages/batch-pr/README.md`).

## 4. Code Style Essentials

- Prefer arrow functions for business logic; exceptions include class methods, constructors, generators, or intentional hoisting.

```ts path=null start=null
// Preferred
export const parseLines = (text?: string): string[] => {
  const t = text?.trim();
  if (!t) return [];
  return t.split('
').filter(line => line.trim() !== '');
};

// Acceptable when hoisting is necessary
export function bootstrap(config: Config): void {
  // ...
}
```

- Organize modules with public API near the top and implementation details at the bottom.

```ts path=null start=null
// 1) Imports

// 2) Public types/constants
export type SyncResult = { created: number; updated: number };

// 3) Public API (high-level orchestration)
export const syncCommits = async (cfg: Config): Promise<SyncResult> => {
  const commits = await getCommits(cfg);
  const filtered = filterCommits(commits, cfg);
  return applyChanges(filtered, cfg);
};

// 4) Private implementation details (bottom)
const getCommits = async (cfg: Config) => {
  /* ... */
};
const filterCommits = (commits: Commit[], cfg: Config) => {
  /* ... */
};
const applyChanges = (commits: Commit[], cfg: Config): SyncResult => {
  /* ... */
};
```

- Readability via blank lines: use exactly one blank line to separate logical blocks. Avoid multiple consecutive blank lines.
- Formatting and imports: Prettier governs formatting and import grouping/sorting. Keep imports stable; avoid deep relative imports across package boundaries.
- Logging and errors: use `utils/log.ts` (log types: I, S, W, E). Info/success logs gated by `VERBOSE=true`. Avoid raw `console.*`. Throw `Error` with actionable messages.

## 5. Repo Layout

- Monorepo using pnpm workspaces
- TypeScript with project references; Vitest (V8 coverage); GitHub Actions; shelljs with silent output
- Repository layout:

```text path=null start=null
packages/
├── core/                      # Execution engine & @yuki-no/plugin-sdk exports
│   ├── infra/                 # Git/GitHub integrations
│   ├── plugin/                # Plugin loader + SDK bindings
│   ├── types/                 # Shared TypeScript definitions
│   ├── utils/                 # Common utilities (logging, filters)
│   ├── utils-infra/           # Infra utilities (issue creation, commit tracking)
│   └── index.ts               # Main entry point
├── release-tracking/          # Official plugin for release status tracking
└── batch-pr/                  # Official plugin for batch PR creation
```

- High-level architecture (summary): key files include
  - Config: `packages/core/createConfig.ts`
  - Git: `packages/core/infra/git.ts`
  - GitHub: `packages/core/infra/github.ts`
  - Orchestration: `packages/core/index.ts`

## 6. API Boundaries & Compatibility

- Public surface (SDK): `@yuki-no/plugin-sdk` from `packages/core`.
- Public exports are defined in `packages/core/package.json` (exports map); treat these as the supported contract (`infra/_`, `utils/_`, `utils-infra/_`, `types/_`).
- Avoid importing non-exported internals; prefer exported entry points only.
- SemVer: breaking SDK changes require a major version bump. Official plugins pin the SDK via `peerDependencies` (e.g., `^1.x`).

## 7. Plugin Authoring Pointers

- A plugin must default-export an object with a name and optional hooks.
- Refer to `packages/core/types/plugin.ts` for the canonical hooks, order, and contracts. Do not duplicate those details here.
- Use the provided `ctx.config`; avoid side effects outside hook boundaries.
- When specifying plugins in workflows/actions, pin explicit versions (e.g., `@yuki-no/plugin-release-tracking@1.0.0`).

## 8. Tooling Usage & Safety

When a task involves file I/O, project-wide code edits, multi-step planning, up-to-date docs, or web research, use MCP in this order (and state which tool you used):

1. filesystem — reading/writing/searching files
2. serena — semantic code navigation and safe edits
3. context7 — latest, version-specific docs/examples
4. tavily — real-time web search/extract/crawl
5. sequential — explicit step-by-step planning or reflection

If the chosen MCP call is unavailable or errors, briefly note it and continue with non‑MCP methods to avoid blocking.

Safety and approvals

- Do not run interactive or long‑running commands; avoid pagers; prefer safe, non‑destructive operations.
- Preserve user‑owned changes; never overwrite without explicit instruction.
- Handle secrets via environment variables only; never print secrets.
- If the repository state is unexpected or a change seems risky or irreversible, stop and request guidance.

## 9. Quick Checklist

- Node 22 + pnpm; run from the repo root
- Install → type‑check → test → lint → (optional) build
- Use MCP in the order above; keep outputs concise; show exact diffs or commands for changes
- Make minimal, focused changes; verify with tests

## 10. Maintaining This Guide

Update when any of the following change:

- Node.js engine requirement or package manager
- Monorepo layout (packages added/removed/renamed) or TypeScript project references
- Public exports of `@yuki-no/plugin-sdk` or plugin lifecycle/type contracts
- Repo-wide commands (type-check, test, lint, build) or their recommended usage
- MCP servers that are installed/configured and their preferred usage order

Keep guidance concise; avoid duplicating workflow/automation details here; ensure examples compile and naming matches the current codebase.
