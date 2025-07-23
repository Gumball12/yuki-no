# Yuki-no Plugin System

Yuki-no supports external plugins that can hook into its lifecycle. Specify plugin package names with the `plugins` option in your workflow. Names are conventionally prefixed with `yuki-no-plugin-`, though this is not enforced.

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
                        │  onExit()   │ ← Cleanup & finalization
                        └─────┬───────┘
                              │
                              ▼
                          ✅ Complete
```

## Plugin Development

### Installing Dependencies

[![NPM Version](https://img.shields.io/npm/v/%40gumball12%2Fyuki-no?style=flat-square&label=yuki-no)](https://www.npmjs.com/package/@gumball12/yuki-no)

Install [yuki-no](https://www.npmjs.com/package/@gumball12/yuki-no) as a development dependency to get TypeScript types, input helpers, and testing utilities:

```bash
npm install @gumball12/yuki-no
```

### Creating a Plugin

> [!NOTE]
> Every plugin **must** export a default object implementing any of the lifecycle hooks below.

Create a plugin by implementing the `YukiNoPlugin` interface:

```ts
import type { YukiNoPlugin } from 'yuki-no';

const myPlugin: YukiNoPlugin = {
  name: 'my-plugin',

  async onInit(ctx) {
    console.log('Plugin initialized!');
    console.log(`Tracking from: ${ctx.config.trackFrom}`);
    console.log(`Release tracking: ${ctx.config.releaseTracking}`);
    // Initialize plugin state, validate configuration
  },

  async onBeforeCompare(ctx) {
    // Called before comparing commits
    console.log('About to compare commits...');
  },

  async onAfterCompare(ctx) {
    // Called after comparing commits
    console.log(`Found ${ctx.commits.length} new commits`);
  },

  async onBeforeCreateIssue(ctx) {
    // Inspect issue metadata before creation
    console.log(`Creating issue: ${ctx.meta.title}`);
    console.log(`Labels: ${ctx.meta.labels.join(', ')}`);
  },

  async onAfterCreateIssue(ctx) {
    // Called after issue is created
    console.log(`Created issue #${ctx.result.number}: ${ctx.result.html_url}`);
  },

  async onExit(ctx) {
    console.log(`Plugin finished, success: ${ctx.success}`);
    // Cleanup, send notifications
  },

  async onError(ctx) {
    console.error('Plugin error:', ctx.error.message);
    // Error handling, send alerts
  },
};

export default myPlugin;
```

- `onInit(ctx: YukiNoContext)`: Called when the action starts, after configuration is loaded.
- `onBeforeCompare(ctx: YukiNoContext)`: Called before comparing commits between repositories.
- `onAfterCompare(ctx: YukiNoContext & { commits: Commit[] })`: Called after commit comparison, with the list of new commits.
- `onBeforeCreateIssue(ctx: YukiNoContext & { commit: Commit; meta: IssueMeta })`: Called before each issue is created. The `meta` object is read-only for inspection purposes.
- `onAfterCreateIssue(ctx: YukiNoContext & { commit: Commit; issue: Issue })`: Called after each issue is created.
- `onExit(ctx: YukiNoContext & { success: boolean })`: Called before the action exits (success or failure).
- `onError(ctx: YukiNoContext & { error: Error })`: Called when any error occurs during execution.

See [@gumball12/yuki-no-plugin-test](https://github.com/Gumball12/yuki-no-plugin-test) for a plugin example.

### Passing Inputs to Plugins

Plugins can receive custom values using environment variables instead [`with`](https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions#jobsjob_idstepswith). This approach avoids IDE warnings about undefined inputs and follows GitHub Actions best practices. Use the `env` block to pass custom values to your plugins:

```yaml
- uses: Gumball12/yuki-no@v1
  env:
    PLUGIN_CUSTOM_MESSAGE: ${{ secrets.CUSTOM_MESSAGE }}
    PLUGIN_IS_TRUE: true
    PLUGIN_MY_VALUES: |
      value 1
      value 2
  with:
    # ... standard yuki-no inputs only ...
    access-token: ${{ secrets.GITHUB_TOKEN }}
    head-repo: https://github.com/vitejs/vite.git
    track-from: abc123
```

```ts
import { getBooleanInput, getInput, getMultilineInput } from 'yuki-no';

const customMessage = getInput('PLUGIN_CUSTOM_MESSAGE', 'default message'); // default value is optional
const isTrue = getBooleanInput('PLUGIN_IS_TRUE', false);
const myValues = getMultilineInput('PLUGIN_MY_VALUES', [
  'default1',
  'default2',
]);
```

> [!TIP]
> We recommend prefixing your environment variables with `PLUGIN_` to avoid conflicts with system variables.

### Context Types

```ts
type YukiNoContext = {
  octokit: Octokit; // GitHub API client (@octokit/rest)
  context: Context; // GitHub Actions context (@actions/github/lib/context)
  config: Config; // Yuki-no configuration settings
};

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

type IssueMeta = {
  title: string; // Issue title
  body: string; // Issue body
  labels: string[]; // Issue labels
};
```

### Publishing

1. **Create Package**: Create a package named like `yuki-no-plugin-<name>`
2. **Export Plugin**: Export the plugin as `default` from your entry file
3. **Publish**: Publish the package to npm
4. **Configure**: Users add the package name with exact version to the `plugins` option in their workflow

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
      @gumball12/yuki-no-plugin-test@0.0.4
      yuki-no-plugin-slack@2.1.0
      @my-org/yuki-no-plugin-teams@1.5.2
```

Plugins are automatically installed by Yuki-no during GitHub Actions execution. You only need to specify them in your workflow configuration.
