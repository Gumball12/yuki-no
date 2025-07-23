import { Git } from '../../../git/core';
import { createCommit } from '../../../plugins/ai-translation/createCommit';

import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('createCommit', () => {
  let mockGit: Git;
  let execMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    execMock = vi.fn();
    mockGit = {
      exec: execMock,
    } as unknown as Git;
  });

  it('should create a new commit with message', () => {
    createCommit(mockGit, { message: '번역 전 변경사항 적용' });

    expect(execMock).toHaveBeenNthCalledWith(1, 'add .');
    expect(execMock).toHaveBeenNthCalledWith(
      2,
      'commit -m "번역 전 변경사항 적용"',
    );
  });

  it('should create an empty commit when allowEmpty is true', () => {
    createCommit(mockGit, {
      message: 'Initial translation batch commit',
      allowEmpty: true,
    });

    expect(execMock).toHaveBeenCalledTimes(1);
    expect(execMock).toHaveBeenCalledWith(
      'commit --allow-empty -m "Initial translation batch commit"',
    );
  });

  it('should amend commit when needSquash is true', () => {
    createCommit(mockGit, {
      message: '번역 전 변경사항 적용',
      needSquash: true,
    });

    expect(execMock).toHaveBeenNthCalledWith(1, 'add .');
    expect(execMock).toHaveBeenNthCalledWith(2, 'commit --amend --no-edit ');
  });

  it('should amend empty commit when both needSquash and allowEmpty are true', () => {
    createCommit(mockGit, {
      message: '번역 전 변경사항 적용',
      needSquash: true,
      allowEmpty: true,
    });

    expect(execMock).toHaveBeenCalledTimes(1);
    expect(execMock).toHaveBeenCalledWith(
      'commit --amend --no-edit --allow-empty ',
    );
  });
});
