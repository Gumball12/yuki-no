import { FILE_HEADER_PREFIX } from '../constants';
import type { FileChange, FileStatus, LineChange } from '../types';

import { isBinaryFile } from './isBinaryFile';
import { resolveFileNameWithRootDir } from './resolveFileNameWithRootDir';

import type { Git } from '@yuki-no/plugin-sdk/infra/git';
import { createTempFilePath } from '@yuki-no/plugin-sdk/utils/common';
import { splitByNewline } from '@yuki-no/plugin-sdk/utils/input';
import { formatError, log } from '@yuki-no/plugin-sdk/utils/log';
import fs from 'node:fs';

export const createFileChanges = (
  headGit: Git,
  hash: string,
  fileStatus: FileStatus,
  rootDir?: string,
): FileChange[] => {
  const { headFileName } = fileStatus;
  const upstreamFileName = resolveFileNameWithRootDir(headFileName, rootDir);

  log(
    'I',
    `createFileChanges :: Processing ${fileStatus.status} for ${headFileName}(head) ${upstreamFileName}(upstream)`,
  );

  if (!shouldLineChangeProcessing(fileStatus)) {
    log('I', 'createFileChanges :: Using simple processing (no line changes)');
    return [createSimpleFileChange(fileStatus, upstreamFileName, rootDir)];
  }

  if (isBinaryFile(headFileName)) {
    log('I', 'createFileChanges :: File is binary, using binary processing');
    return createBinaryFileChanges(headGit, hash, fileStatus, upstreamFileName);
  }

  log('I', 'createFileChanges :: File is text, using complex processing');
  const result = [
    createComplexFileChange(
      headGit,
      hash,
      fileStatus,
      upstreamFileName,
      rootDir,
    ),
  ];

  log('S', `createFileChanges :: Generated ${result.length} file changes`);
  return result;
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

  const diffString = headGit.exec(`show -U0 --format= ${hash}`);
  const filesDiffString = parseDiffStringByFileName(diffString);
  const fileDiffString = filesDiffString.find(
    ({ fileName }) => fileName === headFileName,
  )?.diffString;

  if (!fileDiffString) {
    throw new Error(
      `Failed to extract fileName from ${hash} for ${headFileName}`,
    );
  }

  log('I', `createComplexFileChange :: Extracting changes for ${headFileName}`);

  if (status === 'A' || status === 'M') {
    return {
      type: 'update',
      upstreamFileName,
      changes: createLineChanges(fileDiffString),
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
      changes: createLineChanges(fileDiffString),
    };
  }

  throw new Error(`Failed to create FileChange for ${upstreamFileName}`);
};

const parseDiffStringByFileName = (
  diffString: string,
): { diffString: string; fileName: string }[] =>
  diffString
    .split('diff --git')
    .slice(1)
    .map(str => {
      const fileDiffString = `diff --git${str}`;
      const fileNameMatch = fileDiffString.match(/diff --git a\/(.+) b\/(.+)/);

      if (!fileNameMatch) {
        throw new Error(`Failed to extract fileName`);
      }

      return { diffString: fileDiffString, fileName: fileNameMatch[1] };
    });

const createLineChanges = (fileDiffString: string): LineChange[] => {
  const diffLines = splitByNewline(fileDiffString, false);

  log('I', `createLineChanges :: Processing ${diffLines.length} diff lines`);

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

  log('S', `createLineChanges :: Generated ${lineChanges.length} line changes`);
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
  log('I', `createBinaryFileChanges :: Processing binary file ${headFileName}`);

  const fileChanges: BinaryFileChange[] = [];

  if (SHOULD_DELETE_STATUS.includes(status)) {
    log(
      'I',
      `createBinaryFileChanges :: Adding delete operation for ${upstreamFileName}`,
    );
    fileChanges.push({ type: 'delete', upstreamFileName });
  }

  if (!SHOULD_ADD_STATUS.includes(status)) {
    log(
      'I',
      `createBinaryFileChanges :: Skipping add operation for status ${status}`,
    );
    return fileChanges;
  }

  log(
    'I',
    `createBinaryFileChanges :: Adding update operation for ${upstreamFileName}`,
  );
  const blobHash = extractBlobHash(headGit, hash, headFileName);
  const binaryChange = extractBinaryChangeSafely(headGit, blobHash);
  fileChanges.push({
    type: 'update',
    upstreamFileName,
    changes: binaryChange,
  });

  log(
    'S',
    `createBinaryFileChanges :: Generated ${fileChanges.length} binary changes`,
  );
  return fileChanges;
};

const extractBinaryChangeSafely = (headGit: Git, blobHash: string): Buffer => {
  log(
    'I',
    `extractBinaryChangeSafely :: Extracting binary data for blob ${blobHash}`,
  );

  const randomTempPath = createTempFilePath(
    `yuki-no-binary__${Date.now()}-${Math.random()}.tmp`,
  );

  try {
    log(
      'I',
      `extractBinaryChangeSafely :: Creating temp file ${randomTempPath}`,
    );
    headGit.exec(`show ${blobHash} > "${randomTempPath}"`);

    if (!fs.existsSync(randomTempPath)) {
      throw new Error();
    }

    const buffer = fs.readFileSync(randomTempPath);
    log(
      'S',
      `extractBinaryChangeSafely :: Successfully extracted ${buffer.length} bytes for blob ${blobHash}`,
    );
    return buffer;
  } catch (error) {
    log(
      'E',
      `extractBinaryChangeSafely :: Failed to extract blob ${blobHash}: ${formatError(error)}`,
    );
    throw new Error(
      `Failed to extract binary change for blob ${blobHash} / error: ${formatError(error)}`,
    );
  } finally {
    if (fs.existsSync(randomTempPath)) {
      log(
        'I',
        `extractBinaryChangeSafely :: Cleaning up temp file ${randomTempPath}`,
      );
      fs.unlinkSync(randomTempPath);
    }
  }
};

// format: 100644 blob (blobHash) (fileName)
const LS_TREE_REGEX = /^(\d+) blob ([a-f0-9]+)\t(.+)$/;

const extractBlobHash = (git: Git, hash: string, fileName: string): string => {
  const lsTreeString = git.exec(`ls-tree -r ${hash}`);
  const lines = splitByNewline(lsTreeString);

  for (const line of lines) {
    const match = line.match(LS_TREE_REGEX);

    if (!match) {
      continue;
    }

    const [, , blobHash, parsedFileName] = match;
    if (parsedFileName === fileName) {
      return blobHash;
    }
  }

  throw new Error(
    `Failed to extract blob hash for ${fileName} (head-repo: ${hash})`,
  );
};
