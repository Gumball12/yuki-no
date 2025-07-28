import { createCommit } from './createCommit';
import { createPrBody } from './createPrBody';

import type { RestEndpointMethodTypes } from '@octokit/rest';
import { Git } from '@yuki-no/plugin-sdk/infra/git';
import { GitHub } from '@yuki-no/plugin-sdk/infra/github';

const PR_LABEL = '__translation-batch';
const PR_TITLE = `❄️ Translation Batch - ${new Date().toISOString().split('T')[0]}`;

export const setupBatchPr = async (
  github: GitHub,
  git: Git,
  branchName: string,
): Promise<{ prNumber: number }> => {
  const existingPr = await findPrByLabelAndTitle(github, PR_LABEL, PR_TITLE);

  if (existingPr) {
    git.exec(`checkout ${branchName}`);
    return { prNumber: existingPr.number };
  }

  git.exec(`checkout -B ${branchName}`);

  createCommit(git, {
    message: 'Initial translation batch commit',
    allowEmpty: true,
  });

  git.exec(`push -f origin ${branchName}`);

  const pr = await createPr(github, {
    branch: branchName,
    title: PR_TITLE,
    body: createPrBody([]),
    labels: [PR_LABEL],
  });

  return { prNumber: pr.number };
};

type SearchedPrData =
  RestEndpointMethodTypes['search']['issuesAndPullRequests']['response']['data']['items'][number];

const findPrByLabelAndTitle = async (
  github: GitHub,
  label: string,
  title: string,
): Promise<SearchedPrData | undefined> => {
  const { data } = await github.api.search.issuesAndPullRequests({
    q: `repo:${github.ownerAndRepo.owner}/${github.ownerAndRepo.repo} is:pr is:open label:${label} in:title ${title}`,
    advanced_search: 'true',
  });

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
  const { data } = await github.api.pulls.create({
    ...github.ownerAndRepo,
    title,
    body,
    head: branch,
    base,
  });

  const shouldApplyLabels = labels && labels.length > 0;
  if (shouldApplyLabels) {
    await github.api.issues.setLabels({
      ...github.ownerAndRepo,
      issue_number: data.number,
      labels,
    });
  }

  return data;
};
