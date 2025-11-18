import type { GitHub } from '../infra/github';
import { log } from '../utils/log';

import { getTranslationIssues } from './getTranslationIssues';

export type Issue = {
  number: number;
  body: string;
  labels: string[];
  hash: string;
  isoDate: string;
};

export const getOpenedIssues = async (github: GitHub): Promise<Issue[]> => {
  log('I', 'getOpenedIssues :: Starting search for open issues');

  const issues = await getTranslationIssues(github, 'open');

  log(
    'I',
    `getOpenedIssues :: Completed: Found ${issues.length} Yuki-no issues`,
  );

  return issues;
};
