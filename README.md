# Yuki-no

[![CI](https://github.com/Gumball12/yuki-no/actions/workflows/ci.yml/badge.svg)](https://github.com/Gumball12/yuki-no/actions/workflows/ci.yml) [![codecov](https://codecov.io/gh/Gumball12/yuki-no/graph/badge.svg?token=BffFcZn5Dn)](https://codecov.io/gh/Gumball12/yuki-no)

<img width="350" src="docs/logo.webp" title="logo" alt="logo">

Yuki-no (雪の, means "of snow" in Japanese) is a GitHub Action that creates issues from the head repo based on its commits. This is particularly useful for tracking changes between repositories, especially in documentation translation projects.

## Features

- Automatically tracks commits from a head repository
- Creates issues for new changes
- Filters changes based on file paths
- Supports custom labels for issues
- Tracks release status with pre-release and release information

## Usage

1. **Required**: Configure workflow permissions

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

          # File path to track. If specified, Yuki-no will only track commits
          # that modified files under this path. If not specified, it will
          # track all files in the project root. Optional.
          path-starts-with: docs/

          # Whether to enable release tracking.
          # When enabled, Yuki-no will track releases for each issue
          # and add comments about release status. Optional.
          # Defaults to 'false'
          release-tracking: true
```

### Configuration

| Option             | Required | Default             | Description                           |
| ------------------ | -------- | ------------------- | ------------------------------------- |
| `access-token`     | Yes      | -                   | GitHub access token                   |
| `head-repo`        | Yes      | -                   | URL of repository to track            |
| `track-from`       | Yes      | -                   | Starting commit hash                  |
| `path-starts-with` | No       | -                   | Path filter for changes               |
| `labels`           | No       | `sync`              | Labels for issues (newline separated) |
| `release-tracking` | No       | `false`             | Enable release status tracking        |
| `verbose`          | No       | `true`              | Enable verbose logging                |
| `username`         | No       | `github-actions`    | Git username for commits              |
| `email`            | No       | `action@github.com` | Git email for commits                 |
| `upstream-repo`    | No       | Current repository  | URL of your repository                |
| `head-repo-branch` | No       | `main`              | Branch to track in head repo          |

### How It Works

1. Monitors the head repository for new commits
2. When new commits are found:
   - Checks if the commit is newer than the last successful workflow run
   - Creates issues for new changes with specified labels
   - Tracks release status if enabled
3. For release tracking:
   - Monitors pre-release and release tags
   - Updates issue comments with status changes
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
- By default, Yuki-no uses the `sync` label

#### GitHub Actions Bot

- The default `username` and `email` settings are optimized for most use cases.
- Yuki-no uses [GitHub Actions bot](https://docs.github.com/en/actions/using-workflows/about-github-actions#about-github-actions) by default.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and contribution guidelines.

## License

MIT License. See [LICENSE](LICENSE) for details.
