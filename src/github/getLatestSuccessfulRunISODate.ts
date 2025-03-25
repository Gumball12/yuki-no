import { name } from '../../package.json';
import { log } from '../utils';

import type { GitHub } from './core';
import { getISODate } from './utils';

export const getLatestSuccessfulRunISODate = async (
  github: GitHub,
): Promise<string | undefined> => {
  log(
    'I',
    'getLatestSuccessfulRunISODate :: Extracting last successful GitHub Actions run time',
  );
  const { data } = await github.api.actions.listWorkflowRunsForRepo({
    ...github.ownerAndRepo,
    status: 'success',
  });

  const latestSuccessfulRun = data.workflow_runs
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .findLast(run => run.name === name);

  if (!latestSuccessfulRun) {
    log(
      'I',
      'getLatestSuccessfulRunISODate :: No last successful GitHub Actions run time found',
    );
    return;
  }

  const latestSuccessfulRunDate = getISODate(latestSuccessfulRun.created_at);

  log(
    'I',
    `getLatestSuccessfulRunISODate :: Last successful GitHub Actions run time: ${latestSuccessfulRunDate}`,
  );

  return latestSuccessfulRunDate;
};
