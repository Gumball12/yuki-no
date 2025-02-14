# Yuki-no

[![CI](https://github.com/Gumball12/yuki-no/actions/workflows/ci.yml/badge.svg)](https://github.com/Gumball12/yuki-no/actions/workflows/ci.yml) [![codecov](https://codecov.io/gh/Gumball12/yuki-no/graph/badge.svg?token=BffFcZn5Dn)](https://codecov.io/gh/Gumball12/yuki-no)

<img width="350" src="docs/logo.webp" title="logo" alt="logo">

Yuki-no (雪の, means "of snow" in Japanese) is a GitHub Action that creates issues from the head repo based on its commits. This is particularly useful for tracking changes between repositories, especially in documentation translation projects.

> **Why Yuki-no?** Looking for a reliable, automated solution for managing documentation translation? Check out [why Yuki-no](./WHY.md) might be the right choice for your project.

## Features

- Automatically tracks commits from a head repository
- Creates issues for new changes
- Filters changes based on file paths
- Supports custom labels for issues
- Tracks release status with pre-release and release information
- Manages release tracking labels for unreleased changes

Yuki-no is actively used in the [Vite Korean docs translation project](https://github.com/vitejs/docs-ko), demonstrating its effectiveness in real-world translation workflows.

## Usage

1. **Required**: Configure workflow permissions

   ![settings](./docs/settings.webp)

   - Go to Settings > Actions > General > Workflow permissions
   - Select "Read and write permissions"
   - Save the changes

2. Create `.github/workflows/yuki-no.yml`:

   ```yml
   name: yuki-no

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
             # GitHub access token. Required.
             access-token: ${{ secrets.GITHUB_TOKEN }}

             # The head repo to track. This is the repository you want to
             # take a diff. Required.
             head-repo: https://github.com/head-user/head-repo.git

             # The git commit sha of head repo to start tracking. Yuki-no will
             # only track commit from this hash. Required.
             track-from: head-commit-hash

             # List of file patterns to track. Multiple patterns can be specified
             # with newlines. Files matching these Glob patterns will be included
             # in tracking.
             # Glob Pattern: https://github.com/micromatch/picomatch?tab=readme-ov-file#advanced-globbing
             # If empty, all files will be tracked. Optional.
             include: |
               docs/**

             # Whether to enable release tracking.
             # When enabled, Yuki-no will track releases for each issue
             # and add comments about release status. Optional.
             # Defaults to 'false'
             release-tracking: true
   ```

   Once configured, Yuki-no will create issues in your repository for any new changes in the `head-repo`. On its first run, it will process all commits after the specified `track-from` hash with your `include` and `exclude` filters. If you've enabled `workflow_dispatch`, you can also [trigger the action manually](https://docs.github.com/en/actions/managing-workflow-runs-and-deployments/managing-workflow-runs/manually-running-a-workflow) to process changes immediately.

### Configuration

| Option                    | Required | Default             | Description                           |
| ------------------------- | -------- | ------------------- | ------------------------------------- |
| `access-token`            | Yes      | -                   | GitHub access token                   |
| `head-repo`               | Yes      | -                   | URL of repository to track            |
| `track-from`              | Yes      | -                   | Starting commit hash                  |
| `include`                 | No       | -                   | Glob patterns for files to track      |
| `exclude`                 | No       | -                   | Glob patterns for files to exclude    |
| `labels`                  | No       | `sync`              | Labels for issues (newline separated) |
| `release-tracking`        | No       | `false`             | Enable release status tracking        |
| `release-tracking-labels` | No       | `pending`           | Labels for unreleased changes         |
| `verbose`                 | No       | `true`              | Enable verbose logging                |
| `username`                | No       | `github-actions`    | Git username for commits              |
| `email`                   | No       | `action@github.com` | Git email for commits                 |
| `upstream-repo`           | No       | Current repository  | URL of your repository                |
| `head-repo-branch`        | No       | `main`              | Branch to track in head repo          |

For more detailed option descriptions, please refer to the [config.ts](./src/config.ts).

#### File Pattern Examples

```yaml
# Track only markdown and TypeScript files
include: |
  **/*.md
  **/*.ts

# Exclude test files
exclude: |
  **/*.test.ts
  **/__tests__/**
```

### How It Works

1. Monitors the head repository for new commits
2. When new commits are found:
   - Checks if the commit is newer than the last successful workflow run
   - Creates issues for new changes with specified labels
   - Tracks release status if enabled
3. For release tracking:
   - Monitors pre-release and release tags
   - Updates issue comments with status changes
   - Manages release tracking labels for unreleased changes
   - Stops tracking when final release is available

### Caveats

#### Commit Processing

- Commits are processed based on their timestamp relative to the last successful workflow run
- If no successful workflow run exists, all commits will be processed
- Commits older than the last successful run are skipped to avoid duplicate processing

#### Upstream Repository Option (`upstream-repo`)

- The automatic inference using `GITHUB_SERVER_URL` and `GITHUB_REPOSITORY` environment variables is recommended for GitHub Actions environments.
- Manual specification of `upstream-repo` is optional and only needed in specific cases.
- For local development, you'll need to set the `UPSTREAM_REPO` value as these variables aren't available in the local environment. See [Local environment setup](https://github.com/Gumball12/yuki-no/blob/main/CONTRIBUTING.md#local-environment-setup).

#### Issue Labels

- Yuki-no uses labels to identify issues it manages.
- An issue is considered a Yuki-no issue if it has all the labels specified in the `labels` option.
- For example:
  - If `labels: sync\nneeds review` is set, an issue must have both labels to be managed
  - If an issue has `sync, needs review, other` labels and `labels: sync\nneeds review` is set, it will be managed
  - If an issue has `sync, other` labels and `labels: sync\nneeds review` is set, it will be ignored
- If an empty string is provided, no labels will be added
- By default, Yuki-no uses the `sync` label

#### Release Tracking Labels

- Release tracking labels are only used when **release tracking is enabled**
  - Labels are added to issues that haven't been released yet
  - Labels are removed when the changes are included in a release
  - Any labels that overlap with the `labels` option are filtered out
- If an empty string is provided, no labels will be added
- By default, Yuki-no uses the `pending` label

#### GitHub Actions Bot

- The default `username` and `email` settings are optimized for most use cases.
- Yuki-no uses [GitHub Actions bot](https://docs.github.com/en/actions/using-workflows/about-github-actions#about-github-actions) by default.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and contribution guidelines.

## License

MIT License. See [LICENSE](LICENSE) for details.
