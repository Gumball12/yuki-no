import { name } from '../../package.json';
import { log } from '../utils';

import type { GitHub } from './core';

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
    throw new Error(
      'Cannot find last successful Yuki-no GitHub Action run time',
    );
  }

  const latestSuccessfulRunDate = latestSuccessfulRun.created_at;

  log(
    'I',
    `getLatestSuccessfulRunISODate :: Last successful GitHub Actions run time: ${latestSuccessfulRunDate}`,
  );

  return latestSuccessfulRunDate;
};
