# Yuki-no

[![CI](https://github.com/Gumball12/yuki-no/actions/workflows/ci.yml/badge.svg)](https://github.com/Gumball12/yuki-no/actions/workflows/ci.yml) [![codecov](https://codecov.io/gh/Gumball12/yuki-no/graph/badge.svg?token=BffFcZn5Dn)](https://codecov.io/gh/Gumball12/yuki-no)

Yuki-no (雪の, means "of snow" in Japanese) is a GitHub Action that creates issues from the head repo based on its commits. This is particularly useful for tracking changes between repositories, especially in documentation translation projects.

## Project History

Yuki-no is a fork of [Ryu-Cho](https://github.com/vuejs-translations/ryu-cho), which itself was a fork of [Che-Tsumi](https://github.com/vuejs-jp/che-tsumi). While maintaining the core functionality, Yuki-no enhances the experience with additional features:

- Custom issue labels for better organization
- Release tracking for version management
- Improved configuration options

The name "Yuki-no" (雪の, "of snow") was chosen to represent the project's goal of maintaining a clean and pure tracking system, like freshly fallen snow.

## Features

- Automatically tracks commits from a head repository
- Creates issues for new changes
- Filters changes based on file paths
- Supports custom labels for issues
- Tracks release status with pre-release and release information

## Usage

1. **Required**: Configure workflow permissions in your repository settings:

   ![Workflow Permissions Settings](docs/settings.png)

   - Go to Settings > Actions > General > Workflow permissions
   - Select "Read and write permissions"
   - Save the changes

   This step is mandatory as Yuki-no needs write permissions to create issues in your repository.
   If you're seeing 403 (Forbidden) errors, this permission setting is usually the solution.

2. Create `.github/workflows/yuki-no.yml` in your repository:

```yml
name: yuki-no

on:
  # Schedule the interval of the checks.
  schedule:
    - cron: '0 * * * *' # Every hour
  # Allow manual trigger (Optional)
  workflow_dispatch:

jobs:
  yuki-no:
    name: Yuki-no
    runs-on: ubuntu-latest
    steps:
      - uses: Gumball12/yuki-no@v1
        with:
          # GitHub access token. Required.
          access-token: ${{ secrets.GITHUB_TOKEN }}

          # The url for the upstream repo. This is the repository that you
          # set up Yuki-no. Required.
          upstream-repo: https://github.com/upstream-user/upstream-repo.git

          # The head repo to track. This is the repository you want to
          # take a diff. Required.
          head-repo: https://github.com/head-user/head-repo.git

          # The branch for the head repo. Optional.
          # Defaults to 'main'.
          head-repo-branch: main

          # The git commit sha of head repo to start tracking. Yuki-no will
          # only track commit from this hash. Required.
          track-from: head-commit-hash

          # Labels to add to the issues. You can specify multiple labels.
          # Each label must be separated by a newline. Optional.
          # If empty string('') is provided, no labels will be added.
          # Defaults to 'sync'.
          labels: |
            sync

          # Whether to enable release tracking.
          # When enabled, Yuki-no will track releases for each issue
          # and add comments about release status. Optional.
          # Defaults to 'false'
          release-tracking: true

          # Whether to enable verbose logging.
          # When enabled, Yuki-no will show all log messages including info and success messages.
          # This is useful for debugging.
          # Defaults to 'false'
          verbose: true
```

### Configuration

| Option             | Required | Default             | Description                                                                             |
| ------------------ | -------- | ------------------- | --------------------------------------------------------------------------------------- |
| `access-token`     | Yes      | -                   | GitHub access token                                                                     |
| `username`         | No       | `github-actions`    | Git username for commits                                                                |
| `email`            | No       | `action@github.com` | Git email for commits                                                                   |
| `upstream-repo`    | Yes      | -                   | URL of your repository                                                                  |
| `head-repo`        | Yes      | -                   | URL of repository to track                                                              |
| `head-repo-branch` | No       | `main`              | Branch to track in head repo                                                            |
| `track-from`       | Yes      | -                   | Starting commit hash                                                                    |
| `path-starts-with` | No       | -                   | Path filter for changes (If not specified, it will track all files in the project root) |
| `labels`           | No       | `sync`              | Labels for issues (newline separated)                                                   |
| `release-tracking` | No       | `false`             | Enable release status tracking                                                          |
| `verbose`          | No       | `false`             | Enable verbose logging                                                                  |

## How It Works

1. Monitors the head repository for new commits
2. When new commits are found:
   - Creates issues in your repository with commit details
   - If enabled, tracks release(`release-tracking: true`) status of changes
3. For release tracking:
   - Monitors both pre-release and release tags
   - Updates issue comments with release status
   - Stops tracking when final release is available

## GitHub API Usage Considerations

While most users won't need to worry about API usage, this section is provided for those who frequently interact with GitHub's API through other applications or workflows. If you're experiencing rate limit errors, this information will be particularly relevant. For more details about GitHub's API rate limits, see [GitHub's documentation on rate limiting](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api?apiVersion=2022-11-28).

### Comparing Release Tracking Options

**releaseTracking: `false` (Default)**

- GitHub API calls: Minimal, only for basic issue creation
- API calls per issue: 2-3 calls (issue search, creation)
- Advantages:
  - Lower API usage
  - Faster execution time
- Best for:
  - Simple translation tracking needs
  - When API usage needs to be minimized

**releaseTracking: `true`**

- GitHub API calls: Requires release information check for all open issues
- API calls per issue: 4-5+ calls (issue search, creation, comments)
- Advantages:
  - Track which version includes your translations
  - View release status directly in issues
- Best for:
  - When tracking release status is important
  - When API quota is not a concern

### Recommended cron settings

- releaseTracking: false → Every 10 minutes (`*/10 * * * *`)
- releaseTracking: true → Every hour (`0 * * * *`)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and contribution guidelines.

## License

MIT License. See [LICENSE](LICENSE) for details.
