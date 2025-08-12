import { name } from '../../package.json';
import { log } from '../utils';

import type { GitHub } from './core';
import { getTranslationIssues } from './getTranslationIssues';

import type { RestEndpointMethodTypes } from '@octokit/rest';

export const getLatestSuccessfulRunISODate = async (
  github: GitHub,
): Promise<string | undefined> => {
  log(
    'I',
    'getLatestSuccessfulRunISODate :: Extracting last successful GitHub Actions run time',
  );

  const { workflowRun: latestSuccessfulRun, totalCount: totalRunCount } =
    await getLatestSuccessfulRun(github);

  const maybeFirstExecution =
    totalRunCount === 0 && latestSuccessfulRun === undefined;

  if (maybeFirstExecution) {
    const allIssues = await getTranslationIssues(github, 'all');
    const isFirstExecution = allIssues.length === 0;

    if (isFirstExecution) {
      log(
        'I',
        'getLatestSuccessfulRunISODate :: No last successful GitHub Actions run time found',
      );
      return;
    }
  }

  if (!latestSuccessfulRun) {
    throw new Error(
      'GitHub API data inconsistency detected. This might indicate API instability.',
    );
  }

  const latestSuccessfulRunDate = latestSuccessfulRun.created_at;

  log(
    'I',
    `getLatestSuccessfulRunISODate :: Last successful GitHub Actions run time: ${latestSuccessfulRunDate}`,
  );

  return latestSuccessfulRunDate;
};

type WorkflowRun =
  RestEndpointMethodTypes['actions']['listWorkflowRunsForRepo']['response']['data']['workflow_runs'][number];

const getLatestSuccessfulRun = async (
  github: GitHub,
): Promise<{ workflowRun: WorkflowRun | undefined; totalCount: number }> => {
  const { data } = await github.api.actions.listWorkflowRunsForRepo({
    ...github.ownerAndRepo,
    status: 'success',
    per_page: 100,
  });

  const latestSuccessfulRun = data.workflow_runs
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .findLast(run => run.name === name);

  return { workflowRun: latestSuccessfulRun, totalCount: data.total_count };
};
