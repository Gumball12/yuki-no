const COMMIT_URL_REGEX =
  /https:\/\/github\.com\/[^\/]+\/[^\/]+\/commit\/([a-f0-9]{7,40})/;

export const extractHashFromIssue = (issue: {
  body?: string;
}): string | undefined => {
  const match = issue.body?.match(COMMIT_URL_REGEX);
  return match?.[1];
};

export const getISODate = (atOrDate: string | Date) =>
  new Date(atOrDate).toISOString().replace(/\.\d{3}Z$/, 'Z');
