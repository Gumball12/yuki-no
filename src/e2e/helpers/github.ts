import { retry } from '@octokit/plugin-retry';
import { throttling } from '@octokit/plugin-throttling';
import { Octokit } from '@octokit/rest';

const OctokitWithPlugins = Octokit.plugin(retry, throttling);

export const createOctokit = (token: string) =>
  new OctokitWithPlugins({
    auth: token,
    throttle: {
      onRateLimit: (retryAfter: number, options: any) => {
        console.warn(
          `Request quota exhausted for request ${options.method} ${options.url}`,
        );

        if (options.request.retryCount === 0) {
          console.log(`Retrying after ${retryAfter} seconds!`);
          return true;
        }
      },
      onSecondaryRateLimit: (_, options: any) => {
        console.warn(
          `Secondary rate limit detected for request ${options.method} ${options.url}`,
        );
      },
    },
  });

export interface TestRepo {
  owner: string;
  repo: string;
  branch?: string;
}

const GITHUB_REPO_URL_REGEX = /github\.com[/:]([^/]+)\/([^/.]+)(\.git)?$/;

export const parseRepoUrl = (url: string): TestRepo => {
  const match = url.match(GITHUB_REPO_URL_REGEX);

  if (!match) {
    throw new Error(`Invalid GitHub URL: ${url}`);
  }

  return { owner: match[1], repo: match[2] };
};

export const createTestBranch = async (
  octokit: Octokit,
  repo: TestRepo,
  branchName: string,
) => {
  const { data: repoData } = await octokit.repos.get({
    owner: repo.owner,
    repo: repo.repo,
  });
  const defaultBranch = repoData.default_branch;

  const { data: refData } = await octokit.git.getRef({
    owner: repo.owner,
    repo: repo.repo,
    ref: `heads/${defaultBranch}`,
  });
  const baseSha = refData.object.sha;

  await octokit.git.createRef({
    owner: repo.owner,
    repo: repo.repo,
    ref: `refs/heads/${branchName}`,
    sha: baseSha,
  });

  return { baseSha, branchName, defaultBranch };
};

export const createTestCommit = async (
  octokit: Octokit,
  repo: TestRepo,
  branchName: string,
  filePath: string,
  content: string,
  message: string,
) => {
  const response = await octokit.repos.createOrUpdateFileContents({
    owner: repo.owner,
    repo: repo.repo,
    path: filePath,
    message,
    content: Buffer.from(content).toString('base64'),
    branch: branchName,
  });

  return response.data.commit.sha;
};

export const getCreatedIssues = async (
  octokit: Octokit,
  repo: TestRepo,
  startTime: Date,
  expectedShas: string[],
) => {
  const { data: issues } = await octokit.issues.listForRepo({
    owner: repo.owner,
    repo: repo.repo,
    state: 'open',
    since: startTime.toISOString(),
    per_page: 100,
  });

  return issues.filter(issue => {
    if (!issue.created_at) {
      return false;
    }

    const createdAt = new Date(issue.created_at);
    if (createdAt < startTime) {
      return false;
    }

    return expectedShas.some(sha => issue.body?.includes(`/commit/${sha}`));
  });
};

export const closeIssue = async (
  octokit: Octokit,
  repo: TestRepo,
  issueNumber: number,
) => {
  try {
    await octokit.issues.update({
      owner: repo.owner,
      repo: repo.repo,
      issue_number: issueNumber,
      state: 'closed',
    });
  } catch (error) {
    console.error(`Failed to close issue #${issueNumber}:`, error);
  }
};

export const deleteBranch = async (
  octokit: Octokit,
  repo: TestRepo,
  branchName: string,
) => {
  try {
    await octokit.git.deleteRef({
      owner: repo.owner,
      repo: repo.repo,
      ref: `heads/${branchName}`,
    });
  } catch (error) {
    console.error(`Failed to delete branch ${branchName}:`, error);
  }
};

export const createTag = async (
  octokit: Octokit,
  repo: TestRepo,
  tagName: string,
  targetSha: string,
) => {
  await octokit.git.createRef({
    owner: repo.owner,
    repo: repo.repo,
    ref: `refs/tags/${tagName}`,
    sha: targetSha,
  });
};

export const deleteTag = async (
  octokit: Octokit,
  repo: TestRepo,
  tagName: string,
) => {
  try {
    await octokit.git.deleteRef({
      owner: repo.owner,
      repo: repo.repo,
      ref: `tags/${tagName}`,
    });
  } catch (error) {
    console.error(`Failed to delete tag ${tagName}:`, error);
  }
};
