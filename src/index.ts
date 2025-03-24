import { type Config, createConfig } from './createConfig';
import { Git } from './git/core';
import { getCommits } from './git/getCommits';
import { getRelease } from './git/getRelease';
import { GitHub } from './github/core';
import { createIssue } from './github/createIssue';
import { getLatestSuccessfulRunISODate } from './github/getLatestSuccessfulRunISODate';
import { getOpenedIssues } from './github/getOpenedIssues';
import { lookupCommitsInIssues } from './github/lookupCommitsInIssues';
import { updateIssueCommentByRelease } from './releaseTracking/updateIssueCommentsByRelease';
import { updateIssueLabelsByRelease } from './releaseTracking/updateIssueLabelsByRelease';
import { log } from './utils';

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

  await syncCommits(github, git, config);

  if (config.releaseTracking) {
    await releaseTracking(github, git, config);
  }

  const endTime = new Date();
  const duration = (endTime.getTime() - startTime.getTime()) / 1000;
  log(
    'S',
    `Yuki-No completed (${endTime.toISOString()}) - Duration: ${duration}s`,
  );
};

const syncCommits = async (github: GitHub, git: Git, config: Config) => {
  log('I', '=== Synchronization started ===');

  const latestSuccessfulRun = await getLatestSuccessfulRunISODate(github);
  const commits = getCommits(config, git, latestSuccessfulRun);
  const notCreatedCommits = await lookupCommitsInIssues(github, commits);

  log(
    'I',
    `syncCommits :: Number of commits to create as issues: ${notCreatedCommits.length}`,
  );

  for (const notCreatedCommit of notCreatedCommits) {
    await createIssue(github, config.headRepoSpec, notCreatedCommit);
  }

  log(
    'S',
    `syncCommits :: ${notCreatedCommits.length} issues created successfully`,
  );
};

const releaseTracking = async (github: GitHub, git: Git, config: Config) => {
  log('I', '=== Release tracking started ===');

  const openedIssues = await getOpenedIssues(github);
  const releaseInfos = openedIssues.map(issue => getRelease(git, issue.hash));

  for (let ind = 0; ind < releaseInfos.length; ind++) {
    const releaseInfo = releaseInfos[ind];
    const openedIssue = openedIssues[ind];
    await updateIssueLabelsByRelease(github, config, openedIssue, releaseInfo);
    await updateIssueCommentByRelease(github, openedIssue, releaseInfo);
  }

  log(
    'S',
    `releaseTracking :: Release information updated for ${openedIssues.length} issues`,
  );
};

start();
