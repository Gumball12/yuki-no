# Yuki-no

[![CI](https://github.com/Gumball12/yuki-no/actions/workflows/ci.yml/badge.svg)](https://github.com/Gumball12/yuki-no/actions/workflows/ci.yml) [![codecov](https://codecov.io/gh/Gumball12/yuki-no/graph/badge.svg?token=BffFcZn5Dn)](https://codecov.io/gh/Gumball12/yuki-no)

Yuki-no (means "fluent" in Japanese) is a GitHub Action that creates issues and PRs from the head repo based on its commit. Very useful for tracking diffs between translating docs, for example.

Yuki-no is a fork of [Che-Tsumi](https://github.com/vuejs-jp/che-tsumi). It works almost identical, while Che-Tsumi works as a stand-alone service while Yuki-no works with GitHub Action.

## Usage

Yuki-no requires GitHub authentication to create issues and PRs to the repository. At first, create [Encrypted secret](https://docs.github.com/en/actions/reference/encrypted-secrets) that has access to the repository which you want to set up Yuki-no. Here we assume you've created a secret called `ACCESS_TOKEN`.

Next, create `.github/workflows/yuki-no.yml` file in your repository. Then configure the yaml file.

```yml
name: yuki-no

on:
  # Schedule the interval of the checks.
  schedule:
    - cron: '*/5 * * * *'

jobs:
  yuki-no:
    name: Yuki-no
    runs-on: ubuntu-latest
    steps:
      - uses: Gumball12/yuki-no@v1
        with:
          # GitHub access token. Required.
          access-token: ${{ secrets.GITHUB_TOKEN }}

          # Git user name to use when making issues and PRs. Optional.
          # Defaults to 'github-actions'.
          # Note: Using only one of username or email might cause GitHub Actions bot to work incorrectly.
          username: github-actions

          # Git email address to use when making issues and PRs. Optional.
          # Defaults to 'action@github.com'.
          # Note: Using only one of username or email might cause GitHub Actions bot to work incorrectly.
          email: 'action@github.com'

          # The url for the upstream repo. This is the repository that you
          # set up Yuki-no. Required.
          upstream-repo: https://github.com/vitejs/docs-ko.git

          # The head repo to track. This is the repository you want to
          # take a diff. Required.
          head-repo: https://github.com/vitejs/vite.git

          # The branch for the head repo. Optional.
          # Defaults to 'main'.
          head-repo-branch: main

          # The git commit sha of head repo to start tracking. Yuki-no will
          # only track commit from this hash. Required.
          track-from: 4ed8b2f83a2f149734f3c5ecb6438309bd85a9e5

          # File path to track. If specified, Yuki-no will only track commits
          # that modified files under this path. If not specified, it will
          # track all files in the project root. Optional.
          path-starts-with: docs/

          # Labels to add to the issues. You can specify multiple labels.
          # Each label must be separated by a newline. Optional.
          # If empty string('') is provided, no labels will be added.
          # Defaults to 'sync'.
          labels: |
            sync
            needs review
            my-label

          # Whether to enable release tracking.
          # When enabled, Yuki-no will track releases for each issue
          # and add comments about release status. Optional.
          # Defaults to 'false'
          release-tracking: true
```
