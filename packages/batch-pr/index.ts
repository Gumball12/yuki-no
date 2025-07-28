import { applyFileLineChanges } from './utils/applyFileLineChanges';
import { createCommit } from './utils/createCommit';
import { createPrBody } from './utils/createPrBody';
import {
  extractFileLineChanges,
  type FileLineChanges,
  type FileNameFilter,
} from './utils/extractFileLineChanges';
import { getTrackedIssues } from './utils/getTrackedIssues';
import { setupBatchPr } from './utils/setupBatchPr';

import { Git } from '@yuki-no/plugin-sdk/infra/git';
import { GitHub } from '@yuki-no/plugin-sdk/infra/github';
import type { Config } from '@yuki-no/plugin-sdk/types/config';
import type { YukiNoPlugin } from '@yuki-no/plugin-sdk/types/plugin';
import { uniqueWith } from '@yuki-no/plugin-sdk/utils/common';
import picomatch from 'picomatch';

const BRANCH_NAME = '__yuki-no-batch-pr';

const batchPrPlugin: YukiNoPlugin = {
  name: 'batch-pr',

  async onFinally({ createdIssues, config }) {
    const upstreamGitHub = new GitHub({
      ...config,
      repoSpec: config.upstreamRepoSpec,
    });
    const upstreamGit = new Git({
      ...config,
      repoSpec: config.upstreamRepoSpec,
      withClone: true,
    });

    const { prNumber } = await setupBatchPr(
      upstreamGitHub,
      upstreamGit,
      BRANCH_NAME,
    );

    const { trackedIssues, shouldTrackIssues } = await getTrackedIssues(
      upstreamGitHub,
      prNumber,
    );

    const issuesToProcess = uniqueWith(
      [...shouldTrackIssues, ...createdIssues],
      ({ number }) => number,
    );
    const fileLineChanges: FileLineChanges[] = [];
    const fileNameFilter = createFileNameFilter(config);

    const headGit = new Git({
      ...config,
      repoSpec: config.headRepoSpec,
      withClone: true,
    });

    for (const { hash } of issuesToProcess) {
      fileLineChanges.push(
        ...extractFileLineChanges(headGit, hash, fileNameFilter),
      );
    }

    if (!fileLineChanges.length) {
      return;
    }

    await applyFileLineChanges({ fileLineChanges, targetGit: upstreamGit });
    createCommit(upstreamGit, {
      message: 'Apply origin changes',
    });

    upstreamGit.exec(`push -f origin ${BRANCH_NAME}`);

    const nextPrBody = createPrBody(
      [...trackedIssues, ...issuesToProcess].map(({ number }) => ({
        number,
        type: 'Resolved',
      })),
    );

    await upstreamGitHub.api.pulls.update({
      ...upstreamGitHub.ownerAndRepo,
      pull_number: prNumber,
      body: nextPrBody,
    });
  },
};

export default batchPrPlugin;

const createFileNameFilter = (
  config: Pick<Config, 'include' | 'exclude'>,
): FileNameFilter => {
  const isIncluded = picomatch(config.include.length ? config.include : ['**']);
  const isExcluded = picomatch(config.exclude);

  return (fileName: string): boolean => {
    if (!fileName.length) {
      return false;
    }

    if (config.include.length === 0 && config.exclude.length === 0) {
      return true;
    }

    return !isExcluded(fileName) && isIncluded(fileName);
  };
};
