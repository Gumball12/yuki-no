import { type Plugin, type PluginOptions } from '../plugin.types';
import { type Config } from '../../createConfig';
import { type Git } from '../../git/core';
import { getRelease, type ReleaseInfo } from '../../git/getRelease';
import { hasAnyRelease } from '../../git/hasAnyRelease';
import { type GitHub } from '../../github/core';
import { type Issue } from '../../github/getOpenedIssues';
import { log } from '../../utils';
import { updateIssueCommentByRelease } from './lib/updateIssueCommentsByRelease';
import { updateIssueLabelsByRelease } from './lib/updateIssueLabelsByRelease';

const ReleaseTrackerPlugin: Plugin = {
  name: 'core:release-tracker',
  async onReleaseTracking(config: Config, git: Git, github: GitHub, allIssues: Issue[], options?: PluginOptions): Promise<void> {
    log('I', 'core:release-tracker :: Release tracking started', options);

    const releaseInfos = allIssues.map(issue =>
      getRelease(git, issue.hash),
    );
    const releasesAvailable = hasAnyRelease(git);

    for (let ind = 0; ind < releaseInfos.length; ind++) {
      const releaseInfo = releaseInfos[ind];
      const issue = allIssues[ind];

      // Pass options to helpers.
      // The helpers are already updated to use options.releaseTrackingLabels if available,
      // or default to github.config.releaseTrackingLabels.
      await updateIssueLabelsByRelease(github, issue, releaseInfo, options);
      await updateIssueCommentByRelease(
        github,
        issue,
        releaseInfo,
        releasesAvailable,
        options,
      );
    }

    log(
      'S',
      `core:release-tracker :: Release information updated for ${allIssues.length} issues`,
    );
  },
};

export default ReleaseTrackerPlugin;
