import { Git } from '@yuki-no/plugin-sdk/infra/git';

type CreateCommitOptions = {
  message: string;
  allowEmpty?: boolean;
  needSquash?: boolean;
};

export const createCommit = (
  git: Git,
  { message, allowEmpty = false, needSquash = false }: CreateCommitOptions,
): void => {
  git.exec('add .');

  const emptyFlag = allowEmpty ? '--allow-empty' : '';

  if (needSquash) {
    git.exec(`commit --amend --no-edit ${emptyFlag}`);
  } else {
    git.exec(`commit ${emptyFlag} -m "${message}"`);
  }
};
