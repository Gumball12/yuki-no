import type { Config, RepoSpec } from '../createConfig';
import { log } from '../utils';

import { createRepoUrl } from './utils';

import fs from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import shell from 'shelljs';

type GitConfig = Pick<Config, 'accessToken' | 'userName'> & {
  repoSpec: RepoSpec;
};

type NotStartsWithGit<T extends string> = T extends `git${string}` ? never : T;

export const TEMP_DIR = tmpdir();

export class Git {
  #config: GitConfig;

  constructor(config: GitConfig) {
    log('I', 'Git[[Construct]] :: Git instance created');
    this.#config = config;
  }

  exec<T extends string>(command: NotStartsWithGit<T>): string {
    const repoDir = path.resolve(TEMP_DIR, this.#config.repoSpec.name);
    shell.cd(repoDir);
    return shell.exec(`git ${command}`).stdout.trim();
  }

  clone(): void {
    const dirName = this.#config.repoSpec.name;
    log('I', `Git.clone :: Cloning repository: ${TEMP_DIR}/${dirName}`);

    shell.cd(TEMP_DIR);

    if (fs.existsSync(dirName)) {
      log(
        'W',
        `Git.clone :: Removing existing directory '${dirName}' before proceeding`,
      );
      fs.rmSync(dirName, { force: true, recursive: true });
      log(
        'S',
        `Git.clone :: Existing directory '${dirName}' successfully removed`,
      );
    }

    const authorizedRepoUrl = createAuthorizedRepoUrl(
      this.repoUrl,
      this.#config,
    );

    // Execute exec directly only here since repoDir doesn't exist yet
    const result = shell.exec(`git clone ${authorizedRepoUrl} ${dirName}`);

    if (result.code === 0) {
      log('S', 'Git.clone :: Repository clone completed');
    } else {
      throw new Error(`Failed to clone repository: ${result.stderr}`);
    }
  }

  get repoUrl(): string {
    return createRepoUrl(this.#config.repoSpec);
  }
}

const createAuthorizedRepoUrl = (
  repoUrl: string,
  config: Pick<Config, 'userName' | 'accessToken'>,
): string =>
  repoUrl.replace(
    'https://',
    `https://${config.userName}:${config.accessToken}@`,
  );
