import type { FileLineChanges, LineChange } from './extractFileLineChanges';

import { Git } from '@yuki-no/plugin-sdk/infra/git';
import fs from 'node:fs';
import path from 'node:path';

type ApplyFileLineChangesOptions = {
  fileLineChanges: FileLineChanges[];
  targetGit: Git;
};

export const applyFileLineChanges = async ({
  fileLineChanges,
  targetGit,
}: ApplyFileLineChangesOptions): Promise<void> => {
  if (fileLineChanges.length === 0) {
    return;
  }

  const repoDirName = targetGit.dirName;

  for (const fileChange of fileLineChanges) {
    const filePath = path.join(repoDirName, fileChange.fileName);

    let lines = readFileSync(filePath);

    const deleteChanges = fileChange.changes.filter(c => c.type === 'delete');
    const insertChanges = fileChange.changes.filter(c => c.type === 'insert');

    const sortedDeletes = deleteChanges.sort(
      (a, b) => b.lineNumber - a.lineNumber,
    );
    const sortedInserts = insertChanges.sort(
      (a, b) => a.lineNumber - b.lineNumber,
    );

    // To avoid index shifting
    lines = applyLineChanges(lines, sortedDeletes);
    lines = applyLineChanges(lines, sortedInserts);

    const newContent = lines.join('\n');
    writeFileSync(filePath, newContent);
  }
};

const applyLineChanges = (lines: string[], changes: LineChange[]): string[] => {
  const nextLines = [...lines];

  for (const change of changes) {
    const { type, lineNumber } = change;
    const arrayIndex = lineNumber - 1; // 1-based to 0-based

    switch (type) {
      case 'insert':
        nextLines.splice(arrayIndex, 0, change.content);
        break;

      case 'delete':
        if (arrayIndex >= 0 && arrayIndex < nextLines.length) {
          nextLines.splice(arrayIndex, 1);
        }
        break;
    }
  }

  return nextLines;
};

const readFileSync = (filePath: string): string[] => {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  return content.split('\n');
};

const writeFileSync = (
  filePath: string,
  contents: string,
  encoding = 'utf-8' as BufferEncoding,
): void => {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(filePath, contents, encoding);
};
