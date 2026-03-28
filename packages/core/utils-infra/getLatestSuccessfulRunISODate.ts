import type { GitHub } from '../infra/github';
import { extractHashFromIssue, isNotEmpty } from '../utils/common';
import { log } from '../utils/log';

import type { Octokit } from '@octokit/rest';

const RUNS_PER_PAGE = 100;

type WorkflowRun = Awaited<
  ReturnType<Octokit['actions']['listWorkflowRunsForRepo']>
>['data']['workflow_runs'][number] & {
  path?: string;
};

export const getLatestSuccessfulRunISODate = async (
  github: GitHub,
  maybeFirstRun = false,
): Promise<string | undefined> => {
  log(
    'I',
    'getLatestSuccessfulRunISODate :: Extracting last successful GitHub Actions run time',
  );

  const {
    run: latestSuccessfulRun,
    currentWorkflowPath,
    pagesScanned,
    scannedRunCount,
    stopCause,
  } = await getLatestSuccessfulRun(github);
  const missingRunMessage = createMissingRunMessage({
    currentWorkflowPath,
    pagesScanned,
    scannedRunCount,
    stopCause,
  });
  const shouldCheckFirstRun =
    maybeFirstRun && latestSuccessfulRun === undefined;

  if (shouldCheckFirstRun) {
    const trackedIssueExists = await hasAnyTrackedIssue(github);

    if (!trackedIssueExists) {
      log(
        'I',
        `getLatestSuccessfulRunISODate :: No last successful GitHub Actions run time found (first execution confirmed). ${missingRunMessage}`,
      );
      return;
    }
  }

  if (!latestSuccessfulRun) {
    const failureMessage = shouldCheckFirstRun
      ? createTrackedIssuesConflictMessage({
          currentWorkflowPath,
          pagesScanned,
          scannedRunCount,
          stopCause,
        })
      : missingRunMessage;

    log('W', `getLatestSuccessfulRunISODate :: ${failureMessage}`);
    throw new Error(failureMessage);
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
): Promise<{
  run: WorkflowRun | undefined;
  currentWorkflowPath: string;
  pagesScanned: number;
  scannedRunCount: number;
  stopCause: string;
}> => {
  const currentWorkflowPath = getCurrentWorkflowPath();
  let page = 1;
  let scannedRunCount = 0;

  while (true) {
    const { data } = await github.api.actions.listWorkflowRunsForRepo({
      ...github.ownerAndRepo,
      status: 'completed',
      per_page: RUNS_PER_PAGE,
      page,
    });
    const workflowRuns = data.workflow_runs;

    scannedRunCount += workflowRuns.length;

    log(
      'I',
      `getLatestSuccessfulRunISODate :: Page ${page} returned ${workflowRuns.length} completed run(s) while searching for workflow path "${currentWorkflowPath}"`,
    );

    const successfulRuns = workflowRuns.filter(
      ({ conclusion, path }) =>
        conclusion === 'success' && path === currentWorkflowPath,
    );
    const [latestSuccessfulRun] = successfulRuns;

    if (latestSuccessfulRun) {
      return {
        run: latestSuccessfulRun,
        currentWorkflowPath,
        pagesScanned: page,
        scannedRunCount,
        stopCause: 'matched successful run found.',
      };
    }

    if (workflowRuns.length === 0 && scannedRunCount < data.total_count) {
      return {
        run: undefined,
        currentWorkflowPath,
        pagesScanned: page,
        scannedRunCount,
        stopCause:
          'GitHub API returned an empty completed-run page before the reported history was exhausted.',
      };
    }

    if (
      workflowRuns.length < RUNS_PER_PAGE &&
      scannedRunCount < data.total_count
    ) {
      return {
        run: undefined,
        currentWorkflowPath,
        pagesScanned: page,
        scannedRunCount,
        stopCause:
          'GitHub API returned a partial completed-run page before the reported history was exhausted.',
      };
    }

    if (scannedRunCount >= data.total_count) {
      return {
        run: undefined,
        currentWorkflowPath,
        pagesScanned: page,
        scannedRunCount,
        stopCause:
          'no successful completed run matched the current workflow path.',
      };
    }

    page += 1;
  }
};

const getCurrentWorkflowPath = (): string => {
  const workflowRef = process.env.GITHUB_WORKFLOW_REF;

  if (!workflowRef) {
    throw new Error(
      'GITHUB_WORKFLOW_REF is required to identify the current workflow path.',
    );
  }

  const [workflowRefWithoutGitRef] = workflowRef.split('@');
  const workflowPath = workflowRefWithoutGitRef.split('/').slice(2).join('/');

  if (!workflowPath) {
    throw new Error(
      `Failed to parse workflow path from GITHUB_WORKFLOW_REF: ${workflowRef}`,
    );
  }

  return workflowPath;
};

const createMissingRunMessage = ({
  currentWorkflowPath,
  pagesScanned,
  scannedRunCount,
  stopCause,
}: {
  currentWorkflowPath: string;
  pagesScanned: number;
  scannedRunCount: number;
  stopCause: string;
}): string =>
  `Unable to determine a safe successful-run baseline for workflow path "${currentWorkflowPath}": ${stopCause} Scanned ${scannedRunCount} completed run(s) across ${pagesScanned} page(s). Conservative stop policy remains in effect.`;

const createTrackedIssuesConflictMessage = ({
  currentWorkflowPath,
  pagesScanned,
  scannedRunCount,
  stopCause,
}: {
  currentWorkflowPath: string;
  pagesScanned: number;
  scannedRunCount: number;
  stopCause: string;
}): string =>
  `Unable to determine a safe successful-run baseline for workflow path "${currentWorkflowPath}": ${stopCause} Tracked issues already exist. Scanned ${scannedRunCount} completed run(s) across ${pagesScanned} page(s). Conservative stop policy remains in effect.`;

const hasAnyTrackedIssue = async (github: GitHub): Promise<boolean> => {
  const issues = await github.api.paginate(github.api.issues.listForRepo, {
    ...github.ownerAndRepo,
    state: 'all',
    per_page: RUNS_PER_PAGE,
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
