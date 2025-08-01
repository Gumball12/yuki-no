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
import { getInput, getMultilineInput } from '@yuki-no/plugin-sdk/utils/input';
import { log } from '@yuki-no/plugin-sdk/utils/log';
import picomatch from 'picomatch';

const BRANCH_NAME = '__yuki-no-batch-pr';

const batchPrPlugin: YukiNoPlugin = {
  name: 'batch-pr',

  async onFinally({ createdIssues, config }) {
    log('I', '=== Batch PR plugin started ===');

    const upstreamGitHub = new GitHub({
      ...config,
      repoSpec: config.upstreamRepoSpec,
    });
    const upstreamGit = new Git({
      ...config,
      repoSpec: config.upstreamRepoSpec,
      withClone: true,
    });

    log('I', 'batchPr :: Setting up batch PR branch and pull request');
    const { prNumber } = await setupBatchPr(
      upstreamGitHub,
      upstreamGit,
      BRANCH_NAME,
    );

    log('I', `batchPr :: Getting tracked issues for PR #${prNumber}`);
    const { trackedIssues, shouldTrackIssues } = await getTrackedIssues(
      upstreamGitHub,
      prNumber,
    );

    const issuesToProcess = uniqueWith(
      [...shouldTrackIssues, ...(createdIssues ?? [])],
      ({ number }) => number,
    );

    log(
      'I',
      `batchPr :: Processing ${issuesToProcess.length} issues (${trackedIssues.length} tracked + ${shouldTrackIssues.length} new)`,
    );

    const fileLineChanges: FileLineChanges[] = [];
    const batchPrExcludePatterns = getMultilineInput(
      'YUKI_NO_BATCH_PR_EXCLUDE',
    );
    const extendedConfig = {
      ...config,
      exclude: [...config.exclude, ...batchPrExcludePatterns],
    };
    const fileNameFilter = createFileNameFilter(extendedConfig);
    const rootDir = getInput('YUKI_NO_BATCH_PR_ROOT_DIR');

    if (rootDir) {
      log('I', `batchPr :: Using root directory filter: ${rootDir}`);
    }

    if (batchPrExcludePatterns.length > 0) {
      log(
        'I',
        `batchPr :: Using batch PR exclude patterns: ${batchPrExcludePatterns.join(', ')}`,
      );
    }

    const headGit = new Git({
      ...config,
      repoSpec: config.headRepoSpec,
      withClone: true,
    });

    log('I', 'batchPr :: Extracting file line changes from commits');
    for (const { hash } of issuesToProcess) {
      const changes = extractFileLineChanges({
        headGit,
        hash,
        fileNameFilter,
        rootDir,
      });
      fileLineChanges.push(...changes);
      log(
        'I',
        `batchPr :: Extracted ${changes.length} file changes from commit ${hash.substring(0, 8)}`,
      );
    }

    if (!fileLineChanges.length) {
      log('W', 'batchPr :: No file changes found, skipping batch PR update');
      return;
    }

    log(
      'I',
      `batchPr :: Applying ${fileLineChanges.length} file line changes to upstream repository`,
    );
    await applyFileLineChanges({ fileLineChanges, targetGit: upstreamGit });

    log('I', 'batchPr :: Creating commit with applied changes');
    createCommit(upstreamGit, {
      message: 'Apply origin changes',
    });

    log('I', `batchPr :: Pushing changes to branch ${BRANCH_NAME}`);
    upstreamGit.exec(`push -f origin ${BRANCH_NAME}`);

    const allIssues = [...trackedIssues, ...issuesToProcess];
    log(
      'I',
      `batchPr :: Updating PR body with ${allIssues.length} linked issues`,
    );
    const nextPrBody = createPrBody(
      allIssues.map(({ number }) => ({
        number,
        type: 'Resolved',
      })),
    );

    await upstreamGitHub.api.pulls.update({
      ...upstreamGitHub.ownerAndRepo,
      pull_number: prNumber,
      body: nextPrBody,
    });

    log(
      'S',
      `batchPr :: Batch PR #${prNumber} updated successfully with ${fileLineChanges.length} file changes`,
    );
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
