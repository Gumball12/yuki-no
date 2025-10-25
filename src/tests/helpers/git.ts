import { COMMIT_DATA_SEPARATOR, COMMIT_SEP } from '../../git/getCommits';

type CommitLogEntry = {
  hash: string;
  title: string;
  date: string;
  files: string[];
};

/**
 * Builds a synthetic `git log` output string using the parser's separators
 * (COMMIT_SEP, COMMIT_DATA_SEPARATOR) so that getCommits() can be tested
 * without shelling out to git. This is NOT related to runtime logging.
 */
export const makeLog = (input: CommitLogEntry | CommitLogEntry[]): string => {
  const entries = Array.isArray(input) ? input : [input];

  return entries
    .map(e =>
      [
        `${COMMIT_SEP}${e.hash}${COMMIT_DATA_SEPARATOR}${e.title}${COMMIT_DATA_SEPARATOR}${e.date}`,
        ...e.files,
      ].join('\n'),
    )
    .join('\n');
};
