import type { Config } from '../types/config';

import picomatch from 'picomatch';

export type FileNameFilter = (fileName: string) => boolean;

export const createFileNameFilter = (
  config: Pick<Config, 'include' | 'exclude'>,
  rootDir = '',
): FileNameFilter => {
  const isIncluded = picomatch(
    config.include.length ? config.include : ['**'],
    { dot: true },
  );
  const isExcluded = picomatch(config.exclude, { dot: true });

  const normalizedRootDir = normalizeRootDir(rootDir);

  return (fileName: string): boolean => {
    if (!fileName.length) {
      return false;
    }

    if (!fileName.startsWith(normalizedRootDir)) {
      return false;
    }

    if (config.include.length === 0 && config.exclude.length === 0) {
      return true;
    }

    return !isExcluded(fileName) && isIncluded(fileName);
  };
};

export const normalizeRootDir = (rootDir?: string): string => {
  if (!rootDir) {
    return '';
  }

  if (rootDir.endsWith('/')) {
    return rootDir as `${string}/`;
  }

  return `${rootDir}/`;
};
