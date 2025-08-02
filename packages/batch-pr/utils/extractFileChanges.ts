import type { Git } from '@yuki-no/plugin-sdk/infra/git';
import { createTempFilePath } from '@yuki-no/plugin-sdk/utils/common';
import { splitByNewline } from '@yuki-no/plugin-sdk/utils/input';
import fs from 'node:fs';
import path from 'node:path';

export type FileNameFilter = (fileName: string) => boolean;

type FileChangeBase = {
  upstreamFileName: string;
};

export type FileChange = FileChangeBase &
  (
    | {
        type: 'update';
        changes: LineChange[] | Buffer;
      }
    | {
        type: 'delete';
      }
    | {
        type: 'rename' | 'copy';
        nextUpstreamFileName: string;
        similarity: number;
        changes: LineChange[];
      }
    | {
        type: 'type';
      }
  );

export type LineChange =
  | {
      type: 'insert-line';
      lineNumber: number;
      content: string;
    }
  | {
      type: 'delete-line';
      lineNumber: number;
    };

export const extractFileChanges = (
  headGit: Git,
  hash: string,
  filterNameFilter: FileNameFilter,
  rootDir?: string,
): FileChange[] => {
  const fileStatusString = headGit.exec(
    `show --name-status --format="" ${hash}`,
  );
  const fileStatuses = parseFileStatuses(fileStatusString, filterNameFilter);

  if (fileStatuses.length === 0) {
    return [];
  }

  const fileChanges: FileChange[] = [];

  for (const fileStatus of fileStatuses) {
    fileChanges.push(...createFileChanges(headGit, hash, fileStatus, rootDir));
  }

  return fileChanges;
};

type FileStatus =
  | {
      status: 'M' | 'A' | 'D' | 'T';
      headFileName: string;
    }
  | {
      status: 'R' | 'C';
      headFileName: string;
      nextHeadFileName: string;
      similarity: number;
    };

const parseFileStatuses = (
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

const FILE_RENAMED_REGEX = /^R(\d+)\t(.+)\t(.+)$/; // Rename pattern: R100\told.ts\tnew.ts
const FILE_COPIED_REGEX = /^C(\d+)\t(.+)\t(.+)$/; // Copy pattern: C85\tsource.ts\tcopy.ts
const FILE_TYPE_CHANGED_REGEX = /^T\t(.+)$/; // Type change pattern: T\tfile.sh
const FILE_MODIFIED_ADDED_DELETED_REGEX = /^([MAD])\t(.+)$/; // pattern: M\tfile.ts, A\tfile.ts, D\tfile.ts

const parseFileStatus = (statusLine: string): FileStatus => {
  const renamedMatch = statusLine.match(FILE_RENAMED_REGEX);
  if (renamedMatch) {
    const [, similarityStr, headFileName, nextHeadFileName] = renamedMatch;
    return {
      status: 'R',
      headFileName,
      nextHeadFileName,
      similarity: parseInt(similarityStr, 10),
    };
  }

  const copiedMatch = statusLine.match(FILE_COPIED_REGEX);
  if (copiedMatch) {
    const [, similarityStr, headFileName, nextHeadFileName] = copiedMatch;
    return {
      status: 'C',
      headFileName,
      nextHeadFileName,
      similarity: parseInt(similarityStr, 10),
    };
  }

  const typeChangedMatch = statusLine.match(FILE_TYPE_CHANGED_REGEX);
  if (typeChangedMatch) {
    const [, headFileName] = typeChangedMatch;
    return {
      status: 'T',
      headFileName,
    };
  }

  const regularMatch = statusLine.match(FILE_MODIFIED_ADDED_DELETED_REGEX);
  if (regularMatch) {
    const [, status, headFileName] = regularMatch;
    return {
      status: status as 'M' | 'A' | 'D',
      headFileName,
    };
  }

  throw new Error(`Unable to parse status line: ${statusLine}`);
};

const createFileChanges = (
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

// !['D', 'R', 'C', 'T']
const shouldLineChangeProcessing = (fileStatus: FileStatus): boolean =>
  fileStatus.status === 'M' ||
  fileStatus.status === 'A' ||
  ((fileStatus.status === 'R' || fileStatus.status === 'C') &&
    fileStatus.similarity < 100);

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

const resolveFileNameWithRootDir = (
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

const FILE_HEADER_PREFIX = [
  '+++',
  '---',
  'diff',
  'index',
  'new file mode ',
  'deleted file mode ',
  '\\', // special message
];

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

const BINARY_FILE_EXTENSIONS = new Set([
  // Images
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.bmp',
  '.tiff',
  '.ico',
  '.webp',
  // Executables
  '.exe',
  '.dll',
  '.so',
  '.dylib',
  '.bin',
  // Archives
  '.zip',
  '.rar',
  '.tar',
  '.gz',
  '.7z',
  // Audio/Video
  '.mp3',
  '.mp4',
  '.avi',
  '.mkv',
  '.wav',
  '.flac',
  // Fonts
  '.ttf',
  '.otf',
  '.woff',
  '.woff2',
  // Documents
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  // Databases
  '.db',
  '.sqlite',
  '.mdb',
  // Other
  '.iso',
  '.dmg',
  '.img',
]);

const isBinaryFile = (fileName: string): boolean => {
  const ext = path.extname(fileName).toLowerCase();
  return BINARY_FILE_EXTENSIONS.has(ext);
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

// format: 100644 blob (blobHash) (fileName)
const LS_TREE_REGEX = /^(\d+) blob ([a-f0-9]+)\t(.+)$/;

const extractBlobHash = (
  headGit: Git,
  hash: string,
  fileName: string,
): string => {
  const lsTreeString = headGit.exec(`ls-tree -r ${hash}`);
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
  } catch {
    throw new Error(`Failed to extract binary change for blob ${blobHash}`);
  } finally {
    if (fs.existsSync(randomTempPath)) {
      fs.unlinkSync(randomTempPath);
    }
  }
};
