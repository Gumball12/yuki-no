import type { GitHub } from '@yuki-no/plugin-sdk/infra/github';
import type { Issue } from '@yuki-no/plugin-sdk/types/github';
import { formatError, log } from '@yuki-no/plugin-sdk/utils/log';

export const filterPendedTranslationIssues = async (
  github: GitHub,
  translationIssue: Issue[],
): Promise<Issue[]> => {
  const pendedTranslationLabels = await getYukiNoReleaseTrackingLabels(github);
  log(
    'I',
    `filterPendedTranslationIssues :: Getting release tracking labels [${pendedTranslationLabels.join(', ')}]`,
  );

  return translationIssue.filter(({ labels }) =>
    labels.every(l => !pendedTranslationLabels.includes(l)),
  );
};

const getYukiNoReleaseTrackingLabels = async (
  github: GitHub,
): Promise<string[]> => {
  try {
    const { getReleaseTrackingLabels } = await import(
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      '@yuki-no/plugin-release-tracking/getReleaseTrackingLabels'
    );

    log(
      'I',
      'getYukiNoReleaseTrackingLabels :: use @yuki-no/plugin-release-tracking',
    );

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return getReleaseTrackingLabels(github);
  } catch (error) {
    log(
      'I',
      `getYukiNoReleaseTrackingLabels :: cannot find @yuki-no/plugin-release-tracking / ${formatError(error)}`,
    );
  }

  return [];
};
