import { type Config, createConfig } from './createConfig';
import { Git } from './git/core';
import { getCommits } from './git/getCommits';
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
} from './plugin-sdk/core';
import { log } from './utils';

import { context as actionsContext } from '@actions/github';
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

  const plugins = await loadPlugins(config.plugins);
  const pluginCtx: YukiNoContext = {
    octokit: github.api,
    context: actionsContext,
    config,
  };

  let success = false;
  try {
    for (const plugin of plugins) {
      await plugin.onInit?.({ ...pluginCtx });
    }

    await syncCommits(github, git, config, plugins, pluginCtx);

    const endTime = new Date();
    const duration = (endTime.getTime() - startTime.getTime()) / 1000;
    log(
      'S',
      `Yuki-No completed (${endTime.toISOString()}) - Duration: ${duration}s`,
    );
    success = true;
  } catch (error) {
    const err = error as Error;
    for (const plugin of plugins) {
      await plugin.onError?.({ ...pluginCtx, error: err });
    }
    throw err;
  } finally {
    for (const plugin of plugins) {
      await plugin.onExit?.({ ...pluginCtx, success });
    }
  }
};

const syncCommits = async (
  github: GitHub,
  git: Git,
  config: Config,
  plugins: YukiNoPlugin[],
  ctx: YukiNoContext,
): Promise<Issue[]> => {
  log('I', '=== Synchronization started ===');

  for (const p of plugins) {
    await p.onBeforeCompare?.({ ...ctx });
  }

  const latestSuccessfulRun = await getLatestSuccessfulRunISODate(github);
  const commits = getCommits(config, git, latestSuccessfulRun);
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
        result: issue,
      });
    }
  }

  log(
    'S',
    `syncCommits :: ${createdIssues.length} issues created successfully`,
  );

  return createdIssues;
};

start();
