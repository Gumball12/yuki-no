import type { GitHub } from '../infra/github';
import type { Issue, IssueMeta } from '../types/github';
import { log } from '../utils/log';

export const createIssue = async (
  github: GitHub,
  meta: IssueMeta,
): Promise<Omit<Issue, 'hash'>> => {
  const { data } = await github.api.issues.create({
    ...github.ownerAndRepo,
    title: meta.title,
    body: meta.body,
    labels: meta.labels,
  });

  const issueNum = data.number;
  const isoDate = data.created_at;

  log('S', `createIssue :: Issue #${issueNum} created (${isoDate})`);

  return {
    body: meta.body,
    isoDate,
    labels: meta.labels,
    number: issueNum,
  };
};
