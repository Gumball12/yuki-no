# Plugin Development Guide

## Introduction

Yuki-no's plugin system allows you to extend and customize its core functionality. Plugins can hook into various lifecycle events of the synchronization and release tracking processes, enabling a wide range of custom behaviors, from modifying how issues are created to integrating with external notification services.

This guide provides all the information you need to develop your own plugins for Yuki-no.

## Plugin Structure

A Yuki-no plugin is a Node.js module that exports a default object. This object must conform to the `Plugin` interface defined in Yuki-no.

Here's a basic template for a plugin:

```typescript
// my-yuki-plugin.ts
import {
  type Plugin,
  type PluginOptions,
  type Config,
  type Git,
  type GitHub,
  type Issue,
} from 'yuki-no'; // Assuming yuki-no types are available if developing externally

const MyCustomPlugin: Plugin = {
  name: 'my-custom-plugin-name', // Unique name for your plugin

  async initialize(config: Config, options?: PluginOptions): Promise<void> {
    console.log(`Plugin ${this.name} initialized with options:`, options);
    // Perform any setup tasks here
  },

  async onSync(config: Config, git: Git, github: GitHub, options?: PluginOptions): Promise<Issue[]> {
    console.log(`Plugin ${this.name} onSync hook called.`);
    // Implement custom synchronization logic
    // For example, create or modify issues based on specific criteria
    return []; // Return an array of created/modified issues if applicable
  },

  // ... other lifecycle hooks as needed
};

export default MyCustomPlugin;
```

## Plugin Interface (`Plugin`)

The `Plugin` interface defines the structure and lifecycle hooks that Yuki-no recognizes.

```typescript
export interface Plugin {
  name: string;
  initialize?: (config: Config, options?: PluginOptions) => Promise<void>;
  preSync?: (config: Config, git: Git, github: GitHub, options?: PluginOptions) => Promise<void>;
  onSync?: (config: Config, git: Git, github: GitHub, options?: PluginOptions) => Promise<Issue[]>;
  postSync?: (config: Config, git: Git, github: GitHub, createdIssues: Issue[], options?: PluginOptions) => Promise<void>;
  preReleaseTracking?: (config: Config, git: Git, github: GitHub, options?: PluginOptions) => Promise<void>;
  onReleaseTracking?: (config: Config, git: Git, github: GitHub, allIssues: Issue[], options?: PluginOptions) => Promise<void>;
  postReleaseTracking?: (config: Config, git: Git, github: GitHub, options?: PluginOptions) => Promise<void>;
  onEnd?: (config: Config, options?: PluginOptions) => Promise<void>;
}

export interface PluginOptions {
  [key: string]: any;
}

// Other relevant types (simplified, refer to yuki-no source for full definitions)
// Config: Contains the overall configuration for Yuki-no.
// Git: Provides methods for interacting with the Git repository.
// GitHub: Provides methods for interacting with the GitHub API.
// Issue: Represents a GitHub issue.
```

### Lifecycle Hooks

Each optional method in the `Plugin` interface is a lifecycle hook that Yuki-no will call at a specific point during its execution.

1.  **`name: string`**
    *   **Required.** A unique identifier for the plugin. For community plugins, it's recommended to follow the `yuki-plugin-feature-name` convention, which should also match the npm package name.

2.  **`initialize?: (config: Config, options?: PluginOptions) => Promise<void>;`**
    *   **Parameters**:
        *   `config`: The main Yuki-no configuration object.
        *   `options`: The specific options object for this plugin, as defined in the workflow file.
    *   **Purpose**: Called once when Yuki-no starts and after plugins are loaded. Use this hook for any asynchronous setup, validation of options, or initialization tasks your plugin needs.

3.  **`preSync?: (config: Config, git: Git, github: GitHub, options?: PluginOptions) => Promise<void>;`**
    *   **Parameters**: `config`, `git`, `github`, `options`.
    *   **Purpose**: Called before the main synchronization process (commit fetching and issue creation) begins. Useful for tasks like pre-flight checks or preparing the environment.

4.  **`onSync?: (config: Config, git: Git, github: GitHub, options?: PluginOptions) => Promise<Issue[]>;`**
    *   **Parameters**: `config`, `git`, `github`, `options`.
    *   **Purpose**: This is the primary hook for implementing custom synchronization logic. If a plugin implements this, it can take over or augment the default issue creation process. It should return an array of `Issue` objects that were created or processed by this plugin. The `core:issue-creator` plugin implements this hook by default.
    *   **Return Value**: An array of `Issue` objects. These are concatenated with issues created by other plugins' `onSync` hooks.

5.  **`postSync?: (config: Config, git: Git, github: GitHub, createdIssues: Issue[], options?: PluginOptions) => Promise<void>;`**
    *   **Parameters**: `config`, `git`, `github`, `createdIssues` (all issues created during the `onSync` phase by all plugins), `options`.
    *   **Purpose**: Called after the synchronization process (all `onSync` hooks) has completed. Useful for post-processing, cleanup, or sending notifications about created issues.

6.  **`preReleaseTracking?: (config: Config, git: Git, github: GitHub, options?: PluginOptions) => Promise<void>;`**
    *   **Parameters**: `config`, `git`, `github`, `options`.
    *   **Purpose**: Called before the release tracking process begins, but after all relevant issues (newly created and existing open ones) have been gathered.

7.  **`onReleaseTracking?: (config: Config, git: Git, github: GitHub, allIssues: Issue[], options?: PluginOptions) => Promise<void>;`**
    *   **Parameters**: `config`, `git`, `github`, `allIssues` (a combined list of newly created issues and existing open issues relevant for release tracking), `options`.
    *   **Purpose**: This hook allows plugins to implement custom release tracking logic. It's called if `release-tracking` is enabled in the main configuration. The `core:release-tracker` plugin implements this hook by default.

8.  **`postReleaseTracking?: (config: Config, git: Git, github: GitHub, options?: PluginOptions) => Promise<void>;`**
    *   **Parameters**: `config`, `git`, `github`, `options`.
    *   **Purpose**: Called after the release tracking process (all `onReleaseTracking` hooks) has completed. Useful for cleanup or notifications related to release tracking.

9.  **`onEnd?: (config: Config, options?: PluginOptions) => Promise<void>;`**
    *   **Parameters**: `config`, `options`.
    *   **Purpose**: Called at the very end of the Yuki-no execution, after all other operations have finished. Ideal for final cleanup tasks, summary reporting, or sending final notifications.

## Plugin Configuration (`options`)

Plugins can receive specific configurations through the `plugins` input in the GitHub Actions workflow file (`.github/workflows/yuki-no.yml`).

```yaml
# In your .github/workflows/yuki-no.yml
# ...
    with:
      # ... other inputs ...
      plugins: |
        - name: core:issue-creator
          options:
            customPrefix: "[TRACK]"
        - name: my-community-plugin
          options:
            apiKey: ${{ secrets.MY_PLUGIN_API_KEY }}
            threshold: 10
# ...
```

The `options` object defined for a plugin in this YAML structure is passed as the `options?: PluginOptions` argument to each of its lifecycle hooks. This allows users to customize the behavior of your plugin without modifying its code.

## Loading Plugins

Yuki-no loads plugins based on their names as specified in the `plugins` configuration.

### Core Plugins

*   **Identification**: Core plugins are identified by the `core:` prefix in their name (e.g., `core:issue-creator`).
*   **Bundling**: These plugins are shipped directly with Yuki-no.
*   **Default Behavior**: The `core:issue-creator` and `core:release-tracker` plugins are enabled by default. If you specify them in the `plugins` input in your workflow, you are essentially providing them with custom options to override their default settings. If they are not listed, they run with their internal default options.

### Community Plugins

*   **Naming Convention**: It's recommended that community plugins follow the naming convention `yuki-plugin-feature-name` for their npm package (e.g., `yuki-plugin-slack-notifier`). The `name` field in the plugin configuration should match this package name.
*   **Resolution**: Community plugins are loaded using dynamic `import()`. Yuki-no will attempt to resolve them like any other Node.js module. This typically means they need to be installed as dependencies in the repository where Yuki-no is running (e.g., via `npm install yuki-plugin-my-feature` or `yarn add yuki-plugin-my-feature` and committed to your `package.json` and `node_modules`, or installed during a setup step in your workflow).

## Default Plugins

Yuki-no comes with two core plugins that provide its main functionalities:

*   **`core:issue-creator`**: Responsible for fetching commits from the head repository and creating corresponding issues in the upstream repository. Implements the `onSync` hook.
*   **`core:release-tracker`**: Responsible for tracking releases of commits, updating issue labels, and commenting on issues with release information. Implements the `onReleaseTracking` hook.

These plugins are active by default. You can customize their behavior by providing `options` to them in the `plugins` section of your workflow configuration. If you want to completely replace their functionality, you can omit them from the `plugins` list and provide your own plugin that implements the respective `onSync` or `onReleaseTracking` hooks. However, be aware that if no plugin implements `onSync`, no issues will be created. Similarly for `onReleaseTracking`.

## Example Plugin: Simple Logger

Here’s a simple example of a community plugin that logs information at various stages:

```typescript
// yuki-plugin-simple-logger/index.ts
import { type Plugin, type PluginOptions, type Config, type Issue, type Git, type GitHub } from 'yuki-no';

const SimpleLoggerPlugin: Plugin = {
  name: 'yuki-plugin-simple-logger',

  async initialize(config: Config, options?: PluginOptions): Promise<void> {
    console.log(`[SimpleLogger] Initialized. Options: ${JSON.stringify(options)}`);
  },

  async preSync(config: Config, git: Git, github: GitHub, options?: PluginOptions): Promise<void> {
    console.log('[SimpleLogger] Starting synchronization phase...');
  },

  async onSync(config: Config, git: Git, github: GitHub, options?: PluginOptions): Promise<Issue[]> {
    console.log('[SimpleLogger] Core synchronization logic would run here if this plugin replaced it.');
    // This example logger doesn't create issues itself.
    return [];
  },

  async postSync(config: Config, git: Git, github: GitHub, createdIssues: Issue[], options?: PluginOptions): Promise<void> {
    console.log(`[SimpleLogger] Synchronization finished. ${createdIssues.length} issues processed in total by onSync hooks.`);
  },

  async onEnd(config: Config, options?: PluginOptions): Promise<void> {
    console.log('[SimpleLogger] Yuki-no run finished.');
  },
};

export default SimpleLoggerPlugin;
```

To use this plugin:
1.  Publish it as an npm package (e.g., `yuki-plugin-simple-logger`).
2.  Install it in your repository: `npm install yuki-plugin-simple-logger`.
3.  Add it to your `yuki-no.yml`:

    ```yaml
    # ...
    with:
      # ...
      plugins: |
        - name: yuki-plugin-simple-logger
          options:
            logLevel: "verbose" # Example option
    # ...
    ```

## Best Practices

*   **Idempotency**: Design your plugin hooks to be idempotent where possible. This means running them multiple times with the same input should produce the same result without unintended side effects.
*   **Error Handling**: Implement robust error handling within your plugin. Use try-catch blocks for operations that might fail (e.g., API calls). Log errors clearly. Yuki-no will log errors from plugins but will generally continue execution with other plugins or core functionalities unless the error is critical.
*   **Logging**: Use Yuki-no's `log` utility if possible for consistent log formatting (though direct `console.log` is also fine). Provide clear and informative log messages.
    ```typescript
    // To use yuki-no's logger (if developing in a way that allows direct import)
    // import { log } from 'yuki-no/utils'; // Path might vary
    // log('I', `My plugin message: ${data}`);
    ```
*   **Configuration**: Clearly document the `options` your plugin accepts. Provide sensible defaults if possible.
*   **Scope**: Keep your plugin focused on a specific task or functionality.
*   **Dependencies**: Be mindful of the dependencies you add. Keep them minimal to avoid bloating and potential conflicts.
*   **Testing**: Write tests for your plugin to ensure it behaves as expected.
```
