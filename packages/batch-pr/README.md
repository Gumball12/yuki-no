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

## Permissions

**This plugin requires additional permissions** beyond the default yuki-no setup:

```yaml
permissions:
  # Default yuki-no permissions
  issues: write
  actions: read

  # Required for branch creation and push operations
  contents: write

  # Required for batch PR creation
  pull-requests: write
```

## Configuration

This plugin uses yuki-no's built-in `include` and `exclude` options to determine which files to track.

## How It Works

1. Collects all opened yuki-no translation issues
2. Extracts file changes from each issue's commits
3. Applies changes to a unified branch
4. Creates or updates a single pull request with all changes
5. Links all related issues in the PR description

## Important Notes

### Closed Issue Handling

When an issue tracked in a batch PR is closed, **the plugin does not automatically revert its changes** from the batch PR. This behavior is intentional for the following reasons:

- **Preserves manual edits**: Prevents accidental removal of changes you may have made directly in the batch PR
- **Avoids complex conflicts**: Reduces the risk of merge conflicts with other tracked issues
- **Maintains stability**: Ensures predictable behavior and file states

If you need to remove changes from closed issues, close the current batch PR and re-run the yuki-no action to create a fresh batch PR with only the currently open issues.

### Release Tracking Integration

When using [`@yuki-no/plugin-release-tracking`](../release-tracking/), **not released issues are automatically excluded** from batch PR collection. If release tracking is not installed, all opened translation issues will be included in the batch as normal.
