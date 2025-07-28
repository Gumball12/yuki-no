# Yuki-no Plugin System

Yuki-no supports external plugins that can hook into its lifecycle. Specify plugin package names with the `plugins` option in your workflow. Names are conventionally prefixed with `yuki-no-plugin-`, though this is not enforced.

## Using Plugins

> [!NOTE]
>
> **You do NOT need to install plugins in your repository!** Yuki-no automatically installs plugins during GitHub Actions execution. Simply specify plugin names in your workflow configuration.

Specify published npm packages with exact version:

```yaml
- uses: Gumball12/yuki-no@v1
  with:
    # ... other options ...

    # [Optional]
    # List of plugin package names with exact versions
    plugins: |
      yuki-no-plugin-test@0.0.4
      yuki-no-plugin-slack@2.1.0
      @my-org/yuki-no-plugin-teams@1.5.2
```

Plugins are automatically installed by Yuki-no during [GitHub Actions execution](../scripts/checkout.sh). You only need to specify them in your workflow configuration.

## Local Development with Plugins

> [!IMPORTANT]
>
> **Local development requires manual plugin installation!** Unlike GitHub Actions, when running Yuki-no locally with `pnpm start:dev`, you must manually install plugin dependencies.

When developing locally, plugins need to be installed as dependencies before they can be used:

### Installing Plugin Dependencies

Install plugins in one of these locations (using example plugin names):

1. **In the core package** ([packages/core](./packages/core)):
   ```bash
   pnpm add @yuki-no/plugin-release-track @yuki-no/plugin-batch-pr --filter @yuki-no/core
   ```

2. **In the project root**:
   ```bash
   pnpm add -w @yuki-no/plugin-release-track @yuki-no/plugin-batch-pr
   ```

You can install them as either regular dependencies or devDependencies - both work for local development.

### Configuring Plugins Locally

Configure plugins in your `.env` file located in `packages/core/.env`:

```.env
# Other configuration...
ACCESS_TOKEN=your_pat_here
USER_NAME=your_github_username
EMAIL=your_github_email

# Plugin configuration
PLUGINS="@yuki-no/plugin-release-track
@yuki-no/plugin-batch-pr"
```

The `PLUGINS` environment variable should contain plugin names separated by newlines, similar to the multiline format used in GitHub Actions workflows.

## Plugin Lifecycle

Yuki-no executes plugins through a well-defined lifecycle that corresponds to the main phases of repository synchronization and issue creation.

### Lifecycle Flow

```
🚀 Action Start
      │
      ▼
  ┌─────────────┐
  │  onInit()   │ ← Plugin initialization
  └─────┬───────┘
        │
        ▼
  ┌─────────────┐
  │onBefore     │ ← Before comparing commits
  │Compare()    │
  └─────┬───────┘
        │
        ▼
    📊 Compare Commits & Find New Changes
        │
        ▼
  ┌─────────────┐
  │ onAfter     │ ← After comparing commits
  │ Compare()   │
  └─────┬───────┘
        │
        ▼
  ┌─────────────┐     No commits
  │New Commits? ├─────────────┐
  └─────┬───────┘             │
        │ Yes                 │
        ▼                     │
   For each commit:           │
        │                     │
        ▼                     │
  ┌─────────────┐             │
  │onBefore     │             │
  │CreateIssue()│ ← Before creating issue
  └─────┬───────┘             │
        │                     │
        ▼                     │
    🎫 Create GitHub Issue    │
        │                     │
        ▼                     │
  ┌─────────────┐             │
  │ onAfter     │             │
  │CreateIssue()│ ← After creating issue
  └─────┬───────┘             │
        │                     │
        └─────────────────────┤
                              ▼
                        ┌─────────────┐
                        │  onFinally()   │ ← Cleanup & finalization
                        └─────┬───────┘
                              │
                              ▼
                          ✅ Complete
```

Each hook in the plugin lifecycle is called sequentially according to Yuki-no's execution flow. Importantly, if no new commits are found, the `onBeforeCreateIssue` and `onAfterCreateIssue` hooks will not be called at all. Therefore, tasks that must be performed in every plugin execution should be handled in the `onInit` or `onFinally` hooks for safety.

Performance considerations include that the `onBeforeCreateIssue` and `onAfterCreateIssue` hooks are executed repeatedly for each discovered commit. Heavy operations or external API calls should preferably be batched in `onAfterCompare`, or each hook should perform minimal work.

For error handling, even if one plugin encounters an error, the `onError` hooks of all other plugins will still be called. This allows for independent error logging or notifications per plugin. Most data passed through context is read-only, but the `issueMeta` object received in `onBeforeCreateIssue` is mutable, allowing dynamic changes to issue titles, bodies, and labels.

## Plugin Development

### Installing Plugin SDK

[![NPM Version](https://img.shields.io/npm/v/%40gumball12%2Fyuki-no?style=flat-square&label=yuki-no)](https://www.npmjs.com/package/@yuki-no/plugin-sdk)

We provide the [@yuki-no/plugin-sdk](https://www.npmjs.com/package/@yuki-no/plugin-sdk) library that includes types, helper functions, and other utilities to assist with Yuki-no plugin development:

```bash
npm install @yuki-no/plugin-sdk
```

### Creating a Yuki-no Plugin w/ Hooks

> [!NOTE]
> Every plugin **must** export a default object implementing any of the lifecycle hooks below.

Create a plugin by implementing the `YukiNoPlugin` interface:

```ts
import type { YukiNoPlugin } from '@yuki-no/plugin-sdk';

const myPlugin: YukiNoPlugin = {
  name: 'my-plugin',

  // Called when the action starts, after configuration is loaded.
  async onInit(ctx: YukiNoContext) {},

  // Called before comparing commits between repositories.
  async onBeforeCompare(ctx: YukiNoContext) {},

  // Called after commit comparison, with the list of new commits.
  async onAfterCompare(ctx: YukiNoContext & { commits: Commit[] }) {},

  // Called before each issue is created.
  // The `issueMeta` object is read-only for inspection purposes.
  async onBeforeCreateIssue(
    ctx: YukiNoContext & { commit: Commit; issueMeta: IssueMeta },
  ) {},

  // Called after each issue is created.
  async onAfterCreateIssue(
    ctx: YukiNoContext & { commit: Commit; issue: Issue },
  ) {},

  // Called before the action exits (success or failure)
  async onFinally(ctx: YukiNoContext & { success: boolean }) {},

  // Called when any error occurs during execution.
  async onError(ctx: YukiNoContext & { error: Error }) {},
};

export default myPlugin;
```

As previously explained, Yuki-no provides several hook interfaces that are called at different parts of the lifecycle. Plugin developers can use these to define what actions to perform at each stage.

For detailed information about types, please refer to the [Plugin SDK API](#plugin-sdk-api) section.

See [yuki-no-plugin-test](https://github.com/Gumball12/yuki-no-plugin-test) for a plugin example.

### Passing Inputs to Plugins

> [!CAUTION]
> Environment variable names passed as plugin inputs must always have the `YUKI_NO_` prefix.

Plugins can receive custom values using environment variables instead [`with`](https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions#jobsjob_idstepswith). This approach avoids IDE warnings about undefined inputs and follows GitHub Actions best practices. Use the `env` block to pass custom values to your plugins:

```yaml
- uses: Gumball12/yuki-no@v1
  env:
    YUKI_NO_CUSTOM_MESSAGE: ${{ secrets.CUSTOM_MESSAGE }}
    YUKI_NO_IS_TRUE: true
    YUKI_NO_MY_VALUES: |
      value 1
      value 2
  with:
    # ... yuki-no options ...
    access-token: ${{ secrets.GITHUB_TOKEN }}
    head-repo: https://github.com/vitejs/vite.git
    track-from: abc123
```

Only environment variables with the `YUKI_NO` prefix are passed to plugins to prevent access to unauthorized environment variables. Therefore, you must include the `YUKI_NO_` prefix in your environment variable names.

### Publishing

1. **Create Package:** Create a package named like `yuki-no-plugin-<name>`
2. **Export Plugin:** Export the plugin as `default` from your entry file
3. **Publish:** Publish the package to npm
4. **Configure:** Users add the package name with exact version to the `plugins` option in their workflow

## Plugin SDK API

Yuki-no provides a [Plugin SDK](https://www.npmjs.com/package/@yuki-no/plugin-sdk) that can help with plugin development.

```bash
npm install @yuki-no/plugin-sdk
```

This section describes the types and helper functions provided by this library. You can import and use them as follows:

```ts
import { Config } from '@yuki-no/plugin-sdk/types/config';
```

### `types/config`

#### `Config`

```ts
type Config = {
  accessToken: string;
  userName: string;
  email: string;
  upstreamRepoSpec: RepoSpec;
  headRepoSpec: RepoSpec;
  trackFrom: string;
  include: string[];
  exclude: string[];
  labels: string[];
  releaseTracking: boolean;
  plugins: string[];
  verbose: boolean;
};
```

The Yuki-no configuration is structured with the above type definition.

#### `RepoSpec`

```ts
type RepoSpec = {
  owner: string;
  name: string;
  branch: string;
};
```

Information about a repository.

### `types/git`

#### `Commit`

```ts
type Commit = {
  title: string;
  isoDate: string;
  hash: string;
  fileNames: string[];
};
```

### `types/github`

#### `IssueMeta`

```ts
type IssueMeta = Readonly<{
  title: string;
  body: string;
  labels: string[];
}>;
```

Type definition for information needed when creating an issue.

#### `Issue`

```ts
type Issue = {
  number: number;
  body: string;
  labels: string[];
  hash: string;
  isoDate: string;
};
```

Type definition for issues created by Yuki-no.

### `types/plugin`

#### `YukiNoContext`

```ts
type YukiNoContext = {
  config: Config;
};
```

Type definition for Yuki-no plugin context.

#### `YukiNoPlugin`

```ts
interface YukiNoPlugin extends YukiNoPluginHooks {
  name: string;
}

interface YukiNoPluginHooks {
  onInit?(ctx: YukiNoContext): Promise<void> | void;
  onBeforeCompare?(ctx: YukiNoContext): Promise<void> | void;
  onAfterCompare?(
    ctx: YukiNoContext & { commits: Commit[] },
  ): Promise<void> | void;
  onBeforeCreateIssue?(
    ctx: YukiNoContext & { commit: Commit; issueMeta: IssueMeta },
  ): Promise<void> | void;
  onAfterCreateIssue?(
    ctx: YukiNoContext & { commit: Commit; issue: Issue },
  ): Promise<void> | void;
  onFinally?(ctx: YukiNoContext & { success: boolean }): Promise<void> | void;
  onError?(ctx: YukiNoContext & { error: Error }): Promise<void> | void;
}
```

### `infra/git`

#### `Git`

```ts
class Git {
  constructor(config: Config & { repoSpec: RepoSpec; withClone?: boolean });

  clone(): void;
  exec(command: string): string;
  get repoUrl(): string;
  get dirName(): string;
}
```

A class for managing Git repositories and executing git commands. When creating a `new Git` instance, you can pass `withClone` as `true` to clone the repository during creation.

- `clone()`: Clones the specified repository
- `exec(command: string)`: Executes git commands
- `repoUrl`: Returns the repository URL
- `dirName`: Returns the repository directory name

### `infra/github`

#### `GitHub`

```ts
class GitHub {
  constructor(config: Config & { repoSpec: RepoSpec });

  get api(): Octokit;
  get ownerAndRepo(): { owner: string; repo: string };
  get configuredLabels(): string[];
}
```

A class for managing GitHub API integration and interactions.

- `api`: Returns an Octokit instance
- `ownerAndRepo`: Returns the repository owner and name
- `configuredLabels`: Returns the configured label list

### `utils/common`

#### `isNotEmpty`

```ts
function isNotEmpty(value: string): boolean;
```

#### `extractHashFromIssue`

```ts
function extractHashFromIssue(issue: Pick<Issue, 'body'>): string | undefined;
```

Extracts the commit hash from the body of translation issues managed by Yuki-no.

#### `filterByPattern`

```ts
function filterByPattern(
  items: string[],
  include: string[],
  exclude: string[],
): string[];
```

Filters items based on include/exclude patterns. Patterns follow Glob Patterns; for details, see [Picomatch docs](https://github.com/micromatch/picomatch?tab=readme-ov-file#advanced-globbing).

### `utils/input`

#### `getInput`

```ts
function getInput(key: string, defaultValue?: string): string | undefined;
```

Retrieves the corresponding value from environment variables.

#### `getBooleanInput`

```ts
function getBooleanInput(key: string, defaultValue?: boolean): boolean;
```

Retrieves the corresponding value from environment variables as a boolean type.

#### `getMultilineInput`

```ts
function getMultilineInput(key: string, defaultValue?: string[]): string[];
```

Retrieves multiline environment variable values as a string array.

### `utils-infra/createIssue`

```ts
function createIssue(github: GitHub, issueMeta: IssueMeta): Promise<Issue>;
```

Creates a new Yuki-no issue on GitHub.

- `github`: GitHub API class instance
- `issueMeta`: Issue metadata (title, body, labels)

### `utils-infra/getCommits`

```ts
function getCommits(config: Config, git: Git, since?: string): Commit[];
```

Retrieves the list of commits after the specified point.

- `config`: Yuki-no configuration
- `git`: Git class instance
- `since`: Query starting point (ISO date string)

### `utils-infra/getLatestSuccessfulRunISODate`

```ts
function getLatestSuccessfulRunISODate(
  github: GitHub,
): Promise<string | undefined>;
```

Retrieves the execution time of the most recent successful Yuki-no GitHub Actions workflow.

### `utils-infra/getOpenedIssues`

```ts
function getOpenedIssues(github: GitHub): Promise<Issue[]>;
```

Retrieves all currently open Yuki-no issues. Returns only issues that have the configured labels after filtering.

### `utils-infra/lookupCommitsInIssues`

```ts
function lookupCommitsInIssues(
  github: GitHub,
  commits: Commit[],
): Promise<Commit[]>;
```

Finds and returns commits from the given commit list that do not yet have issues created for them.

- `github`: GitHub API class instance
- `commits`: List of commits to check
