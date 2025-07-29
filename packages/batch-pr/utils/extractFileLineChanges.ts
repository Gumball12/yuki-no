import { Git } from '@yuki-no/plugin-sdk/infra/git';
import { isNotEmpty } from '@yuki-no/plugin-sdk/utils/common';
import { log } from '@yuki-no/plugin-sdk/utils/log';

export type LineChange =
  | {
      type: 'insert';
      lineNumber: number;
      content: string;
    }
  | {
      type: 'delete';
      lineNumber: number;
    };

export type FileLineChanges = {
  fileName: string;
  changes: LineChange[];
};

export type FileNameFilter = (fileName: string) => boolean;

type ExtractFileLineChangesOptions = {
  headGit: Git;
  hash: string;
  fileNameFilter: FileNameFilter;
  rootDir?: string;
};

export const extractFileLineChanges = ({
  headGit,
  hash,
  fileNameFilter,
  rootDir,
}: ExtractFileLineChangesOptions): FileLineChanges[] => {
  log(
    'I',
    `extractFileLineChanges :: Starting file line changes extraction for commit ${hash.substring(0, 8)}`,
  );

  const fileNamesString = headGit.exec(`show --name-only --format="" ${hash}`);
  const changedFileNames = fileNamesString
    .split('\n')
    .map(l => l.trim())
    .filter(isNotEmpty)
    .filter(fileNameFilter);

  log(
    'I',
    `extractFileLineChanges :: Found ${changedFileNames.length} changed files after filtering`,
  );

  if (changedFileNames.length === 0) {
    log('I', 'extractFileLineChanges :: No files to process');
    return [];
  }

  const fileLineChanges: FileLineChanges[] = [];

  for (const fileName of changedFileNames) {
    log('I', `extractFileLineChanges :: Processing file: ${fileName}`);
    const changes = extractLineChangesFromFile(headGit, hash, fileName);

    if (changes.length === 0) {
      log(
        'I',
        `extractFileLineChanges :: No changes found for file: ${fileName}`,
      );
      continue;
    }

    const resolvedFileName = resolveFileNameWithRootDir(fileName, rootDir);
    log(
      'I',
      `extractFileLineChanges :: Added ${changes.length} changes for file: ${resolvedFileName}`,
    );
    fileLineChanges.push({ fileName: resolvedFileName, changes });
  }

  log(
    'S',
    `extractFileLineChanges :: Successfully extracted changes from ${fileLineChanges.length} files`,
  );
  return fileLineChanges;
};

// hunk header format: @@ -old_start,old_count +new_start,new_count @@
const HUNK_HEADER_REGEX = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/;

const FILE_HEADER_PREFIX = [
  '+++',
  '---',
  'diff',
  'index',
  'new file mode ',
  'deleted file mode ',
];

const extractLineChangesFromFile = (
  headGit: Git,
  hash: string,
  fileName: string,
): LineChange[] => {
  const diffOutput = headGit.exec(
    `show -U0 --format= ${hash} -- "${fileName}"`,
  );

  if (!diffOutput.trim()) {
    return [];
  }

  const changes: LineChange[] = [];
  const diffLines = diffOutput.split('\n');

  let oldLineNumber = 0;
  let newLineNumber = 0;

  for (const line of diffLines) {
    const isFileHeader = FILE_HEADER_PREFIX.some(v => line.startsWith(v));
    if (isFileHeader) {
      continue;
    }

    const hunkMatch = line.match(HUNK_HEADER_REGEX);
    if (hunkMatch) {
      // Extract old_start and new_start from hunk header
      const oldStart = hunkMatch[1];
      const newStart = hunkMatch[3];
      oldLineNumber = parseInt(oldStart, 10);
      newLineNumber = parseInt(newStart, 10);
      continue;
    }

    const isSpecialMessage = line.startsWith('\\'); // e.g. "No newline at end of file"
    if (isSpecialMessage) {
      continue;
    }

    const isAdded = line.startsWith('+');
    if (isAdded) {
      changes.push({
        type: 'insert',
        lineNumber: newLineNumber,
        content: line.substring(1),
      });
      newLineNumber++;
      continue;
    }

    const isDeleted = line.startsWith('-');
    if (isDeleted) {
      changes.push({
        type: 'delete',
        lineNumber: oldLineNumber,
      });
      oldLineNumber++;
      continue;
    }
  }

  return changes;
};

export const resolveFileNameWithRootDir = (
  fileName: string,
  rootDir?: string,
): string => {
  if (!rootDir) {
    return fileName;
  }

  if (fileName === rootDir) {
    return '';
  }

  const normalizedRootDir = rootDir.endsWith('/') ? rootDir : `${rootDir}/`;

  if (!fileName.startsWith(normalizedRootDir)) {
    return fileName;
  }

  return fileName.substring(normalizedRootDir.length);
};
