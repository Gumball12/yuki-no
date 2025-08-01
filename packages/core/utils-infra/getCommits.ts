import type { Git } from '../infra/git';
import type { Config } from '../types/config';
import type { Commit } from '../types/git';
import { isNotEmpty } from '../utils/common';
import { splitByNewline } from '../utils/input';
import { log } from '../utils/log';

import picomatch from 'picomatch';

export const COMMIT_SEP = ':COMMIT_START_SEP:';
export const COMMIT_DATA_SEPARATOR = ':COMMIT_DATA_SEP:';

export const getCommits = (
  config: Pick<Config, 'trackFrom' | 'headRepoSpec' | 'include' | 'exclude'>,
  git: Git,
  latestSuccessfulRun?: string,
): Commit[] => {
  const command = [
    'log',
    'origin/main',
    config.trackFrom ? `${config.trackFrom}..` : undefined,
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
    throw new Error(`Invalid trackFrom commit hash: ${config.trackFrom}`);
  }

  const commits = result
    .split(COMMIT_SEP)
    .filter(isNotEmpty)
    .map(splitByNewline)
    .map(createCommitFromLog)
    .filter(useIsIncludedCommit(config));

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

const useIsIncludedCommit = (config: Pick<Config, 'include' | 'exclude'>) => {
  const isIncluded = picomatch(config.include.length ? config.include : ['**']);
  const isExcluded = picomatch(config.exclude);

  return (commit?: Commit): commit is Commit => {
    if (!commit) {
      return false;
    }

    if (config.include.length === 0 && config.exclude.length === 0) {
      return true;
    }

    return commit.fileNames.some(
      fileName => !isExcluded(fileName) && isIncluded(fileName),
    );
  };
};

const getISODate = (atOrDate: string | Date) =>
  new Date(atOrDate).toISOString().replace(/\.\d{3}Z$/, 'Z');
