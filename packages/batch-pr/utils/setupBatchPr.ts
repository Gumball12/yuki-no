import { createCommit } from './createCommit';
import { createPrBody } from './createPrBody';

import type { RestEndpointMethodTypes } from '@octokit/rest';
import { Git } from '@yuki-no/plugin-sdk/infra/git';
import { GitHub } from '@yuki-no/plugin-sdk/infra/github';
import { log } from '@yuki-no/plugin-sdk/utils/log';

const PR_LABEL = '__translation-batch';
const PR_TITLE = `❄️ Translation Batch - ${new Date().toISOString().split('T')[0]}`;

export const setupBatchPr = async (
  github: GitHub,
  git: Git,
  branchName: string,
): Promise<{ prNumber: number }> => {
  log('I', `setupBatchPr :: Setting up batch PR with branch ${branchName}`);

  const existingPr = await findPrByLabelAndTitle(github, PR_LABEL, PR_TITLE);

  if (existingPr) {
    log(
      'I',
      `setupBatchPr :: Found existing PR #${existingPr.number}, using it`,
    );
    git.exec(`checkout ${branchName}`);
    log(
      'S',
      `setupBatchPr :: Successfully checked out existing branch ${branchName}`,
    );
    return { prNumber: existingPr.number };
  }

  log('I', `setupBatchPr :: No existing PR found, creating new one`);
  git.exec(`checkout -B ${branchName}`);
  log('I', `setupBatchPr :: Created and checked out new branch ${branchName}`);

  createCommit(git, {
    message: 'Initial translation batch commit',
    allowEmpty: true,
  });
  log('I', `setupBatchPr :: Created initial commit`);

  git.exec(`push -f origin ${branchName}`);
  log('I', `setupBatchPr :: Pushed branch ${branchName} to origin`);

  const pr = await createPr(github, {
    branch: branchName,
    title: PR_TITLE,
    body: createPrBody([]),
    labels: [PR_LABEL],
  });

  log('S', `setupBatchPr :: Successfully created new PR #${pr.number}`);
  return { prNumber: pr.number };
};

type SearchedPrData =
  RestEndpointMethodTypes['search']['issuesAndPullRequests']['response']['data']['items'][number];

const findPrByLabelAndTitle = async (
  github: GitHub,
  label: string,
  title: string,
): Promise<SearchedPrData | undefined> => {
  log(
    'I',
    `findPrByLabelAndTitle :: Searching for existing PR with label "${label}" and title "${title}"`,
  );

  const { data } = await github.api.search.issuesAndPullRequests({
    q: `repo:${github.ownerAndRepo.owner}/${github.ownerAndRepo.repo} is:pr is:open label:${label} in:title ${title}`,
    advanced_search: 'true',
  });

  log('I', `findPrByLabelAndTitle :: Found ${data.items.length} matching PRs`);
  return data.items[0];
};

type CreatePrOptions = {
  branch: string;
  title: string;
  body: string;
  base?: string;
  labels?: string[];
};

type CreatedPrData =
  RestEndpointMethodTypes['pulls']['create']['response']['data'];

const createPr = async (
  github: GitHub,
  { base = 'main', body, branch, title, labels }: CreatePrOptions,
): Promise<CreatedPrData> => {
  log(
    'I',
    `createPr :: Creating PR from ${branch} to ${base} with title "${title}"`,
  );

  const { data } = await github.api.pulls.create({
    ...github.ownerAndRepo,
    title,
    body,
    head: branch,
    base,
  });

  log('I', `createPr :: PR #${data.number} created successfully`);

  const shouldApplyLabels = labels && labels.length > 0;
  if (shouldApplyLabels) {
    log(
      'I',
      `createPr :: Applying ${labels.length} labels to PR #${data.number}`,
    );
    await github.api.issues.setLabels({
      ...github.ownerAndRepo,
      issue_number: data.number,
      labels,
    });
    log('I', `createPr :: Labels applied successfully`);
  }

  return data;
};
