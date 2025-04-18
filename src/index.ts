import { type Config, createConfig } from './createConfig';
import { Git } from './git/core';
import { getCommits } from './git/getCommits';
import { getRelease } from './git/getRelease';
import { hasAnyRelease } from './git/hasAnyRelease';
import { GitHub } from './github/core';
import { createIssue } from './github/createIssue';
import { getLatestSuccessfulRunISODate } from './github/getLatestSuccessfulRunISODate';
import { getOpenedIssues, type Issue } from './github/getOpenedIssues';
import { lookupCommitsInIssues } from './github/lookupCommitsInIssues';
import { updateIssueCommentByRelease } from './releaseTracking/updateIssueCommentsByRelease';
import { updateIssueLabelsByRelease } from './releaseTracking/updateIssueLabelsByRelease';
import { log, mergeArray, uniqueWith } from './utils';

import shell from 'shelljs';

shell.config.silent = true;

const start = async () => {
  const startTime = new Date();
  log('I', `Starting Yuki-no (${startTime.toISOString()})`);

  const config = createConfig();
  log('S', 'Configuration initialized');

  const git = new Git({ ...config, repoSpec: config.headRepoSpec });
  git.clone();
  git.exec(`config user.name "${config.userName}"`);
  git.exec(`config user.email "${config.email}"`);
  log('S', 'Git initialized');

  const github = new GitHub({ ...config, repoSpec: config.upstreamRepoSpec });
  log('S', 'GitHub initialized');

  const createdIssues = await syncCommits(github, git, config);

  if (config.releaseTracking) {
    await releaseTracking(github, git, createdIssues);
  }

  const endTime = new Date();
  const duration = (endTime.getTime() - startTime.getTime()) / 1000;
  log(
    'S',
    `Yuki-No completed (${endTime.toISOString()}) - Duration: ${duration}s`,
  );
};

const syncCommits = async (
  github: GitHub,
  git: Git,
  config: Config,
): Promise<Issue[]> => {
  log('I', '=== Synchronization started ===');

  const latestSuccessfulRun = await getLatestSuccessfulRunISODate(github);
  const commits = getCommits(config, git, latestSuccessfulRun);
  const notCreatedCommits = await lookupCommitsInIssues(github, commits);

  log(
    'I',
    `syncCommits :: Number of commits to create as issues: ${notCreatedCommits.length}`,
  );

  const createdIssues: Issue[] = [];

  for (const notCreatedCommit of notCreatedCommits) {
    const issue = await createIssue(
      github,
      config.headRepoSpec,
      notCreatedCommit,
    );
    createdIssues.push(issue);
  }

  log(
    'S',
    `syncCommits :: ${createdIssues.length} issues created successfully`,
  );

  return createdIssues;
};

const releaseTracking = async (
  github: GitHub,
  git: Git,
  createdIssues: Issue[],
) => {
  log('I', '=== Release tracking started ===');

  const openedIssues = await getOpenedIssues(github);
  const releaseTrackingIssues = uniqueWith(
    mergeArray(openedIssues, createdIssues),
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

start();
