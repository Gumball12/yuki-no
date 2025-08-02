import type { FileChange, LineChange } from './extractFileChanges';

import type { Git } from '@yuki-no/plugin-sdk/infra/git';
import fs from 'node:fs';
import path from 'node:path';

export const applyFileChanges = (
  upstreamGit: Git,
  fileChanges: FileChange[],
): void => {
  if (fileChanges.length === 0) {
    return;
  }

  const repoDirName = upstreamGit.dirName;

  for (const fileChange of fileChanges) {
    const absoluteFileName = path.join(
      repoDirName,
      fileChange.upstreamFileName,
    );

    switch (fileChange.type) {
      case 'update':
        handleUpdateFile(absoluteFileName, fileChange);
        break;

      case 'delete':
        deleteFileSync(absoluteFileName);
        break;

      case 'rename':
      case 'copy':
        handleMoveFile(absoluteFileName, repoDirName, fileChange);
        break;

      case 'type':
        // noop (ignore)
        break;
    }
  }
};

const deleteFileSync = (absoluteFileName: string): void => {
  if (!fs.existsSync(absoluteFileName)) {
    return;
  }

  fs.unlinkSync(absoluteFileName);
};

const handleUpdateFile = (
  absoluteFileName: string,
  { changes }: Pick<Extract<FileChange, { type: 'update' }>, 'changes'>,
): void => {
  if (Buffer.isBuffer(changes)) {
    writeFileSync(absoluteFileName, changes);
    return;
  }

  // To avoid index shifting
  const deleteChanges = changes.filter(({ type }) => type === 'delete-line');
  const insertChanges = changes.filter(({ type }) => type === 'insert-line');

  const sortedDeletes = deleteChanges.sort(
    (a, b) => b.lineNumber - a.lineNumber,
  );
  const sortedInserts = insertChanges.sort(
    (a, b) => a.lineNumber - b.lineNumber,
  );

  let lines = readFileSync(absoluteFileName);
  lines = applyLineChanges(lines, sortedDeletes);
  lines = applyLineChanges(lines, sortedInserts);

  const nextContent = lines.join('\n');
  writeFileSync(absoluteFileName, nextContent);
};

const readFileSync = (fileName: string): string[] => {
  if (!fs.existsSync(fileName)) {
    return [];
  }

  const content = fs.readFileSync(fileName, 'utf-8');
  if (content === '') {
    return [];
  }

  return content.split('\n');
};

const applyLineChanges = (lines: string[], changes: LineChange[]): string[] => {
  if (changes.length === 0) {
    return lines;
  }

  return changes.reduce(applyLineChange, lines);
};

const applyLineChange = (lines: string[], lineChange: LineChange): string[] => {
  const index = lineChange.lineNumber - 1; // 1-based to 0-based
  const nextLines = [...lines];

  switch (lineChange.type) {
    case 'insert-line':
      nextLines.splice(Math.max(index, 0), 0, lineChange.content);
      break;

    case 'delete-line':
      if (index >= 0 && index < nextLines.length) {
        nextLines.splice(index, 1);
      }
      break;
  }

  return nextLines;
};

const writeFileSync = (
  fileName: string,
  contents: string | Buffer,
  encoding = 'utf-8' as BufferEncoding,
): void => {
  const dir = path.dirname(fileName);
  createDirIfNotExists(dir);

  if (Buffer.isBuffer(contents)) {
    fs.writeFileSync(fileName, contents);
  } else {
    fs.writeFileSync(fileName, contents, encoding);
  }
};

const handleMoveFile = (
  absoluteFileName: string,
  repoDirName: string,
  {
    type,
    nextUpstreamFileName,
    changes,
  }: Extract<FileChange, { type: 'rename' | 'copy' }>,
): void => {
  if (!fs.existsSync(absoluteFileName)) {
    return;
  }

  const absoluteNextFileName = path.join(repoDirName, nextUpstreamFileName);
  const nextDirName = path.dirname(absoluteNextFileName);
  createDirIfNotExists(nextDirName);

  if (type === 'rename') {
    fs.renameSync(absoluteFileName, absoluteNextFileName);
  } else {
    fs.copyFileSync(absoluteFileName, absoluteNextFileName);
  }

  if (changes.length > 0) {
    handleUpdateFile(absoluteNextFileName, { changes });
  }
};

const createDirIfNotExists = (dir: string): void => {
  if (fs.existsSync(dir)) {
    return;
  }

  fs.mkdirSync(dir, { recursive: true });
};
