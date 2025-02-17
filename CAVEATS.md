# Important Notes About Yuki-no

## Initial Run and Performance

When you first run Yuki-no, it processes all commits after the specified `track-from` hash, which can take considerable time depending on the number of changes. However, this is only a one-time process. After the initial success run, Yuki-no intelligently tracks the timestamp of its last successful run and only processes newer commits, significantly improving performance in subsequent runs.

## GitHub API Rate Limits

During the initial run or when processing many changes, you might encounter GitHub's secondary rate limit error:

```
You have exceeded a secondary rate limit and have been temporarily blocked from content creation.
```

This is a normal occurrence and requires no manual intervention. When this happens, Yuki-no will automatically resume from where it left off in the next scheduled run. This behavior applies to both issue creation and `release-tracking` features. Failed operations are not lost; they're simply postponed to the next run.

## API Usage and Error Recovery

Yuki-no implements several strategies to minimize API usage and handle rate limits gracefully:

- Processes commits in batches of 5
- Maintains delays between operations
- Implements automatic error recovery

Most API-related errors, including rate limit exceeded errors, are automatically handled in subsequent runs without requiring any manual intervention. The system is designed to be resilient and self-recovering, ensuring that no changes are missed even when temporary failures occur.

## Repository Configuration

When running Yuki-no in a GitHub Actions environment, the upstream repository is automatically inferred using the `GITHUB_SERVER_URL` and `GITHUB_REPOSITORY` environment variables. Manual specification of the `upstream-repo` is only necessary in specific cases, such as local development where these environment variables aren't available.

For local development environments, you'll need to explicitly set the `UPSTREAM_REPO` value. More details about local environment setup can be found in our [Contributing Guide](./CONTRIBUTING.md).

## Issue Management

Yuki-no uses a label-based system to identify and manage issues. An issue is considered a Yuki-no issue only when it has all the labels specified in your configuration's `labels` option. For instance, if you configure:

```yml
labels: |
  sync
  needs review
```

an issue must have both the "sync" and "needs review" labels to be managed by Yuki-no. By default, Yuki-no uses the "sync" label if no custom labels are specified.

When `release-tracking` is enabled, Yuki-no adds additional labels to track the release status of changes. These `release-tracking-labels` (default: "pending") are automatically added to issues for unreleased changes and removed once the changes are included in a release. Any overlap between regular `labels` and `release-tracking-labels` is automatically handled to prevent duplication.

## GitHub Actions Integration

Yuki-no is optimized to work with GitHub Actions and uses the GitHub Actions bot by default for all operations. The default `username` ("github-actions") and `email` ("action@github.com") settings are configured for optimal integration with GitHub Actions, though these can be customized if needed.
