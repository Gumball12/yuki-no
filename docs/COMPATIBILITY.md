# Compatibility

## Plugin System

Yuki-no maintains backward compatibility for all existing workflows. Recent updates introduced a plugin system that automatically handles legacy options.

### Legacy `release-tracking` Support

Your existing `release-tracking` configurations continue to work without changes:

```yaml
# Legacy style (still fully supported)
- uses: Gumball12/yuki-no@v1
  with:
    release-tracking: true
    release-tracking-labels: |
      pending
      needs-release
```

### Recommended Approach

For new projects, we recommend using the explicit plugin syntax with environment variables:

```yaml
# Recommended style
- uses: Gumball12/yuki-no@v1
  env:
    RELEASE_TRACKING_LABELS: |
      pending
      needs-release
  with:
    plugins: |
      release-tracking
```

### Key Changes

- **Plugin System**: Release tracking is now implemented as a plugin (`release-tracking`)
- **Environment Variables**: `release-tracking-labels` option moved to `RELEASE_TRACKING_LABELS` environment variable
- **Automatic Migration**: Legacy `release-tracking` option automatically enables the plugin

### Deprecated Options

The following options are deprecated but still supported for backward compatibility:

- `release-tracking`: Use `plugins: ["release-tracking"]` instead
- `release-tracking-labels`: Use `env.RELEASE_TRACKING_LABELS` instead
