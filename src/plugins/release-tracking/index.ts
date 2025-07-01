import { Git } from '../../git/core';
import { getRelease } from '../../git/getRelease';
import { hasAnyRelease } from '../../git/hasAnyRelease';
import { GitHub } from '../../github/core';
import { getOpenedIssues, type Issue } from '../../github/getOpenedIssues';
import { log, mergeArray, uniqueWith } from '../../utils';
import type { YukiNoPlugin } from '../core';

import { updateIssueCommentByRelease } from './updateIssueCommentsByRelease';
import { updateIssueLabelsByRelease } from './updateIssueLabelsByRelease';

const releaseTrackingPlugin: YukiNoPlugin = {
  name: 'core:release-tracking',

  async onAfterCreateIssue(ctx) {
    const git = new Git({ ...ctx.config, repoSpec: ctx.config.headRepoSpec });
    const github = new GitHub({
      ...ctx.config,
      repoSpec: ctx.config.upstreamRepoSpec,
    });

    await processReleaseTrackingForIssue(github, git, ctx.result);
  },

  async onExit(ctx) {
    const git = new Git({ ...ctx.config, repoSpec: ctx.config.headRepoSpec });
    const github = new GitHub({
      ...ctx.config,
      repoSpec: ctx.config.upstreamRepoSpec,
    });

    await processReleaseTracking(github, git);
  },
};

export default releaseTrackingPlugin;

const processReleaseTracking = async (
  github: GitHub,
  git: Git,
  additionalIssues: Issue[] = [],
): Promise<void> => {
  log('I', '=== Release tracking started ===');

  const openedIssues = await getOpenedIssues(github);
  const releaseTrackingIssues = uniqueWith(
    mergeArray(openedIssues, additionalIssues),
    ({ hash }) => hash,
  );

  const releaseInfos = releaseTrackingIssues.map(issue =>
    getRelease(git, issue.hash),
  );
  const releasesAvailable = hasAnyRelease(git);

  for (let ind = 0; ind < releaseInfos.length; ind++) {
    const releaseInfo = releaseInfos[ind];
    const openedIssue = releaseTrackingIssues[ind];

    await updateIssueLabelsByRelease(github, openedIssue, releaseInfo);
    await updateIssueCommentByRelease(
      github,
      openedIssue,
      releaseInfo,
      releasesAvailable,
    );
  }

  log(
    'S',
    `releaseTracking :: Release information updated for ${releaseTrackingIssues.length} issues`,
  );
};

const processReleaseTrackingForIssue = async (
  github: GitHub,
  git: Git,
  issue: Issue,
): Promise<void> => {
  const releaseInfo = getRelease(git, issue.hash);
  const releasesAvailable = hasAnyRelease(git);

  await updateIssueLabelsByRelease(github, issue, releaseInfo);
  await updateIssueCommentByRelease(
    github,
    issue,
    releaseInfo,
    releasesAvailable,
  );
};
