import { FILE_STATUS_REGEX } from '../constants';
import type { FileNameFilter, FileStatus } from '../types';

import { splitByNewline } from '@yuki-no/plugin-sdk/utils/input';

export const parseFileStatuses = (
  statusString: string,
  fileNameFilter: FileNameFilter,
): FileStatus[] => {
  const statusLines = splitByNewline(statusString);
  const statuses: FileStatus[] = [];

  for (const statusLine of statusLines) {
    const fileStatus = parseFileStatus(statusLine);
    let shouldInclude = fileNameFilter(fileStatus.headFileName);

    if (fileStatus.status === 'R' || fileStatus.status === 'C') {
      shouldInclude = fileNameFilter(fileStatus.nextHeadFileName);
    }

    if (shouldInclude) {
      statuses.push(fileStatus);
    }
  }

  return statuses;
};

const parseFileStatus = (statusLine: string): FileStatus => {
  const renamedMatch = statusLine.match(FILE_STATUS_REGEX.RENAMED);
  if (renamedMatch) {
    const [, similarityStr, headFileName, nextHeadFileName] = renamedMatch;
    return {
      status: 'R',
      headFileName,
      nextHeadFileName,
      similarity: parseInt(similarityStr, 10),
    };
  }

  const copiedMatch = statusLine.match(FILE_STATUS_REGEX.COPIED);
  if (copiedMatch) {
    const [, similarityStr, headFileName, nextHeadFileName] = copiedMatch;
    return {
      status: 'C',
      headFileName,
      nextHeadFileName,
      similarity: parseInt(similarityStr, 10),
    };
  }

  const typeChangedMatch = statusLine.match(FILE_STATUS_REGEX.TYPE_CHANGED);
  if (typeChangedMatch) {
    const [, headFileName] = typeChangedMatch;
    return {
      status: 'T',
      headFileName,
    };
  }

  const regularMatch = statusLine.match(
    FILE_STATUS_REGEX.MODIFIED_ADDED_DELETED,
  );
  if (regularMatch) {
    const [, status, headFileName] = regularMatch;
    return {
      status: status as 'M' | 'A' | 'D',
      headFileName,
    };
  }

  throw new Error(`Unable to parse status line: ${statusLine}`);
};
