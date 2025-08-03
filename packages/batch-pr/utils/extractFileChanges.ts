import type { FileChange, FileNameFilter } from '../types';

import { createFileChanges } from './createFileChanges';
import { parseFileStatuses } from './parseFileStatuses';

import type { Git } from '@yuki-no/plugin-sdk/infra/git';

export const extractFileChanges = (
  headGit: Git,
  hash: string,
  filterNameFilter: FileNameFilter,
  rootDir?: string,
): FileChange[] => {
  const fileStatusString = headGit.exec(
    `show --name-status --format="" ${hash}`,
  );
  const fileStatuses = parseFileStatuses(fileStatusString, filterNameFilter);

  if (fileStatuses.length === 0) {
    return [];
  }

  const fileChanges: FileChange[] = [];

  for (const fileStatus of fileStatuses) {
    fileChanges.push(...createFileChanges(headGit, hash, fileStatus, rootDir));
  }

  return fileChanges;
};
