import { Git } from '@yuki-no/plugin-sdk/infra/git';
import { isNotEmpty } from '@yuki-no/plugin-sdk/utils/common';

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

export const extractFileLineChanges = (
  headGit: Git,
  hash: string,
  fileNameFilter: FileNameFilter,
): FileLineChanges[] => {
  const fileNamesString = headGit.exec(`show --name-only --format="" ${hash}`);
  const changedFileNames = fileNamesString
    .split('\n')
    .map(l => l.trim())
    .filter(isNotEmpty)
    .filter(fileNameFilter);

  if (changedFileNames.length === 0) {
    return [];
  }

  const fileLineChanges: FileLineChanges[] = [];

  for (const fileName of changedFileNames) {
    const changes = extractLineChangesFromFile(headGit, hash, fileName);
    if (changes.length > 0) {
      fileLineChanges.push({ fileName, changes });
    }
  }

  return fileLineChanges;
};

// hunk header format: @@ -old_start,old_count +new_start,new_count @@
const HUNK_HEADER_REGEX = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/;

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
    const isFileHeader =
      line.startsWith('+++') ||
      line.startsWith('---') ||
      line.startsWith('diff') ||
      line.startsWith('index') ||
      line.startsWith('new file mode ') ||
      line.startsWith('deleted file mode ');
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
