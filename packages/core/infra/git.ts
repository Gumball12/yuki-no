import type { Config, RepoSpec } from '../types/config';
import { log } from '../utils/log';

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import shell from 'shelljs';

type GitConfig = Pick<Config, 'accessToken' | 'userName' | 'email'> & {
  repoSpec: RepoSpec;
  withClone?: boolean;
};

type NotStartsWithGit<T extends string> = T extends `git${string}` ? never : T;

export class Git {
  constructor(private readonly config: GitConfig) {
    log('I', 'Git[[Construct]] :: Git instance created');

    if (config.withClone) {
      this.clone();
    }
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
    const parentDirName = path.resolve(this.dirName, '../');
    const baseName = path.basename(this.dirName);
    log('I', `Git.clone :: Cloning repository: ${parentDirName}/${baseName}`);

    shell.cd(parentDirName);

    if (fs.existsSync(baseName)) {
      fs.rmSync(baseName, { force: true, recursive: true });
    }

    const authorizedRepoUrl = createAuthorizedRepoUrl(
      this.repoUrl,
      this.config,
    );

    // Execute exec directly only here since repoDir doesn't exist yet
    shell.exec(`git clone ${authorizedRepoUrl} ${baseName}`);

    this.exec(`config user.name "${this.config.userName}"`);
    this.exec(`config user.email "${this.config.email}"`);

    log(
      'S',
      `Git.clone :: Repository clone completed with '${this.config.userName}' and '${this.config.email}' / ${baseName}`,
    );
  }

  get repoUrl(): string {
    return `https://github.com/${this.config.repoSpec.owner}/${this.config.repoSpec.name}`;
  }
}

const createTempDir = (prefix: string): string =>
  fs.mkdtempSync(path.join(os.tmpdir(), prefix));

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
    readonly command: string,
    readonly exitCode: number,
    readonly stderr: string,
    readonly stdout: string,
  ) {
    super(
      `Git command failed: git ${command}\nExit code: ${exitCode}\nError: ${stderr}`,
    );
    this.name = 'GitCommandError';
  }
}
