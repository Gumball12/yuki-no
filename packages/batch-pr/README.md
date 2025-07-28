# @yuki-no/plugin-batch-pr

[![NPM Version](https://img.shields.io/npm/v/@yuki-no/plugin-batch-pr?style=flat-square&label=@yuki-no/plugin-batch-pr)](https://www.npmjs.com/package/@yuki-no/plugin-batch-pr)

Collects opened Yuki-no translation issues and creates a single pull request to consolidate changes.

## Usage

```yaml
- uses: Gumball12/yuki-no@v1
  with:
    plugins: |
      @yuki-no/plugin-batch-pr@latest
```

## Configuration

This plugin uses yuki-no's built-in `include` and `exclude` options to determine which files to track.

## How It Works

1. Collects all opened yuki-no translation issues
2. Extracts file changes from each issue's commits
3. Applies changes to a unified branch
4. Creates or updates a single pull request with all changes
5. Links all related issues in the PR description
