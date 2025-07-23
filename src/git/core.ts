import type { Config, RepoSpec } from '../createConfig';
import { createTempDir, log } from '../utils';

import { createRepoUrl } from './utils';

import fs from 'node:fs';
import os from 'node:os';
import shell from 'shelljs';

type GitConfig = Pick<Config, 'accessToken' | 'userName' | 'email'> & {
  repoSpec: RepoSpec;
  withClone?: boolean;
};

type NotStartsWithGit<T extends string> = T extends `git${string}` ? never : T;

export const TEMP_DIR = os.tmpdir();

export class Git {
  constructor(private readonly config: GitConfig) {
    log('I', 'Git[[Construct]] :: Git instance created');

    if (config.withClone) {
      this.clone();
    }
  }

  get repoSpec(): RepoSpec {
    return this.config.repoSpec;
  }

  #dirName?: string;

  get dirName(): string {
    if (this.#dirName) {
      return this.#dirName;
    }

    this.#dirName = createTempDir(
      `cloned-by-yuki-no__${this.config.repoSpec.name}__`,
    );
    return this.#dirName;
  }

  exec<T extends string>(command: NotStartsWithGit<T>): string {
    shell.cd(this.dirName);

    const result = shell.exec(`git ${command}`);
    if (result.code !== 0) {
      throw new GitCommandError(
        command,
        result.code,
        result.stderr,
        result.stdout,
      );
    }

    return result.stdout.trim();
  }

  clone(): void {
    const dirName = this.dirName;
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
      this.config,
    );

    // Execute exec directly only here since repoDir doesn't exist yet
    shell.exec(`git clone ${authorizedRepoUrl} ${dirName}`);

    this.exec(`config user.name "${this.config.userName}"`);
    this.exec(`config user.email "${this.config.email}"`);

    log(
      'S',
      `Git.clone :: Repository clone completed with '${this.config.userName}' and '${this.config.email}'`,
    );
  }

  get repoUrl(): string {
    return createRepoUrl(this.config.repoSpec);
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

export class GitCommandError extends Error {
  constructor(
    public readonly command: string,
    public readonly exitCode: number,
    public readonly stderr: string,
    public readonly stdout: string,
  ) {
    super(
      `Git command failed: git ${command}\nExit code: ${exitCode}\nError: ${stderr}`,
    );
    this.name = 'GitCommandError';
  }
}
