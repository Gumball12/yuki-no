# Contributing to Yuki-no

Thank you for your interest in contributing to Yuki-no! This guide will help you get started.

## Development Setup

### Prerequisites

- Node.js v22.0.0 or higher
- [Yarn Classic](https://classic.yarnpkg.com/lang/en/) (install via [Node Corepack](https://nodejs.org/api/corepack.html))
  ```bash
  corepack enable
  ```
- GitHub account
- An upstream repository
- GitHub Personal Access Token (Fine-grained)

### Setting up GitHub Fine-grained PAT

> [!WARNING]
>
> **Important Notes**
>
> - Never share your PAT with anyone
> - Use Fine-grained PAT instead of Classic PAT for better permission control

1. [Create a new Fine-grained PAT](https://github.com/settings/personal-access-tokens/new)
2. Repository access settings:
   - Select "Only select repositories"
   - Choose your upstream repository
3. Repository Permissions:
   - Contents: Read and write
   - Issues: Read and write (needed for release tracking)
   - Metadata: Read (set automatically)

For more details, see [GitHub documentation](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens).

### Local Environment Setup

> [!WARNING]
>
> **Important Notes**
>
> - The `.env` file is in .gitignore by default
> - Never commit the `.env` file to git

1. [Fork](https://github.com/Gumball12/yuki-no/fork) and clone the repository

   ```bash
   git clone https://github.com/Gumball12/yuki-no.git
   cd yuki-no

   # Install dependencies
   yarn install
   ```

2. Create `.env` file in the project root

   ```.env
   ACCESS_TOKEN=your_pat_here
   USER_NAME=your_github_username
   EMAIL=your_github_email
   HEAD_REPO=https://github.com/head_username/head_repo.git
   UPSTREAM_REPO=https://github.com/your_username/your_repo.git
   TRACK_FROM=head_commit_hash

   # ...
   ```

   > [!IMPORTANT]
   > For local development, you must set `UPSTREAM_REPO` explicitly.
   > The automatic repository detection only works in GitHub Actions.

For more environment variables, see [README](./README.md#configuration).

### Development Workflow

1. Create a new branch for your changes:

```bash
git checkout -b feat/your-feature
```

2. Run tests and the application:

```bash
yarn test # unit tests
yarn start:dev # run script
```

3. Format your code:

```bash
yarn lint
```

4. Commit your changes following [Conventional Commits](https://www.conventionalcommits.org/):

```bash
git commit -m "feat: add new feature"
git commit -m "fix: resolve issue #123"
```

5. Push your changes and create a pull request!

### Troubleshooting

#### Common Issues

If you find bugs not covered here, please [open an issue](https://github.com/Gumball12/yuki-no/issues).

**GitHub API 403 Errors**:

- Check your PAT permissions

## Project Structure

```
src/
├── index.ts                # Entry point, main workflow orchestration
├── createConfig.ts         # Configuration setup and validation
├── utils.ts                # Utility functions
├── git/                    # Git operations
├── github/                 # GitHub API interactions
├── plugins/                # Plugin system
│   ├── loader.ts           # Logic for loading core and community plugins
│   ├── plugin.types.ts     # TypeScript interfaces for plugins
│   └── core/               # Core plugins shipped with Yuki-no
│       ├── issue-creator.ts  # Default issue creation logic
│       └── release-tracker.ts # Default release tracking logic
│           └── lib/          # Helper functions for release-tracker
└── tests/                  # Unit tests
```

### Flow

The diagram below shows the execution flow of Yuki-no, including plugin hooks:

```mermaid
graph TD
    A[Start] --> B(Load Config);
    B --> C(Load Plugins);
    C --> D{Initialize Plugins};
    D -- For each plugin --> E(plugin.initialize());
    E --> F(Setup Git & GitHub);
    F --> G{PreSync Hooks};
    G -- For each plugin --> H(plugin.preSync());
    H --> I{OnSync Hooks};
    I -- For each plugin --> J(plugin.onSync());
    J --> K[Collect Issues];
    K --> L{PostSync Hooks};
    L -- For each plugin --> M(plugin.postSync());
    M --> N{Release Tracking Enabled?};
    N -- Yes --> O{PreReleaseTracking Hooks};
    O -- For each plugin --> P(plugin.preReleaseTracking());
    P --> Q{OnReleaseTracking Hooks};
    Q -- For each plugin --> R(plugin.onReleaseTracking());
    R --> S{PostReleaseTracking Hooks};
    S -- For each plugin --> T(plugin.postReleaseTracking());
    T --> U;
    N -- No --> U;
    U{OnEnd Hooks} -- For each plugin --> V(plugin.onEnd());
    V --> W[End];
```

1. **Load Config**: Yuki-no starts by loading its configuration from environment variables and workflow inputs.
2. **Load Plugins**: It then loads all configured plugins (both core and community) using `src/plugins/loader.ts`.
3. **Initialize Plugins**: Each loaded plugin's `initialize` hook is called.
4. **Git & GitHub Setup**: Git and GitHub clients are initialized.
5. **`preSync` Hooks**: Each plugin's `preSync` hook is called.
6. **`onSync` Hooks**: Each plugin's `onSync` hook is called. The results (arrays of `Issue` objects) are collected. This is where `core:issue-creator` does its main work.
7. **`postSync` Hooks**: Each plugin's `postSync` hook is called, receiving all issues created in the `onSync` phase.
8. **Release Tracking Phase** (if `release-tracking` is enabled):
    a. **`preReleaseTracking` Hooks**: Each plugin's `preReleaseTracking` hook is called.
    b. **`onReleaseTracking` Hooks**: Each plugin's `onReleaseTracking` hook is called. This is where `core:release-tracker` does its main work.
    c. **`postReleaseTracking` Hooks**: Each plugin's `postReleaseTracking` hook is called.
9. **`onEnd` Hooks**: Finally, each plugin's `onEnd` hook is called.
10. **End**: The process completes.

## Testing

The project uses [Vitest](https://vitest.dev/) for testing. Tests are in the `src/tests/` directory.

### Running Tests

To run tests with coverage:

```bash
yarn test
```

### About Mocking

We generally recommend avoiding excessive mocking in tests. However, for operations with side-effects that aren't directly related to what you're testing, mocking is appropriate:

- Network requests to external services (e.g. GitHub API)
- File system operations (creating/deleting files, like Git)
- Other operations with unpredictable results

External libraries without side-effects should **not** be mocked. These libraries are typically well-tested already, and as long as their version remains consistent, they won't introduce unexpected behavior.

For similar reasons, most mocked behaviors are excluded from our test coverage metrics. Currently, we only have [mockedRequests.test.ts](./src/tests/mockedRequests.test.ts) for testing GitHub API interactions while maintaining idempotence.

When mocking is necessary, follow these practices:

- Mock only the specific functions needed
- Keep mocks as close to real behavior as possible
- Reset mocks between tests using `vi.clearAllMocks()`

## Getting Help

If you need help:

1. Check existing issues and docs
2. Open a new issue with a clear description

## Contributing to the Plugin System

We welcome contributions to enhance Yuki-no's plugin system and its core plugins!

### Developing New Core Plugins

If you have an idea for a new feature that could be a core plugin:
1.  Please open an issue first to discuss your idea and how it fits into the Yuki-no ecosystem.
2.  Follow the general development workflow outlined above.
3.  Place new core plugin code within the `src/plugins/core/` directory.
4.  Ensure your plugin adheres to the `Plugin` interface and best practices described in the [Plugin Development Guide](./docs/plugins.md).
5.  Add appropriate tests for your new plugin.

### Improving Existing Plugins or the Plugin Loader

Improvements to existing core plugins or the plugin loading mechanism (`src/plugins/loader.ts`) are also welcome.
1.  For significant changes, consider opening an issue to discuss the proposed changes.
2.  Follow the standard development and testing procedures.

### Developing Community Plugins

While community plugins are not part of the core Yuki-no repository, if you develop a useful plugin, please let us know! We might consider listing it in our documentation or linking to it if it provides significant value to users.

## License

By contributing, you agree that your contributions will be licensed under the MIT License. See [LICENSE](LICENSE) for details.
