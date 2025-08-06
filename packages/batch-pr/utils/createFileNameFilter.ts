import type { FileNameFilter } from '../types';

import { normalizeRootDir } from './resolveFileNameWithRootDir';

import type { Config } from '@yuki-no/plugin-sdk/types/config';
import picomatch from 'picomatch';

export const createFileNameFilter = (
  config: Pick<Config, 'include' | 'exclude'>,
  rootDir = '',
): FileNameFilter => {
  const isIncluded = picomatch(config.include.length ? config.include : ['**']);
  const isExcluded = picomatch(config.exclude);

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
