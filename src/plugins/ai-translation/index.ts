import { Git } from '../../git/core';
import { GitHub } from '../../github/core';
import { log, useIsTrackingFile } from '../../utils';
import type { YukiNoPlugin } from '../core';

import { applyFileLineChanges } from './applyFilePatches';
import { createCommit } from './createCommit';
import { createPrBody } from './createPrBody';
import {
  BRANCH_NAME,
  ensureTranslationPr,
  pushBranch,
  updatePullRequest,
} from './ensureTranslationPr';
import {
  extractFileLineChanges,
  type FileLineChanges,
} from './extractFilePatches';
import { getNotTrackedIssues } from './getNotTrackedIssues';
import { getTranslationOptions } from './getTranslationOptions';

let notTrackedIssueNumbers: number[] = [];
let needSquashCommit = false;

let headGit: Git;
let upstreamGit: Git;
let upstreamGitHub: GitHub;
let prNumber: number;

/**
 * - [x] P1: translation 없이 pr 생성
 * - [x] P2: translation과 함께 pr 생성
 * - [ ] P3: 생성된 pr에 translation 적용
 */
const aiTranslationPlugin: YukiNoPlugin = {
  name: 'core:ai-translation',

  /**
   * onInit
   * - validate opts & ensure pr & check It & calc Dm
   */
  async onInit(ctx) {
    /**
     * validate options
     * - required: model, token, lang 확인
     * - vendor 있는지 확인 (modelId는 사실상 확인 어려울 듯)
     * - parser와 validator를 따로 구현해야 할 듯, parser는 validate 없이 진행
     */
    // validate options
    getTranslationOptions();

    /**
     * create Bt (onInit 목적 달성 위해 `check opened It` 앞에 있어야 함)
     * - opened Pt 확인
     * - 없으면
     *   - clone Upstream
     *   - default branch 기준으로 forced create Bt
     *   - create C0 & forced push Bt & create pr
     * - 있으면 (재사용해야함)
     *   - get Bt name
     *   - checkout Bt
     */
    upstreamGitHub = new GitHub({
      ...ctx.config,
      repoSpec: ctx.config.upstreamRepoSpec,
    });
    upstreamGit = new Git({
      ...ctx.config,
      repoSpec: ctx.config.upstreamRepoSpec,
      withClone: true,
    });

    prNumber = (await ensureTranslationPr(upstreamGitHub, upstreamGit))
      .prNumber;

    /**
     * normalize Pt
     * - 만약 trackedIssue인데 실제 I는 closed 되어있다면 -> Ip & Ir 제거해줘야 함
     */
    // TODO

    /**
     * check opened It
     * - `getOpenedIssues` 이용해 It 가져옴
     * - opened pr 가져옴
     *   - Ip, Ir 제외하고 나머지 It만 반환
     *   - Ip 존재 여부는 함께 반환해줘야 함 (아래 Dm 만들 때 사용)
     * - It 없으면 여기서 onInit 종료
     *   - store Inum, Ip는 마지막에 수행
     */
    const { notTrackedIssues, hasPendingIssues } = await getNotTrackedIssues(
      upstreamGitHub,
      prNumber,
    );

    needSquashCommit = hasPendingIssues;
    notTrackedIssueNumbers = notTrackedIssues.map(({ number }) => number);

    const hasNotTrackedIssues = notTrackedIssues.length > 0;
    if (!hasNotTrackedIssues) {
      return;
    }

    /**
     * calc Dm
     * - Diff = { filePath: string, changes: { line: number, contents: string }[] }
     * - head repo cloning 한 뒤
     * - 각 Issue[] 마다
     *   - Issue.hash 이용해 head commit 가져오고
     *   - 변경 파일을 include/exclude로 필터링한 뒤
     *   - 파일 변경 적용
     * - 실제 C 생성은 onExit에서 나머지 C들 모두 Dm 처리 후 실행 예정
     */
    headGit = new Git({
      ...ctx.config,
      repoSpec: ctx.config.headRepoSpec,
      withClone: true,
    });

    const isTrackingFile = useIsTrackingFile(ctx.config);
    const fileLineChanges: FileLineChanges[] = [];

    for (const { hash } of notTrackedIssues) {
      fileLineChanges.push(
        ...extractFileLineChanges(headGit, hash, isTrackingFile),
      );
    }

    await applyFileLineChanges({ fileLineChanges, targetGit: upstreamGit });

    if (fileLineChanges.length > 0) {
      createCommit(upstreamGit, {
        message: 'Apply changes before translation',
        needSquash: needSquashCommit,
      });
      log(
        'S',
        `Successfully processed ${fileLineChanges.length} file line changes from ${notTrackedIssues.length} issues`,
      );
    }
  },

  /**
   * onExit
   * - collect changes (Dm) & translate (Dt) & update PR
   */
  async onExit(ctx) {
    /**
     * validate stored values?
     * - 저장된 값을 확인해 onInit 성공했는지 확인
     * - 사실 이걸 할 필요는 없음
     *   - 왜? onInit 실패했다면 error thrown 되었을거고 그럼 모든 로직이 동작 안하기 떄문
     *   - onInit 성공했다면 onExit도 진행하는게 맞고
     */
    // noop

    /**
     * get stored & ctx
     * - stored Inum + ctx Inum -> Inum
     * - calcDo&mergeCommit(ctx C0) => 최종 Dm 생성
     * - 모두 진행 후 Ip가 있으면 squash, 없으면 새로운 C 생성
     *   - Ip가 있으면 이전이 Cp니 squash로 Cp 유지
     *   - 없으면 이전이 Ct || C0, 따라서 새로운 Cp 생성
     *   - [*] ->#1 (C0 || Ct) -> Cp -> (#1 || [*]) 유지하기 위함
     */
    const isTrackingFile = useIsTrackingFile(ctx.config);
    const fileLineChanges: FileLineChanges[] = [];

    for (const { hash } of ctx.createdIssues) {
      fileLineChanges.push(
        ...extractFileLineChanges(headGit, hash, isTrackingFile),
      );
    }

    await applyFileLineChanges({ fileLineChanges, targetGit: upstreamGit });

    if (fileLineChanges.length > 0) {
      createCommit(upstreamGit, {
        message: 'Apply changes before translation',
        needSquash: needSquashCommit,
      });
    }

    /**
     * push Dm & update Ip
     * - push Dm
     * - Inum들 `Pending #i` 로 만들어 pr body 아래에 추가
     * - 작업 시 하나라도 실패하면 모두 Ip 유지됨
     *   - D에는 I에 대한 정보를 넣을 수 없기 때문
     */
    pushBranch({ git: upstreamGit, branchName: BRANCH_NAME });

    const createdIssueNumbers = ctx.createdIssues.map(({ number }) => number);
    const issueNumbersToAdd = [
      ...notTrackedIssueNumbers,
      ...createdIssueNumbers,
    ];

    if (issueNumbersToAdd.length > 0) {
      const newBody = createPrBody(
        issueNumbersToAdd.map(number => ({ number, type: 'Pending' })),
      );

      await updatePullRequest(upstreamGitHub, prNumber, {
        body: newBody,
      });
    }

    /**
     * get options
     * - validation은 onInit에서 수행
     * - model, apiKey, lang, maxToken, systemPrompt? 전달받음
     */
    // const { modelString, apiKey, targetLang, maxToken, systemPrompt } =
    //   getTranslationOptions();

    /**
     * translate Dm -> Dt
     */

    // translation

    /**
     * commit Dt & update Ir
     * - push Dt
     * - pr body에 존재하는 모든 Inum들 `Resolved #i`로 변경
     */

    // create Dt

    // Create Ct

    // push Dt

    // update Pr body
  },
};

export default aiTranslationPlugin;
