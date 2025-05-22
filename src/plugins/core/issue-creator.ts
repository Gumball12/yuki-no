import { type Plugin, type PluginOptions } from '../plugin.types';
import { type Config } from '../../createConfig';
import { type Git } from '../../git/core';
import { type GitHub } from '../../github/core';
import { type Issue } from '../../github/getOpenedIssues';
import { log } from '../../utils';
import { getLatestSuccessfulRunISODate } from '../../github/getLatestSuccessfulRunISODate';
import { getCommits } from '../../git/getCommits';
import { lookupCommitsInIssues } from '../../github/lookupCommitsInIssues';
import { createIssue } from '../../github/createIssue';

const IssueCreatorPlugin: Plugin = {
  name: 'core:issue-creator',
  async onSync(config: Config, git: Git, github: GitHub, options?: PluginOptions): Promise<Issue[]> {
    log('I', 'core:issue-creator :: Synchronization started', options); // Log options for visibility

    const latestSuccessfulRun = await getLatestSuccessfulRunISODate(github);
    // 'options' can be used here to customize behavior if needed in the future
    // For example, if the plugin has specific options for commit fetching.
    const commits = getCommits(config, git, latestSuccessfulRun);
    const notCreatedCommits = await lookupCommitsInIssues(github, commits);

    log(
      'I',
      `core:issue-creator :: Number of commits to create as issues: ${notCreatedCommits.length}`,
    );

    const createdIssues: Issue[] = [];

    for (const notCreatedCommit of notCreatedCommits) {
      // Pass headRepoSpec from the main config, as createIssue expects it.
      // Options from the plugin config could override parts of this if designed so.
      // For example, `options?.labels` could override `config.labels` for this plugin.
      // The createIssue function in github/core.ts uses this.config.labels by default.
      // If plugin-specific labels are needed, the GitHub instance might need to be created
      // with plugin-specific config, or createIssue adapted. For now, global labels apply.
      const issue = await createIssue(
        github,
        config.headRepoSpec,
        notCreatedCommit,
      );
      createdIssues.push(issue);
    }

    log(
      'S',
      `core:issue-creator :: ${createdIssues.length} issues created successfully`,
    );

    return createdIssues;
  },
};

export default IssueCreatorPlugin;
