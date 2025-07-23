import type { Git } from '../../git/core';
import type { GitHub } from '../../github/core';
import { setIssueLabels } from '../../github/setIssueLabels';

import { createCommit } from './createCommit';
import { createPrBody } from './createPrBody';

import type { RestEndpointMethodTypes } from '@octokit/rest';

export const BRANCH_NAME = '__yuki-no-ai-translation';
const PR_LABEL = '__ai-translated';
const PR_TITLE = `🤖 AI Translation Batch - ${new Date().toISOString().split('T')[0]}`;

type EnsureTranslationBranchReturns = {
  prNumber: number;
};

// TODO: 여기서 묵시적으로 BRANCH_NAME으로 checkout하는데 위험하지 않나
export const ensureTranslationPr = async (
  github: GitHub,
  git: Git,
): Promise<EnsureTranslationBranchReturns> => {
  const maybePr = await findPrByLabelAndTitle(github, PR_LABEL, PR_TITLE);

  if (maybePr) {
    git.exec(`checkout ${BRANCH_NAME}`);
    return { prNumber: maybePr.number };
  }

  createBranch(git, BRANCH_NAME, true);
  createCommit(git, {
    message: 'Initial translation batch commit',
    allowEmpty: true,
  });
  pushBranch({ git, branchName: BRANCH_NAME, forced: true });

  const pr = await createPr(github, {
    branch: BRANCH_NAME,
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

const createBranch = (git: Git, branchName: string, forced = false): void => {
  const checkoutOption = forced ? '-B' : '-b';
  git.exec(
    `checkout ${checkoutOption} ${branchName} origin/${git.repoSpec.branch}`,
  );
};

type PushBranchOptions = {
  git: Git;
  branchName: string;
  remote?: string;
  forced?: boolean;
};

export const pushBranch = ({
  branchName,
  git,
  remote = 'origin',
  forced = false,
}: PushBranchOptions): void => {
  git.exec(`push ${forced ? '-f' : ''} ${remote} ${branchName}`);
};

type CreatePullRequestOptions = {
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
  { base = 'main', body, branch, title, labels }: CreatePullRequestOptions,
): Promise<CreatedPrData> => {
  const { data } = await github.api.pulls.create({
    ...github.ownerAndRepo,
    title,
    body,
    head: branch,
    base,
  });

  const labelAvailable = labels && labels.length > 0;

  if (labelAvailable) {
    await setIssueLabels(github, data.number, labels);
  }

  return data;
};

type UpdatePullRequestOptions = {
  body: string;
  title?: string;
};

type UpdatedPrData =
  RestEndpointMethodTypes['pulls']['update']['response']['data'];

export const updatePullRequest = async (
  github: GitHub,
  prNumber: number,
  options: UpdatePullRequestOptions,
): Promise<UpdatedPrData> => {
  const { data } = await github.api.pulls.update({
    ...github.ownerAndRepo,
    ...options,
    pull_number: prNumber,
  });

  return data;
};
