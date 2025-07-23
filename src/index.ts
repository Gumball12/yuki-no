import { type Config, createConfig } from './createConfig';
import { Git } from './git/core';
import { type Commit, getCommits } from './git/getCommits';
import { createRepoUrl } from './git/utils';
import { GitHub } from './github/core';
import { createIssue } from './github/createIssue';
import { getLatestSuccessfulRunISODate } from './github/getLatestSuccessfulRunISODate';
import { type Issue } from './github/getOpenedIssues';
import { lookupCommitsInIssues } from './github/lookupCommitsInIssues';
import {
  type IssueMeta,
  loadPlugins,
  type YukiNoContext,
  type YukiNoPlugin,
} from './plugins/core';
import { log, useIsTrackingFile } from './utils';

import { context as actionsContext } from '@actions/github';
import shell from 'shelljs';

shell.config.silent = true;

const start = async () => {
  const startTime = new Date();
  log('I', `Starting Yuki-no (${startTime.toISOString()})`);

  const config = createConfig();
  log('S', 'Configuration initialized');

  const git = new Git({
    ...config,
    repoSpec: config.headRepoSpec,
    withClone: true,
  });
  git.exec(`config user.name "${config.userName}"`);
  git.exec(`config user.email "${config.email}"`);
  log('S', 'Git initialized');

  const github = new GitHub({ ...config, repoSpec: config.upstreamRepoSpec });
  log('S', 'GitHub initialized');

  const plugins = await loadPlugins(config.plugins);
  const pluginCtx: YukiNoContext = {
    octokit: github.api,
    context: actionsContext,
    config,
  };

  try {
    for (const plugin of plugins) {
      await plugin.onInit?.({ ...pluginCtx });
    }

    const syncCommitsResults = await syncCommits(
      github,
      git,
      config,
      plugins,
      pluginCtx,
    );

    const endTime = new Date();
    const duration = (endTime.getTime() - startTime.getTime()) / 1000;
    log(
      'S',
      `Yuki-No completed (${endTime.toISOString()}) - Duration: ${duration}s`,
    );

    // TODO: (NOTE) finally 안에서 onExit 실행하면 특정 플러그인이 onInit은 실행 안되었는데
    // onExit만 실행될 수 있음 (그래서 success도 제거, 특정 plugin 실패하면 나머지 다 실패처리하는게 더 적절)
    for (const plugin of plugins) {
      await plugin.onExit?.({
        ...pluginCtx,
        ...(syncCommitsResults ?? { createdIssues: [], processedCommits: [] }),
      });
    }
  } catch (error) {
    const err = error as Error;
    for (const plugin of plugins) {
      await plugin.onError?.({ ...pluginCtx, error: err });
    }

    throw err;
  }
};

const syncCommits = async (
  github: GitHub,
  git: Git,
  config: Config,
  plugins: YukiNoPlugin[],
  ctx: YukiNoContext,
): Promise<{ createdIssues: Issue[]; processedCommits: Commit[] }> => {
  log('I', '=== Synchronization started ===');

  for (const p of plugins) {
    await p.onBeforeCompare?.({ ...ctx });
  }

  const isTrackingFile = useIsTrackingFile(config);
  const commitFilter = (commit: Commit) =>
    commit.fileNames.some(isTrackingFile);

  const latestSuccessfulRun = await getLatestSuccessfulRunISODate(github);
  const commits = getCommits({
    trackFrom: config.trackFrom,
    latestSuccessfulRun,
    git,
    commitFilter,
  });

  const notCreatedCommits = await lookupCommitsInIssues(github, commits);

  for (const p of plugins) {
    await p.onAfterCompare?.({ ...ctx, commits: notCreatedCommits });
  }

  log(
    'I',
    `syncCommits :: Number of commits to create as issues: ${notCreatedCommits.length}`,
  );

  const createdIssues: Issue[] = [];

  for (const notCreatedCommit of notCreatedCommits) {
    const commitUrl = `${createRepoUrl(config.headRepoSpec)}/commit/${notCreatedCommit.hash}`;
    const meta: IssueMeta = {
      title: notCreatedCommit.title,
      body: `New updates on head repo.\r\n${commitUrl}`,
      labels: config.labels,
    };

    for (const p of plugins) {
      await p.onBeforeCreateIssue?.({ ...ctx, commit: notCreatedCommit, meta });
    }

    const issue = await createIssue(github, notCreatedCommit, meta);
    createdIssues.push(issue);

    for (const p of plugins) {
      await p.onAfterCreateIssue?.({
        ...ctx,
        commit: notCreatedCommit,
        issue,
      });
    }
  }

  log(
    'S',
    `syncCommits :: ${createdIssues.length} issues created successfully`,
  );

  return { createdIssues, processedCommits: commits };
};

start();
