# Migrate to Yuki-no

This guide explains how to use Yuki-no in projects that have translation processes based on GitHub Issues, such as those using Ryu-Cho.

## Migration Process

### Eligible Projects

- Projects with translation processes based on GitHub Issues, like Ryu-Cho
  - Tracks Head Repo changes through GitHub Issues
  - Each Issue is linked to a specific commit in the Head Repo
  - Head Repo must be a Public GitHub repository
- GitHub Issues must contain GitHub Commit URLs for original commits
  - GitHub Commit URL format: `https://github.com/<org_name>/<repo_name>/commit/<commit_hash>`
  - Examples:
    ```
    New updates on head repo.
    https://github.com/test/test/commit/1234567
    ```
    ```md
    Previous translation process: [See Commit](https://github.com/test/test/commit/1234567)
    ```

### Migration Steps

1. Add Labels for Yuki-no Tracking to Translation Issues

   <img width="400" src="./docs/create-sync-label.webp" title="Create Sync Label" alt="Create Sync Label">

   - Yuki-no identifies translation Issues it manages through Issue Labels.
   - To set this up, access GitHub and create labels for synchronization, such as `sync`. Then, add these labels to your existing translation Issues.
   - Note: Using these labels on non-translation Issues may cause unexpected behavior.

2. Create Yuki-no Action Configuration File

   <img width="350" src="./docs/create-an-action.webp" title="Create an Action" alt="Create an Action">

   - Remove any existing Action configuration files used for synchronization (e.g., Ryu-Cho).
   - Then, create a new Yuki-no Action configuration file by referring to the [Usage](https://github.com/Gumball12/yuki-no?tab=readme-ov-file#usage) section. If migrating from Ryu-Cho, you can refer to the [Yuki-no Options vs Ryu-Cho Options](#yuki-no-options-vs-ryu-cho-options) section.

3. Run the Action

   - Wait for the next Cron schedule, or if you've enabled `on.workflow_dispatch`, you can trigger the action manually (see [GitHub docs](https://docs.github.com/en/actions/managing-workflow-runs-and-deployments/managing-workflow-runs/manually-running-a-workflow))
   - The first run may take some time as it processes all commits after the `track-from` hash.
   - Check your translation Issues after execution.

#### Yuki-no Options vs Ryu-Cho Options

For detailed option descriptions, please refer to the [config.ts](./src/config.ts).

**No Longer "Required" Options:**

- `username`: Not needed in most cases as it uses GitHub Actions bot
- `email`: Not needed in most cases as it uses GitHub Actions bot
- `upstream-repo`: Automatically inferred in GitHub Actions environment

**Removed Options:**

- `upstream-repo-branch`: Upstream Repo always uses the default branch
- `workflow-name`: Not used in Yuki-no

**Retained Options:**

- `head-repo`: URL of the original repository
- `head-repo-branch`: Branch of the original repository (default: `main`)
- `track-from`: Starting commit hash for tracking

**Changed Options:**

- `path-starts-with`: Use the `include` option instead, with [Glob patterns](https://github.com/micromatch/picomatch?tab=readme-ov-file#advanced-globbing) (e.g., `docs/` becomes `docs/**`)

**New Options:**

- `include`, `exclude`: Filtering options using Glob patterns for tracking targets
- `labels`: Labels to add to issues (default: `sync`)
- `release-tracking`, `release-tracking-labels`: Release tracking functionality (`release-tracking-labels` default: `pending`)
- `verbose`: Enable detailed logging (default: `true`)

#### Important Notes

**If issues or issue comments are not being created:**

![settings](./docs/settings.webp)

- Go to Settings > Actions > General > Workflow permissions
- Select "Read and write permissions"
- Save the changes
