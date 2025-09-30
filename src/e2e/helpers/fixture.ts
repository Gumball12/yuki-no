import { type E2EEnvironment, validateEnvironment } from './env';
import {
  closeIssue,
  createOctokit,
  createTestBranch,
  createTestCommit,
  deleteBranch,
  parseRepoUrl,
  type TestRepo,
} from './github';

import { randomUUID } from 'crypto';

export interface Setup {
  env: E2EEnvironment;
  octokit: ReturnType<typeof createOctokit>;
  headRepo: TestRepo;
  upstreamRepo: TestRepo;
  cleanup: {
    branches: { owner: string; repo: string; name: string }[];
    issues: { owner: string; repo: string; number: number }[];
  };
}

export const setup = async (): Promise<Setup> => {
  const env = validateEnvironment();
  const octokit = createOctokit(env.accessToken);
  const headRepo = parseRepoUrl(env.headRepoUrl);
  const upstreamRepo = parseRepoUrl(env.upstreamRepoUrl);

  return {
    env,
    octokit,
    headRepo,
    upstreamRepo,
    cleanup: { branches: [], issues: [] },
  };
};

export const cleanup = async (s: Setup) => {
  for (const it of s.cleanup.issues) {
    try {
      await closeIssue(
        s.octokit,
        { owner: it.owner, repo: it.repo },
        it.number,
      );
    } catch (e) {
      console.error(`[cleanup] Failed to close issue #${it.number}:`, e);
    }
  }

  for (const br of s.cleanup.branches) {
    try {
      await deleteBranch(
        s.octokit,
        { owner: br.owner, repo: br.repo },
        br.name,
      );
    } catch (e) {
      console.error(`[cleanup] Failed to delete branch ${br.name}:`, e);
    }
  }
};

const BRANCH_PREFIX = 'e2e';

export const withBranch = async (
  s: Setup,
  fn: (info: { baseSha: string; branch: string }) => Promise<void>,
) => {
  const branch = `${BRANCH_PREFIX}/${randomUUID()}`;
  const { baseSha } = await createTestBranch(s.octokit, s.headRepo, branch);
  console.log(`[E2E] Created test branch: ${branch} (base SHA: ${baseSha})`);

  s.cleanup.branches.push({
    owner: s.headRepo.owner,
    repo: s.headRepo.repo,
    name: branch,
  });

  await fn({ baseSha, branch });
};

export const makeCommits = async (
  s: Setup,
  branch: string,
  count: number,
): Promise<string[]> => {
  const shas: string[] = [];

  for (let i = 1; i <= count; i++) {
    const sha = await createTestCommit(
      s.octokit,
      s.headRepo,
      branch,
      `docs/e2e-test-${i}.md`,
      `# E2E Test File ${i}\n\nThis is a test file for e2e testing.`,
      `test: Add e2e test file ${i}`,
    );

    if (!sha) {
      throw new Error('Failed to create commit SHA');
    }

    shas.push(sha);
    console.log(`[E2E] Created commit ${i}/${count}: ${sha}`);
  }

  return shas;
};
