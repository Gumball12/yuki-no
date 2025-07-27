import type { Git } from '@yuki-no/plugin-sdk/infra/git';

export const hasAnyRelease = (git: Git): boolean => {
  const result = git.exec('tag');
  return result.length !== 0;
};
