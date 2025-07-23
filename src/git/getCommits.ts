import type { Config } from '../createConfig';
import { getISODate } from '../github/utils';
import { isNotEmpty, log, splitByNewline } from '../utils';

import type { Git } from './core';

export type Commit = {
  title: string;
  isoDate: string;
  hash: string;
  fileNames: string[];
};

type GetCommitsOptions = {
  git: Git;
  trackFrom: Config['trackFrom'];
  commitFilter: (commit: Commit) => boolean;
  latestSuccessfulRun?: string;
};

export const COMMIT_SEP = ':COMMIT_START_SEP:';
export const COMMIT_DATA_SEPARATOR = ':COMMIT_DATA_SEP:';

export const getCommits = ({
  git,
  trackFrom,
  commitFilter,
  latestSuccessfulRun,
}: GetCommitsOptions): Commit[] => {
  const command = [
    'log',
    'origin/main',
    trackFrom ? `${trackFrom}..` : undefined,
    latestSuccessfulRun ? `--since="${latestSuccessfulRun}"` : undefined,
    '--name-only',
    `--format="${COMMIT_SEP}%H${COMMIT_DATA_SEPARATOR}%s${COMMIT_DATA_SEPARATOR}%aI"`,
    '--no-merges',
  ]
    .filter(isNotEmpty)
    .join(' ');

  log('I', `getCommits :: Attempting to extract commits: ${command}`);

  const result = git.exec(command);

  if (result.length === 0) {
    return [];
  }

  if (!result.includes(COMMIT_SEP)) {
    throw new Error(`Invalid trackFrom commit hash: ${trackFrom}`);
  }

  const commits = result
    .split(COMMIT_SEP)
    .filter(isNotEmpty)
    .map(splitByNewline)
    .map(createCommitFromLog)
    .filter(isCommit)
    .filter(commitFilter);

  log('I', `getCommits :: Total ${commits.length} commits extracted`);

  if (commits.length > 0) {
    log(
      'I',
      `getCommits :: Commit extraction period: ${commits[0].isoDate} ~ ${commits[commits.length - 1].isoDate}`,
    );
  }

  commits.sort((a, b) => (a.isoDate > b.isoDate ? 1 : -1));
  return commits;
};

const createCommitFromLog = ([line, ...fileNames]: string[]):
  | Commit
  | undefined => {
  const parsed = line.split(COMMIT_DATA_SEPARATOR);

  if (parsed.filter(isNotEmpty).length !== 3) {
    return;
  }

  const [hash, title, date] = parsed;
  const isoDate = getISODate(date);

  return {
    title,
    isoDate,
    hash,
    fileNames,
  };
};

const isCommit = (value: unknown): value is Commit =>
  value !== null &&
  typeof value === 'object' &&
  'title' in value &&
  'isoDate' in value &&
  'hash' in value &&
  'fileNames' in value;
