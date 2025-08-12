import type { FileChange } from './types';
import { applyFileChanges } from './utils/applyFileChanges';
import { createCommit } from './utils/createCommit';
import { createPrBody } from './utils/createPrBody';
import { extractFileChanges } from './utils/extractFileChanges';
import { filterPendedTranslationIssues } from './utils/filterPendedTranslationIssues';
import { getTrackedIssues } from './utils/getTrackedIssues';
import { setupBatchPr } from './utils/setupBatchPr';

import { Git } from '@yuki-no/plugin-sdk/infra/git';
import { GitHub } from '@yuki-no/plugin-sdk/infra/github';
import type { YukiNoPlugin } from '@yuki-no/plugin-sdk/types/plugin';
import { getOpenedIssues } from '@yuki-no/plugin-sdk/utils-infra/getOpenedIssues';
import { uniqueWith } from '@yuki-no/plugin-sdk/utils/common';
import { createFileNameFilter } from '@yuki-no/plugin-sdk/utils/createFileNameFilter';
import { getInput, getMultilineInput } from '@yuki-no/plugin-sdk/utils/input';
import { log } from '@yuki-no/plugin-sdk/utils/log';

const BRANCH_NAME = '__yuki-no-batch-pr';

const batchPrPlugin: YukiNoPlugin = {
  name: 'batch-pr',

  async onFinally({ config }) {
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

    const translationIssues = await getOpenedIssues(upstreamGitHub);
    // NOTE: Filter out issues that are pending @yuki-no/plugin-release-tracking status
    const notPendedTranslationIssues = await filterPendedTranslationIssues(
      upstreamGitHub,
      translationIssues,
    );

    if (!notPendedTranslationIssues.length) {
      log(
        'I',
        'batchPr :: No pending translation issues found, skipping batch PR process',
      );
      return;
    }

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
      notPendedTranslationIssues,
    );
    log('I', `batchPr :: ${trackedIssues.length} already processed`);

    const issuesToProcess = uniqueWith(
      await filterPendedTranslationIssues(upstreamGitHub, shouldTrackIssues),
      ({ number }) => number,
    );

    log(
      'I',
      `batchPr :: Processing ${issuesToProcess.length} issues (${trackedIssues.length} tracked + ${shouldTrackIssues.length} new - ${shouldTrackIssues.length - issuesToProcess.length} filtered)`,
    );

    const rootDir = getInput('YUKI_NO_BATCH_PR_ROOT_DIR');
    if (rootDir) {
      log('I', `batchPr :: Using root directory filter: ${rootDir}`);
    }

    const batchPrExcludePatterns = getMultilineInput(
      'YUKI_NO_BATCH_PR_EXCLUDE',
    );
    const extendedConfig = {
      ...config,
      exclude: [...config.exclude, ...batchPrExcludePatterns],
    };
    const fileNameFilter = createFileNameFilter(extendedConfig, rootDir);

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

    const fileChanges: FileChange[] = [];

    log('I', 'batchPr :: Extracting file changes from commits');

    for (const { hash } of issuesToProcess) {
      const changes = extractFileChanges(
        headGit,
        hash,
        fileNameFilter,
        rootDir,
      );
      fileChanges.push(...changes);

      log(
        'I',
        `batchPr :: Extracted ${changes.length} file changes from commit ${hash.substring(0, 8)}`,
      );
    }

    if (!fileChanges.length) {
      log('W', 'batchPr :: No file changes found, skipping batch PR update');
      return;
    }

    log(
      'I',
      `batchPr :: Applying ${fileChanges.length} file changes to upstream repository`,
    );
    await applyFileChanges(upstreamGit, fileChanges);

    log('I', 'batchPr :: Creating commit with applied changes');
    createCommit(upstreamGit, {
      message: 'Apply origin changes',
    });

    log('I', `batchPr :: Pushing changes to branch ${BRANCH_NAME}`);
    upstreamGit.exec(`push -f origin ${BRANCH_NAME}`);

    log(
      'I',
      `batchPr :: Updating PR body with ${issuesToProcess.length} linked issues`,
    );
    const nextPrBody = createPrBody(
      issuesToProcess.map(({ number }) => ({
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
      `batchPr :: Batch PR #${prNumber} updated successfully with ${fileChanges.length} file changes`,
    );
  },
};

export default batchPrPlugin;
