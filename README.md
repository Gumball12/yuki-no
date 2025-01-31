# Yuki-no

[![codecov](https://codecov.io/gh/Gumball12/yuki-no/graph/badge.svg?token=BffFcZn5Dn)](https://codecov.io/gh/Gumball12/yuki-no)

Yuki-no (雪の, means "of snow" in Japanese) is a GitHub Action that tracks changes from a source repository and creates issues in your repository for each relevant change. This is particularly useful for tracking upstream changes in documentation translation projects.

## Project History

Yuki-no is a fork of [Ryu-Cho](https://github.com/vuejs-translations/ryu-cho), which itself was a fork of [Che-Tsumi](https://github.com/vuejs-jp/che-tsumi). While maintaining the core functionality, Yuki-no takes a different approach:

- Uses pure GitHub API instead of Git operations
- Simplifies configuration

The name "Yuki-no" was chosen to represent the project's goal of maintaining a clean and pure tracking system, like freshly fallen snow.

## Features

- Automatically tracks commits from a source repository
- Creates issues for new changes
- Filters changes based on file paths (defaults to project root if not specified)
- Simple configuration and setup

## Usage

1. **Required**: Configure workflow permissions in your repository settings:

   - Go to Settings > Actions > General > Workflow permissions
   - Select "Read and write permissions"
   - Save the changes

   ![Workflow Permissions Settings](docs/settings.png)

   This step is mandatory as Yuki-no needs write permissions to create issues in your repository. Without this configuration, the action will fail.
   If you're seeing 403 (Forbidden) errors, this permission setting is usually the solution.

2. The action uses GitHub token for authentication. By default, you can use `secrets.GITHUB_TOKEN` which is automatically provided by GitHub Actions. This token has the necessary permissions to create issues in your repository.

3. Create `.github/workflows/yuki-no.yml` in your repository:

```yml
name: yuki-no

on:
  schedule:
    - cron: '*/5 * * * *' # Runs every 5 minutes
  workflow_dispatch: # Allows manual trigger

jobs:
  yuki-no:
    name: Yuki-no
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: Gumball12/yuki-no@v1
        with:
          # GitHub token for authentication (uses repository's token)
          access-token: ${{ secrets.GITHUB_TOKEN }}

          # Required: Git user info
          # Tip: Using github-actions bot credentials is recommended
          # as it clearly indicates that the issues are created by
          # an automated process
          username: github-actions
          email: 'action@github.com'

          # Required: Repository where issues will be created
          head-repo: https://github.com/your-org/your-repo.git

          # Required: Source repository to track changes from
          upstream-repo: https://github.com/original/repo.git

          # Optional: Source repository's branch (defaults to 'main')
          upstream-repo-branch: main

          # Optional: Only track changes in specific paths (defaults to project root)
          path-starts-with: docs/

          # Required: Initial commit to start tracking from
          initial-commit: 4ed8b2f83a2f149734f3c5ecb6438309bd85a9e5
```

## How It Works

1. When run, it fetches new commits from the upstream repository (source repository) since the last processed commit.
2. For each new commit:
   - If `path-starts-with` is set, checks if the commit modifies files in that path
   - Creates an issue in your repository (head repository) with details about the change

## Configuration

| Option                 | Required | Description                                                |
| ---------------------- | -------- | ---------------------------------------------------------- |
| `access-token`         | Yes      | GitHub token for authentication                            |
| `username`             | Yes      | Git username for creating issues                           |
| `email`                | Yes      | Git email for creating issues                              |
| `head-repo`            | Yes      | Your repository URL (where issues will be created)         |
| `upstream-repo`        | Yes      | Source repository URL to track changes from                |
| `upstream-repo-branch` | No       | Source repository branch (default: main)                   |
| `path-starts-with`     | No       | Only track changes in specific path                        |
| `initial-commit`       | Yes      | Starting commit hash for tracking in the source repository |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and contribution guidelines.

## License

This project is licensed under the MIT License. The original work was created by [Vue.js Japan User Group](https://github.com/vuejs-jp), and additional modifications were made by [shj](https://github.com/Gumball12/). See [LICENSE](LICENSE) for the complete license text.

The copyright notice reflects both the original work and subsequent modifications:

- Original work: Copyright (c) 2021 Vue.js Japan User Group
- Modified work: Copyright (c) 2024 shj

This approach to licensing maintains the spirit of open source collaboration while properly attributing both the original creators and subsequent contributors.
