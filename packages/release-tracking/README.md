# @yuki-no/plugin-release-tracking

[![NPM Version](https://img.shields.io/npm/v/@yuki-no/plugin-release-tracking?style=flat-square&label=@yuki-no/plugin-release-tracking)](https://www.npmjs.com/package/@yuki-no/plugin-release-tracking)

This plugin tracks the release status for each commit and automatically updates issue information with release details.

## Features

- **Automatic Label Management:** Automatically adds specified labels for unreleased changes and removes them after release.
- **Release Status Comments:** Automatically adds comments showing pre-release and release status to each issue.

## Usage

```yaml
- uses: Gumball12/yuki-no@v1
  env:
    # [optional]
    # Labels to add for unreleased changes
    YUKI_NO_RELEASE_TRACKING_LABELS: |
      pending
      needs-release
  with:
    plugins: |
      @yuki-no/plugin-release-tracking@latest
```

### Configuration

This plugin reads configuration from environment variables:

- `YUKI_NO_RELEASE_TRACKING_LABELS` (_optional_): Labels to add for unreleased changes (default: `pending`)

To avoid conflicts, overlapping labels in `YUKI_NO_RELEASE_TRACKING_LABELS` with yuki-no `labels` option are automatically excluded.

## Comment Generation

Comments are added to each issue in the following format:

```md
- pre-release: [v1.0.0-beta.1](https://github.com/owner/repo/releases/tag/v1.0.0-beta.1)
- release: [v1.0.0](https://github.com/owner/repo/releases/tag/v1.0.0)
```

When no release information is available:

```md
- pre-release: none
- release: none
```
