# <img width="35" src="docs/logo.webp" title="logo" alt="logo"> Yuki-no

[![CI](https://github.com/Gumball12/yuki-no/actions/workflows/ci.yml/badge.svg)](https://github.com/Gumball12/yuki-no/actions/workflows/ci.yml) [![codecov](https://codecov.io/gh/Gumball12/yuki-no/graph/badge.svg?token=BffFcZn5Dn)](https://codecov.io/gh/Gumball12/yuki-no)

[![asciicast](https://asciinema.org/a/ZmSCwDTR7p2uPCc9QaW44Shb1.svg)](https://asciinema.org/a/ZmSCwDTR7p2uPCc9QaW44Shb1)

Yuki-no (雪の, "of snow" in Japanese) is a GitHub Action that tracks changes between repositories. It creates GitHub issues based on commits from a head repository, making it ideal for documentation translation projects.

> **Why Yuki-no?**: Looking for a reliable, automated solution for managing documentation translation? Check out [why Yuki-no](./WHY.md) might be the right choice for your project.

> Looking to migrate from a GitHub Issues-based translation project like Ryu-cho? Check out our [migration guide](./MIGRATION.md) for a seamless transition.

## Features

- Automatically tracks commits from a head repository
- Creates issues for new changes
- Filters changes based on file paths (`include` and `exclude` options)
- Supports custom labels for issues (`label` option)
- Tracks release status with pre-release and release information (`release-tracking` option)
- Manages release tracking labels for unreleased changes (`release-tracking-labels` option)

Yuki-no is actively used in the <img width="20" src="https://vitejs.dev/logo.svg"> [Vite Korean docs translation project](https://github.com/vitejs/docs-ko), <img width="20" src="https://vuejs.org/logo.svg"> [Korean translation for Vue docs](https://github.com/vuejs-translations/docs-ko), and <img width="20" src="https://vitejs.dev/logo.svg"> [Template for Vite.js docs translation repositories](https://github.com/tony19/vite-docs-template) demonstrating its effectiveness in real-world translation workflows.

### How It Works

1. **Repository Monitoring Process**
   - Clones the `head-repo` in a [OS's temporary directory](https://nodejs.org/docs/latest-v22.x/api/os.html#ostmpdir)
   - Uses GitHub Actions Bot credentials by default
2. **Commit Change Detection and Issue Creation**
   - Tracks commits newer than the last successful run
   - Filters changes based on `include`/`exclude` patterns
   - Creates issues for new changes with your specified `labels`
3. **Version `release-tracking` System** (when enabled)
   - Monitors pre-release and release tags
   - Adds status comments and manages `release-tracking-labels` automatically
   - Stops tracking when production release is available

The entire process runs safely without affecting your local environment or git configuration.

## Usage

1. **Required**: Configure workflow permissions

   ![settings](./docs/settings.webp)

   - Go to Settings > Actions > General > Workflow permissions
   - Select "Read and write permissions"
   - Save the changes

   This is a standard requirement for any GitHub Actions that need to create issues or view repository content. Without these permissions, the action will fail with a `403 "Resource not accessible by integration"` error when trying to create issues or manage labels.

2. Create `.github/workflows/yuki-no.yml`:

   ```yml
   name: yuki-no

   permissions:
     # Read external repo changes
     contents: read
     # Create and update issues for tracked changes
     issues: write
     # Get last workflow run info
     actions: read

   on:
     schedule:
       - cron: '0 * * * *' # Every hour
     workflow_dispatch: # Manual trigger (Optional)

   jobs:
     yuki-no:
       runs-on: ubuntu-latest
       steps:
         - uses: Gumball12/yuki-no@v1
           with:
             # [Required]
             # GitHub access token.
             access-token: ${{ secrets.GITHUB_TOKEN }}

             # [Required]
             # The head repo to track. This is the repository you want to
             # take a diff.
             head-repo: https://github.com/head-user/head-repo.git

             # [Required]
             # The git commit sha of head repo to start tracking. Yuki-no will
             # only track commit from this hash.
             #
             # WARNING: TRACK_FROM commit is not included, tracking starts from
             # the next commit
             track-from: head-commit-hash

             # [Optional]
             # List of file patterns to track. Multiple patterns can be specified
             # with newlines. Files matching these Glob patterns will be included
             # in tracking.
             # If empty, all files will be tracked.
             #
             # (Glob Pattern: https://github.com/micromatch/picomatch?tab=readme-ov-file#advanced-globbing)
             include: |
               docs/**

             # [Optional]
             # Whether to enable release tracking.
             # When enabled, Yuki-no will track releases for each issue and add
             # comments about release status. Defaults to 'false'
             release-tracking: true
   ```

   Once configured, Yuki-no will create issues in your repository for any new changes in the `head-repo`. On its first run, it will process all commits after the specified `track-from` hash with your `include` and `exclude` filters. If you've enabled `on.workflow_dispatch`, you can also [trigger the action manually](https://docs.github.com/en/actions/managing-workflow-runs-and-deployments/managing-workflow-runs/manually-running-a-workflow) to process changes immediately.

### Configuration

| Option                    | Required | Default                    | Description                                                                                                                     |
| ------------------------- | -------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `access-token`            | Yes      | -                          | GitHub access token.                                                                                                            |
| `username`                | No       | `github-actions`           | Git username used for GitHub issue operations.                                                                                  |
| `email`                   | No       | `action@github.com`        | Git username used for GitHub issue operations.                                                                                  |
| `upstream-repo`           | No       | Current working repository | URL of your repository.                                                                                                         |
| `head-repo`               | Yes      | -                          | URL of repository to track                                                                                                      |
| `track-from`              | Yes      | -                          | Starting commit hash. Tracking starts from the next commit.                                                                     |
| `head-repo-branch`        | No       | `main`                     | Branch to track in head repo                                                                                                    |
| `include`                 | No       | -                          | Glob patterns for files to track. If not specified, all files will be tracked.                                                  |
| `exclude`                 | No       | -                          | Glob patterns for files to exclude. Take precedence over include patterns.                                                      |
| `labels`                  | No       | `sync`                     | Labels for issues. You can specify multiple labels separated by newlines. If empty string is provided, no labels will be added. |
| `release-tracking`        | No       | `false`                    | When enabled, Yuki-no will track releases for each commit and add comments about release status.                                |
| `release-tracking-labels` | No       | `pending`                  | Labels for unreleased changes. Added to issues until changes are released. (newline separated)                                  |
| `verbose`                 | No       | `true`                     | When enabled, Yuki-no will show all log messages including info and success messages.                                           |

#### File Pattern Examples

```yaml
# Track only markdown(*.md) and TypeScript(*.ts) files
include: |
  **/*.md
  **/*.ts

# Exclude test files
exclude: |
  **/*.test.ts
  **/__tests__/**
```

For more information on Glob Patterns, see [Picomatch docs](https://github.com/micromatch/picomatch?tab=readme-ov-file#advanced-globbing).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and contribution guidelines.

## License

MIT License. See [LICENSE](LICENSE) for details.
