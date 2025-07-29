# @yuki-no/plugin-batch-pr

[![NPM Version](https://img.shields.io/npm/v/@yuki-no/plugin-batch-pr?style=flat-square&label=@yuki-no/plugin-batch-pr)](https://www.npmjs.com/package/@yuki-no/plugin-batch-pr)

Collects opened Yuki-no translation issues and creates a single pull request to consolidate changes.

## Usage

```yaml
- uses: Gumball12/yuki-no@v1
  env:
    # [optional] Specifies the root directory path in the `head-repo`
    # that should be stripped when applying changes to `upstream-repo`
    YUKI_NO_BATCH_PR_ROOT_DIR: docs
  with:
    plugins: |
      @yuki-no/plugin-batch-pr@latest
```

### Configuration

This plugin reads configuration from environment variables:

- `YUKI_NO_BATCH_PR_ROOT_DIR` (_optional_): Specifies the root directory path in the `head-repo` that should be stripped from file paths when applying changes to the `upstream-repo`. When set, this prefix will be removed from head-repo file paths before applying changes. If not specified, files will be applied with their original paths.
- `YUKI_NO_BATCH_PR_EXCLUDE` (_optional_): Specifies file patterns to exclude from batch PR processing. Supports glob patterns and multiple patterns separated by newlines.

### `YUKI_NO_BATCH_PR_ROOT_DIR`

The `YUKI_NO_BATCH_PR_ROOT_DIR` option allows you to specify a root directory path in the head repository that should be stripped when applying changes to the upstream repository. This is particularly useful when your head repository has a different directory structure than your upstream repository.

For example, if your head repository has documentation in a `docs/` folder, but your upstream repository expects the files at the root level, you can configure:

```yaml
env:
  YUKI_NO_BATCH_PR_ROOT_DIR: docs
```

This will ensure that when applying changes from `docs/README.md` in your head repository, they will be applied to `README.md` in the upstream repository (the `docs/` prefix is stripped).

### `YUKI_NO_BATCH_PR_EXCLUDE`

The `YUKI_NO_BATCH_PR_EXCLUDE` option allows you to specify file patterns that should be excluded from batch PR processing. This is useful when you want to exclude certain files like build artifacts, temporary files, or sensitive files from being included in the batch PR.

The option supports glob patterns and can accept multiple patterns, each on a separate line:

```yaml
env:
  YUKI_NO_BATCH_PR_EXCLUDE: |
    *.log
    temp/**
    build/*
    .env*
    **/*.tmp
```

Note that this behaves slightly differently from Yuki-no's `exclude` option. The `exclude` option is used when creating issues from `head-repo` changes. For more details, please refer to the [Yuki-no Configuration](../../README.md#configuration) section.

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
