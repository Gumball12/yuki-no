import type { GitHub } from '../infra/github';
import { log } from '../utils/log';

const WORKFLOW_NAME = 'yuki-no';

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
    .findLast(run => run.name === WORKFLOW_NAME);

  if (!latestSuccessfulRun) {
    log(
      'I',
      'getLatestSuccessfulRunISODate :: No last successful GitHub Actions run time found',
    );
    return;
  }

  const latestSuccessfulRunDate = latestSuccessfulRun.created_at;

  log(
    'I',
    `getLatestSuccessfulRunISODate :: Last successful GitHub Actions run time: ${latestSuccessfulRunDate}`,
  );

  return latestSuccessfulRunDate;
};
