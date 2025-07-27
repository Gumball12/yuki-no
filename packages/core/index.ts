import { createConfig } from './createConfig';
import { Git } from './infra/git';
import { GitHub } from './infra/github';
import { loadPlugins } from './plugin';
import type { Config } from './types/config';
import type { Issue, IssueMeta } from './types/github';
import type { YukiNoContext, YukiNoPlugin } from './types/plugin';
import { createIssue } from './utils-infra/createIssue';
import { getCommits } from './utils-infra/getCommits';
import { getLatestSuccessfulRunISODate } from './utils-infra/getLatestSuccessfulRunISODate';
import { lookupCommitsInIssues } from './utils-infra/lookupCommitsInIssues';
import { log } from './utils/log';

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

  log('S', 'Git initialized');

  const github = new GitHub({ ...config, repoSpec: config.upstreamRepoSpec });
  log('S', 'GitHub initialized');

  const plugins = await loadPlugins(config.plugins);
  const pluginCtx: YukiNoContext = { config };

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
      await plugin.onFinally?.({ ...pluginCtx, success });
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
    const commitUrl = `${git.repoUrl}/commit/${notCreatedCommit.hash}`;
    const issueMeta: IssueMeta = {
      title: notCreatedCommit.title,
      body: `New updates on head repo.\r\n${commitUrl}`,
      labels: config.labels,
    };

    for (const p of plugins) {
      await p.onBeforeCreateIssue?.({
        ...ctx,
        commit: notCreatedCommit,
        issueMeta,
      });
    }

    const issue: Issue = {
      ...(await createIssue(github, issueMeta)),
      hash: notCreatedCommit.hash,
    };

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

  return createdIssues;
};

start();
