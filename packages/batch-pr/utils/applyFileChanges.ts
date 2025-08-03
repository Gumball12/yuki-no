import type { FileChange, LineChange } from '../types';

import type { Git } from '@yuki-no/plugin-sdk/infra/git';
import { formatError } from '@yuki-no/plugin-sdk/utils/common';
import { log } from '@yuki-no/plugin-sdk/utils/log';
import fs from 'node:fs';
import path from 'node:path';

export const applyFileChanges = (
  upstreamGit: Git,
  fileChanges: FileChange[],
): void => {
  log(
    'I',
    `applyFileChanges :: Starting to apply ${fileChanges.length} file changes`,
  );

  if (fileChanges.length === 0) {
    log('I', 'applyFileChanges :: No file changes to apply, returning');
    return;
  }

  const repoDirName = upstreamGit.dirName;

  for (const fileChange of fileChanges) {
    const absoluteFileName = path.join(
      repoDirName,
      fileChange.upstreamFileName,
    );

    log(
      'I',
      `applyFileChanges :: Processing ${fileChange.type} for ${fileChange.upstreamFileName}`,
    );

    try {
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
          log(
            'I',
            `applyFileChanges :: Ignoring type change for ${fileChange.upstreamFileName}`,
          );
          break;
      }
    } catch (error) {
      log(
        'E',
        `applyFileChanges :: Failed to process ${fileChange.type} for ${fileChange.upstreamFileName}: ${formatError(error)}`,
      );
      throw error;
    }
  }

  log(
    'S',
    `applyFileChanges :: Successfully applied all ${fileChanges.length} file changes`,
  );
};

const deleteFileSync = (absoluteFileName: string): void => {
  if (!fs.existsSync(absoluteFileName)) {
    log(
      'I',
      `deleteFileSync :: File ${absoluteFileName} does not exist, skipping deletion`,
    );
    return;
  }

  try {
    fs.unlinkSync(absoluteFileName);
    log('S', `deleteFileSync :: Successfully deleted ${absoluteFileName}`);
  } catch (error) {
    log(
      'E',
      `deleteFileSync :: Failed to delete ${absoluteFileName}: ${formatError(error)}`,
    );
    throw error;
  }
};

const handleUpdateFile = (
  absoluteFileName: string,
  { changes }: Pick<Extract<FileChange, { type: 'update' }>, 'changes'>,
): void => {
  log('I', `handleUpdateFile :: Updating file ${absoluteFileName}`);

  if (Buffer.isBuffer(changes)) {
    log(
      'I',
      `handleUpdateFile :: Writing binary content (${changes.length} bytes)`,
    );
    writeFileSync(absoluteFileName, changes);
    return;
  }

  log('I', `handleUpdateFile :: Processing ${changes.length} line changes`);

  // To avoid index shifting
  const deleteChanges = changes.filter(({ type }) => type === 'delete-line');
  const insertChanges = changes.filter(({ type }) => type === 'insert-line');

  log(
    'I',
    `handleUpdateFile :: ${deleteChanges.length} deletions, ${insertChanges.length} insertions`,
  );

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
  log('S', `handleUpdateFile :: Successfully updated ${absoluteFileName}`);
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

  const nextLines = [...lines];
  return changes.reduce(applyLineChange, nextLines);
};

const applyLineChange = (lines: string[], lineChange: LineChange): string[] => {
  const index = lineChange.lineNumber - 1; // 1-based to 0-based

  switch (lineChange.type) {
    case 'insert-line':
      lines.splice(Math.max(index, 0), 0, lineChange.content);
      break;

    case 'delete-line':
      if (index >= 0 && index < lines.length) {
        lines.splice(index, 1);
      }
      break;
  }

  return lines;
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
    log(
      'I',
      `handleMoveFile :: Source file ${absoluteFileName} does not exist, skipping ${type}`,
    );
    return;
  }

  const absoluteNextFileName = path.join(repoDirName, nextUpstreamFileName);
  log(
    'I',
    `handleMoveFile :: ${type === 'rename' ? 'Renaming' : 'Copying'} ${absoluteFileName} to ${absoluteNextFileName}`,
  );

  const nextDirName = path.dirname(absoluteNextFileName);
  createDirIfNotExists(nextDirName);

  try {
    if (type === 'rename') {
      fs.renameSync(absoluteFileName, absoluteNextFileName);
    } else {
      fs.copyFileSync(absoluteFileName, absoluteNextFileName);
    }

    log(
      'S',
      `handleMoveFile :: Successfully ${type === 'rename' ? 'renamed' : 'copied'} to ${absoluteNextFileName}`,
    );

    if (changes.length > 0) {
      log(
        'I',
        `handleMoveFile :: Applying ${changes.length} additional changes to moved file`,
      );
      handleUpdateFile(absoluteNextFileName, { changes });
    }
  } catch (error) {
    log(
      'E',
      `handleMoveFile :: Failed to ${type} ${absoluteFileName}: ${formatError(error)}`,
    );
    throw error;
  }
};

const createDirIfNotExists = (dir: string): void => {
  if (fs.existsSync(dir)) {
    return;
  }

  fs.mkdirSync(dir, { recursive: true });
};
