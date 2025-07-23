import type { Git } from '../../git/core';

type CreateCommitOptions = {
  message: string;
  allowEmpty?: boolean;
  needSquash?: boolean;
};

export const createCommit = (
  git: Git,
  { message, allowEmpty = false, needSquash = false }: CreateCommitOptions,
): void => {
  if (!allowEmpty) {
    git.exec('add .');
  }

  const emptyFlag = allowEmpty ? '--allow-empty ' : '';

  if (needSquash) {
    git.exec(`commit --amend --no-edit ${emptyFlag}`);
  } else {
    git.exec(`commit ${emptyFlag}-m "${message}"`);
  }
};
