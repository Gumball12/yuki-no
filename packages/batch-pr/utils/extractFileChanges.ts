import type { FileChange, FileNameFilter } from '../types';

import { createFileChanges } from './createFileChanges';
import { parseFileStatuses } from './parseFileStatuses';

import type { Git } from '@yuki-no/plugin-sdk/infra/git';
import { log } from '@yuki-no/plugin-sdk/utils/log';

export const extractFileChanges = (
  headGit: Git,
  hash: string,
  fileNameFilter: FileNameFilter,
  rootDir?: string,
): FileChange[] => {
  log('I', `extractFileChanges :: Starting extraction for hash: ${hash}`);

  const fileStatusString = headGit.exec(
    `show --name-status --format="" ${hash}`,
  );
  const fileStatuses = parseFileStatuses(fileStatusString, fileNameFilter);

  log('I', `extractFileChanges :: Found ${fileStatuses.length} file statuses`);

  if (fileStatuses.length === 0) {
    log(
      'I',
      'extractFileChanges :: No file changes found, returning empty array',
    );
    return [];
  }

  log(
    'I',
    `extractFileChanges :: Processing ${fileStatuses.length} file statuses`,
  );
  const fileChanges: FileChange[] = [];

  for (const fileStatus of fileStatuses) {
    fileChanges.push(...createFileChanges(headGit, hash, fileStatus, rootDir));
  }

  log(
    'S',
    `extractFileChanges :: Successfully extracted ${fileChanges.length} file changes`,
  );
  return fileChanges;
};
