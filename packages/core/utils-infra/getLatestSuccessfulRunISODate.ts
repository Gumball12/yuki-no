import type { GitHub } from '../infra/github';
import { extractHashFromIssue, isNotEmpty } from '../utils/common';
import { log } from '../utils/log';

import type { Octokit } from '@octokit/rest';

const WORKFLOW_NAME = 'yuki-no';

type WorkflowRun = Awaited<
  ReturnType<Octokit['actions']['listWorkflowRunsForRepo']>
>['data']['workflow_runs'][number];

export const getLatestSuccessfulRunISODate = async (
  github: GitHub,
  maybeFirstRun = false,
): Promise<string | undefined> => {
  log(
    'I',
    'getLatestSuccessfulRunISODate :: Extracting last successful GitHub Actions run time',
  );

  const { run: latestSuccessfulRun, successfulCount } =
    await getLatestSuccessfulRun(github);
  const shouldCheckFirstRun =
    maybeFirstRun && successfulCount === 0 && latestSuccessfulRun === undefined;

  if (shouldCheckFirstRun) {
    const trackedIssueExists = await hasAnyTrackedIssue(github);

    if (!trackedIssueExists) {
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

const getLatestSuccessfulRun = async (
  github: GitHub,
): Promise<{ run: WorkflowRun | undefined; successfulCount: number }> => {
  const { data } = await github.api.actions.listWorkflowRunsForRepo({
    ...github.ownerAndRepo,
    status: 'completed',
    per_page: 100,
  });

  log(
    'I',
    `getLatestSuccessfulRunISODate :: Found ${data.total_count} completed / ${data.workflow_runs.length} runs on first page`,
  );

  const successfulYukiNoRuns = data.workflow_runs.filter(
    ({ conclusion, name }) =>
      conclusion === 'success' && name === WORKFLOW_NAME,
  );
  const [latestSuccessfulRun] = successfulYukiNoRuns;

  return {
    run: latestSuccessfulRun,
    successfulCount: successfulYukiNoRuns.length,
  };
};

const hasAnyTrackedIssue = async (github: GitHub): Promise<boolean> => {
  const issues = await github.api.paginate(github.api.issues.listForRepo, {
    ...github.ownerAndRepo,
    state: 'all',
    per_page: 100,
  });

  return issues.some(issue => {
    const labels = issue.labels
      .map(convGithubIssueLabelToString)
      .filter(isNotEmpty);
    const hasConfiguredLabels = github.configuredLabels.every(label =>
      labels.includes(label),
    );

    if (!hasConfiguredLabels) {
      return false;
    }

    return extractHashFromIssue({ body: issue.body ?? '' }) !== undefined;
  });
};

const convGithubIssueLabelToString = (
  label: string | { name?: string },
): string => (typeof label === 'string' ? label : (label.name ?? ''));
