import { FILE_STATUS_REGEX } from '../constants';
import type { FileStatus } from '../types';

import type { FileNameFilter } from '@yuki-no/plugin-sdk/utils/createFileNameFilter';
import { splitByNewline } from '@yuki-no/plugin-sdk/utils/input';
import { formatError, log } from '@yuki-no/plugin-sdk/utils/log';

export const parseFileStatuses = (
  statusString: string,
  fileNameFilter: FileNameFilter,
  onExcluded?: (path: string) => void,
): FileStatus[] => {
  const statusLines = splitByNewline(statusString);
  log(
    'I',
    `parseFileStatuses :: Processing ${statusLines.length} status lines`,
  );

  const statuses: FileStatus[] = [];
  let excludedCount = 0;

  for (const statusLine of statusLines) {
    const fileStatus = parseFileStatus(statusLine);
    let shouldInclude = fileNameFilter(fileStatus.headFileName);
    const isRenameOrCopy =
      fileStatus.status === 'R' || fileStatus.status === 'C';

    if (isRenameOrCopy) {
      shouldInclude = fileNameFilter(fileStatus.nextHeadFileName);
    }

    if (shouldInclude) {
      statuses.push(fileStatus);
    } else {
      const excludedPath = isRenameOrCopy
        ? fileStatus.nextHeadFileName
        : fileStatus.headFileName;
      onExcluded?.(excludedPath);
      excludedCount++;
    }
  }

  log(
    'I',
    `parseFileStatuses :: Filtered ${statuses.length} files (${excludedCount} excluded)`,
  );
  log(
    'S',
    `parseFileStatuses :: Successfully parsed ${statuses.length} file statuses`,
  );

  return statuses;
};

const parseFileStatus = (statusLine: string): FileStatus => {
  try {
    const renamedMatch = statusLine.match(FILE_STATUS_REGEX.RENAMED);
    if (renamedMatch) {
      const [, similarityStr, headFileName, nextHeadFileName] = renamedMatch;
      log(
        'I',
        `parseFileStatus :: Parsed RENAMED: ${headFileName} -> ${nextHeadFileName}`,
      );
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
      log(
        'I',
        `parseFileStatus :: Parsed COPIED: ${headFileName} -> ${nextHeadFileName}`,
      );
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
      log('I', `parseFileStatus :: Parsed TYPE_CHANGED: ${headFileName}`);
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
      log('I', `parseFileStatus :: Parsed ${status}: ${headFileName}`);
      return {
        status: status as 'M' | 'A' | 'D',
        headFileName,
      };
    }

    log('E', `parseFileStatus :: Unable to parse status line: ${statusLine}`);
    throw new Error(`Unable to parse status line: ${statusLine}`);
  } catch (error) {
    log(
      'E',
      `parseFileStatus :: Error parsing line "${statusLine}": ${formatError(error)}`,
    );
    throw error;
  }
};
