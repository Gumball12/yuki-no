import type { Git } from './core';

export const hasAnyRelease = (git: Git): boolean => {
  const result = git.exec('tag');
  return result.length !== 0;
};
