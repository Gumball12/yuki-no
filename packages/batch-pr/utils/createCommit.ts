import { Git } from '@yuki-no/plugin-sdk/infra/git';
import { log } from '@yuki-no/plugin-sdk/utils/log';

type CreateCommitOptions = {
  message: string;
  allowEmpty?: boolean;
  needSquash?: boolean;
};

export const createCommit = (
  git: Git,
  { message, allowEmpty = false }: CreateCommitOptions,
): void => {
  log(
    'I',
    `createCommit :: Starting commit process with message: "${message}"`,
  );

  const emptyFlag = allowEmpty ? '--allow-empty' : '';
  const escapedMessage = escapeShellArg(message);

  log('I', 'createCommit :: Adding all changes to staging area');
  git.exec('add .');

  log(
    'I',
    `createCommit :: Creating commit${allowEmpty ? ' (allow empty)' : ''}`,
  );
  git.exec(`commit ${emptyFlag} -m "${escapedMessage}"`);

  log('S', 'createCommit :: Commit created successfully');
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
