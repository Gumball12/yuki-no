import { log } from '../utils';

import type { GitHub } from './core';
import { getISODate } from './utils';

import type { RestEndpointMethodTypes } from '@octokit/rest';

export const getLatestSuccessfulRunISODate = async (
  github: GitHub,
): Promise<string | undefined> => {
  log(
    'I',
    'getLatestSuccessfulRunISODate :: Extracting last successful GitHub Actions run time',
  );
  const { data } = await github.api.actions.listWorkflowRunsForRepo({
    ...github.ownerAndRepo,
    per_page: 100,
    status: 'success',
  });

  const latestSuccessfulRun = data.workflow_runs
    .filter(run => run.path === github.workflowPath)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .at(-1);

  if (!latestSuccessfulRun) {
    log(
      'I',
      'getLatestSuccessfulRunISODate :: No last successful GitHub Actions run time found',
    );
    return;
  }

  const latestSuccessfulRunDate = getISODate(
    getSinceTimestamp(latestSuccessfulRun),
  );

  log(
    'I',
    `getLatestSuccessfulRunISODate :: Last successful GitHub Actions run time: ${latestSuccessfulRunDate}`,
  );

  return latestSuccessfulRunDate;
};

type WorkflowRun =
  RestEndpointMethodTypes['actions']['listWorkflowRunsForRepo']['response']['data']['workflow_runs'][number];

export const getSinceTimestamp = (
  run: Pick<WorkflowRun, 'run_started_at' | 'created_at'>,
  marginSec = 30,
): Date => {
  const base = run.run_started_at ?? run.created_at;
  const time = Date.parse(base) - marginSec * 1000;
  return new Date(time);
};
