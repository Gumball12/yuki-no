import { log } from '../utils';

import type { GitHub } from './core';
import { getTranslationIssues } from './getTranslationIssues';

import type { RestEndpointMethodTypes } from '@octokit/rest';

// Use a constant workflow name to avoid ambiguity.
// This should match the name defined in the workflow YAML that uses Yuki-no.
const WORKFLOW_NAME = 'yuki-no';

export const getLatestSuccessfulRunISODate = async (
  github: GitHub,
  hintFirstRun: boolean,
): Promise<string | undefined> => {
  log(
    'I',
    'getLatestSuccessfulRunISODate :: Extracting last successful GitHub Actions run time',
  );

  const { run: latestSuccessfulRun, successfulCount } =
    await getLatestSuccessfulRun(github);
  const maybeFirstExecution =
    hintFirstRun && successfulCount === 0 && latestSuccessfulRun === undefined;

  if (maybeFirstExecution) {
    const allIssues = await getTranslationIssues(github, 'all');
    const isFirstExecution = allIssues.length === 0;

    if (isFirstExecution) {
      log(
        'I',
        'getLatestSuccessfulRunISODate :: No last successful GitHub Actions run time found (first execution confirmed)',
      );
      return;
    }
  }

  if (!latestSuccessfulRun) {
    log(
      'W',
      `getLatestSuccessfulRunISODate :: API inconsistency detected: totalCount=${successfulCount}, but no successful run found`,
    );
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
): Promise<{ run: WorkflowRun | undefined; successfulCount: number }> => {
  const { data } = await github.api.rest.actions.listWorkflowRunsForRepo({
    ...github.ownerAndRepo,
    status: 'completed',
    per_page: 100,
  });

  log(
    'I',
    `getLatestSuccessfulRunISODate :: Found ${data.total_count} completed / ${data.workflow_runs.length} runs on first page`,
  );

  const successfulYukiNoRun = data.workflow_runs.filter(
    ({ conclusion, name }) =>
      conclusion === 'success' && name === WORKFLOW_NAME,
  );
  const [latestSuccessfulRun] = successfulYukiNoRun;

  return {
    run: latestSuccessfulRun,
    successfulCount: successfulYukiNoRun.length,
  };
};
