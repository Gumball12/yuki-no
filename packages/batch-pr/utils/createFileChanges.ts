import { FILE_HEADER_PREFIX } from '../constants';
import type { FileChange, FileStatus, LineChange } from '../types';

import { extractBlobHash } from './extractBlobHash';
import { isBinaryFile } from './isBinaryFile';
import { resolveFileNameWithRootDir } from './resolveFileNameWithRootDir';

import type { Git } from '@yuki-no/plugin-sdk/infra/git';
import { createTempFilePath } from '@yuki-no/plugin-sdk/utils/common';
import { splitByNewline } from '@yuki-no/plugin-sdk/utils/input';
import fs from 'node:fs';

export const createFileChanges = (
  headGit: Git,
  hash: string,
  fileStatus: FileStatus,
  rootDir?: string,
): FileChange[] => {
  const { headFileName } = fileStatus;
  const upstreamFileName = resolveFileNameWithRootDir(headFileName, rootDir);

  if (!shouldLineChangeProcessing(fileStatus)) {
    return [createSimpleFileChange(fileStatus, upstreamFileName, rootDir)];
  }

  if (isBinaryFile(headFileName)) {
    return createBinaryFileChanges(headGit, hash, fileStatus, upstreamFileName);
  }

  return [
    createComplexFileChange(
      headGit,
      hash,
      fileStatus,
      upstreamFileName,
      rootDir,
    ),
  ];
};

const PERFECT_SIMILARITY = 100;

// !['D', 'R', 'C', 'T']
const shouldLineChangeProcessing = (fileStatus: FileStatus): boolean =>
  fileStatus.status === 'M' ||
  fileStatus.status === 'A' ||
  ((fileStatus.status === 'R' || fileStatus.status === 'C') &&
    fileStatus.similarity < PERFECT_SIMILARITY);

const createSimpleFileChange = (
  fileStatus: FileStatus, // D, R100, C100, T
  upstreamFileName: string,
  rootDir?: string,
): FileChange => {
  const { status } = fileStatus;

  if (status === 'D') {
    return { type: 'delete', upstreamFileName };
  }

  if (status === 'R' || status === 'C') {
    const nextUpstreamFileName = resolveFileNameWithRootDir(
      fileStatus.nextHeadFileName,
      rootDir,
    );

    return {
      type: status === 'R' ? 'rename' : 'copy',
      upstreamFileName,
      nextUpstreamFileName,
      similarity: fileStatus.similarity,
      changes: [],
    };
  }

  if (status === 'T') {
    return { type: 'type', upstreamFileName };
  }

  throw new Error(`Failed to create FileChange for ${upstreamFileName}`);
};

const createComplexFileChange = (
  headGit: Git,
  hash: string,
  fileStatus: FileStatus, // A, M, R<100, C<100
  upstreamFileName: string,
  rootDir?: string,
): FileChange => {
  const { status, headFileName } = fileStatus;

  if (status === 'A' || status === 'M') {
    return {
      type: 'update',
      upstreamFileName,
      changes: createLineChanges(headGit, hash, headFileName),
    };
  }

  if (status === 'R' || status === 'C') {
    const nextUpstreamFileName = resolveFileNameWithRootDir(
      fileStatus.nextHeadFileName,
      rootDir,
    );

    return {
      type: status === 'R' ? 'rename' : 'copy',
      upstreamFileName,
      nextUpstreamFileName,
      similarity: fileStatus.similarity,
      changes: createLineChanges(headGit, hash, headFileName),
    };
  }

  throw new Error(`Failed to create FileChange for ${upstreamFileName}`);
};

const createLineChanges = (
  headGit: Git,
  hash: string,
  fileName: string,
): LineChange[] => {
  const blobHash = extractBlobHash(headGit, hash, fileName);
  const diffString = headGit.exec(`show -U0 --format= ${hash} ${blobHash}`);
  const diffLines = splitByNewline(diffString, false);

  const lineChanges: LineChange[] = [];
  let oldLineNumber = 0;
  let newLineNumber = 0;

  for (const diffLine of diffLines) {
    const parsedDiff = parseDiffLine(diffLine, oldLineNumber, newLineNumber);

    if (parsedDiff.type === 'skip') {
      continue;
    }

    if (parsedDiff.type === 'hunk-header') {
      oldLineNumber = parsedDiff.oldLineNumber;
      newLineNumber = parsedDiff.newLineNumber;
      continue;
    }

    const { nextNewLineNumber, nextOldLineNumber } = parsedDiff;

    if (parsedDiff.type === 'change') {
      lineChanges.push(parsedDiff.change);
    }

    oldLineNumber = nextOldLineNumber;
    newLineNumber = nextNewLineNumber;
  }

  return lineChanges;
};

type ParsedDiff =
  | { type: 'skip' }
  | { type: 'hunk-header'; oldLineNumber: number; newLineNumber: number }
  | {
      type: 'change';
      change: LineChange;
      nextOldLineNumber: number;
      nextNewLineNumber: number;
    }
  | {
      type: 'context';
      nextOldLineNumber: number;
      nextNewLineNumber: number;
    };

// hunk header format: @@ -old_start,old_count +new_start,new_count @@
const HUNK_HEADER_REGEX = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/;

const parseDiffLine = (
  diffLine: string,
  currentOldLineNumber: number,
  currentNewLineNumber: number,
): ParsedDiff => {
  if (FILE_HEADER_PREFIX.some(v => diffLine.startsWith(v))) {
    return { type: 'skip' };
  }

  const hunkMatch = diffLine.match(HUNK_HEADER_REGEX);
  if (hunkMatch) {
    const oldStart = parseInt(hunkMatch[1], 10);
    const newStart = parseInt(hunkMatch[3], 10);
    return {
      type: 'hunk-header',
      oldLineNumber: oldStart,
      newLineNumber: newStart,
    };
  }

  const isAdded = diffLine.startsWith('+');
  if (isAdded) {
    return {
      type: 'change',
      nextOldLineNumber: currentOldLineNumber,
      nextNewLineNumber: currentNewLineNumber + 1,
      change: {
        type: 'insert-line',
        lineNumber: currentNewLineNumber,
        content: diffLine.substring(1), // substr '+' (format: `+<content>`)
      },
    };
  }

  const isDeleted = diffLine.startsWith('-');
  if (isDeleted) {
    return {
      type: 'change',
      nextOldLineNumber: currentOldLineNumber + 1,
      nextNewLineNumber: currentNewLineNumber,
      change: {
        type: 'delete-line',
        lineNumber: currentOldLineNumber,
      },
    };
  }

  const isContext = diffLine.startsWith(' ') || diffLine === '';
  if (isContext) {
    return {
      type: 'context',
      nextOldLineNumber: currentOldLineNumber + 1,
      nextNewLineNumber: currentNewLineNumber + 1,
    };
  }

  return { type: 'skip' };
};

const SHOULD_DELETE_STATUS: FileStatus['status'][] = ['R', 'D', 'M'];
const SHOULD_ADD_STATUS: FileStatus['status'][] = ['R', 'C', 'A', 'M'];

type BinaryFileChange = Extract<FileChange, { type: 'delete' | 'update' }>;

const createBinaryFileChanges = (
  headGit: Git,
  hash: string,
  { headFileName, status }: FileStatus,
  upstreamFileName: string,
): BinaryFileChange[] => {
  const fileChanges: BinaryFileChange[] = [];

  if (SHOULD_DELETE_STATUS.includes(status)) {
    fileChanges.push({ type: 'delete', upstreamFileName });
  }

  if (!SHOULD_ADD_STATUS.includes(status)) {
    return fileChanges;
  }

  const blobHash = extractBlobHash(headGit, hash, headFileName);
  const binaryChange = extractBinaryChangeSafely(headGit, blobHash);
  fileChanges.push({
    type: 'update',
    upstreamFileName,
    changes: binaryChange,
  });

  return fileChanges;
};

const extractBinaryChangeSafely = (headGit: Git, blobHash: string): Buffer => {
  const randomTempPath = createTempFilePath(
    `yuki-no-binary__${Date.now()}-${Math.random()}.tmp`,
  );

  try {
    headGit.exec(`show ${blobHash} > "${randomTempPath}"`);

    if (!fs.existsSync(randomTempPath)) {
      throw new Error();
    }

    return fs.readFileSync(randomTempPath);
  } catch (error) {
    throw new Error(
      `Failed to extract binary change for blob ${blobHash}: ${(error as Error).message}`,
    );
  } finally {
    if (fs.existsSync(randomTempPath)) {
      fs.unlinkSync(randomTempPath);
    }
  }
};
