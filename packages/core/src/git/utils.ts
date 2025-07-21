import type { RepoSpec } from '../createConfig';

export const createRepoUrl = (
  repoSpec: Pick<RepoSpec, 'owner' | 'name'>,
): string => `https://github.com/${repoSpec.owner}/${repoSpec.name}`;
