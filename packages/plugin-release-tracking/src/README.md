# Core Plugin: Release Tracking

This plugin tracks the release status for each commit and automatically updates issue information with release details.

## Features

- **Automatic Label Management**: Automatically adds specified labels for unreleased changes and removes them after release.
- **Release Status Comments**: Automatically adds comments showing pre-release and release status to each issue.
- **Existing Issue Tracking**: Tracks both newly created issues and existing open issues.

This plugin automatically excludes any labels that are already configured in the main `labels` option to avoid conflicts.

## Usage

### Direct Plugin Usage

```yaml
- uses: yuki-no-2
  env:
    RELEASE_TRACKING_LABELS: |
      pending
      needs-release
  with:
    plugins: |
      @gumball12/yuki-no-plugin-release-tracking
```

### Legacy Compatibility

Previously, release tracking was configured using the `release-tracking` and `release-tracking-labels` options directly in the workflow configuration. With the introduction of the plugin system, release tracking is now implemented as a core plugin for better modularity and extensibility.

For backward compatibility and migration details, see [COMPATIBILITY.md](../../../docs/COMPATIBILITY.md#legacy-release-tracking-support).

## Configuration

This plugin reads configuration from environment variables:

- `RELEASE_TRACKING_LABELS`: Labels to add for unreleased changes (default: `pending`). This is set via the `RELEASE_TRACKING_LABELS` env in your workflow configuration.

### Comment Generation

Comments are added to each issue in the following format:

```
- pre-release: [v1.0.0-beta.1](https://github.com/owner/repo/releases/tag/v1.0.0-beta.1)
- release: [v1.0.0](https://github.com/owner/repo/releases/tag/v1.0.0)
```

When no release information is available:

```
- pre-release: none
- release: none
```
