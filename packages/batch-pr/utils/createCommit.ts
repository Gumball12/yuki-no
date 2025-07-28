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
  const escapedMessage = escapeShellArg(message);

  if (needSquash) {
    git.exec(`commit --amend --no-edit ${emptyFlag}`);
  } else {
    git.exec(`commit ${emptyFlag} -m "${escapedMessage}"`);
  }
};

const escapeShellArg = (arg: string): string =>
  arg
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'")
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$')
    .replace(/;/g, '\\;')
    .replace(/&/g, '\\&')
    .replace(/\|/g, '\\|')
    .replace(/</g, '\\<')
    .replace(/>/g, '\\>')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
