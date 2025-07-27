import { getRelease } from './utils/getRelease';
import { hasAnyRelease } from './utils/hasAnyRelease';
import { updateIssueCommentByRelease } from './utils/updateIssueCommentsByRelease';
import { updateIssueLabelsByRelease } from './utils/updateIssueLabelsByRelease';

import { Git } from '@yuki-no/plugin-sdk/infra/git';
import { GitHub } from '@yuki-no/plugin-sdk/infra/github';
import type { Issue } from '@yuki-no/plugin-sdk/types/github';
import type { YukiNoPlugin } from '@yuki-no/plugin-sdk/types/plugin';
import { getOpenedIssues } from '@yuki-no/plugin-sdk/utils-infra/getOpenedIssues';
import { log } from '@yuki-no/plugin-sdk/utils/log';

const releaseTrackingPlugin: YukiNoPlugin = {
  name: 'release-tracking',

  async onAfterCreateIssue(ctx) {
    const git = new Git({
      ...ctx.config,
      repoSpec: ctx.config.headRepoSpec,
      withClone: true,
    });
    const github = new GitHub({
      ...ctx.config,
      repoSpec: ctx.config.upstreamRepoSpec,
    });

    await processReleaseTrackingForIssue(github, git, ctx.issue);
  },

  async onFinally(ctx) {
    const git = new Git({
      ...ctx.config,
      repoSpec: ctx.config.headRepoSpec,
      withClone: true,
    });
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

const uniqueWith = <V>(value: V[], mapper: (v: V) => unknown): V[] => {
  if (value.length <= 1) {
    return [...value];
  }

  const result: V[] = [];
  const seen = new Set();

  for (const v of value) {
    const mapped = mapper(v);

    if (seen.has(mapped)) {
      continue;
    }

    result.push(v);
    seen.add(mapped);
  }

  return [...result];
};

const mergeArray = <T>(a: T[], b: T[]): T[] => {
  if (a.length === 0 && b.length === 0) {
    return [];
  }

  if (a.length === 0) {
    return [...b];
  }

  if (b.length === 0) {
    return [...a];
  }

  return [...a, ...b];
};
