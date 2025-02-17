import shell from 'shelljs';
import { type Remote } from './config';
import { Git } from './git';
import type { ReleaseInfo, ReleaseTag } from './types';
import { getUrlWithoutDotGit } from './utils';

shell.config.silent = true;

export interface Options {
  path?: string;
  token: string;
  userName: string;
  email: string;
  head: Remote;
}

export class Repository {
  path: string;
  token: string;
  userName: string;
  email: string;
  head: Remote;
  git: Git;

  constructor(options: Options) {
    if (!options.path) {
      throw new Error('Repository path is required');
    }

    this.path = options.path;
    this.token = options.token;
    this.userName = options.userName;
    this.email = options.email;
    this.head = options.head;

    this.git = new Git();
  }

  setup() {
    shell.cd(this.path);
    this.git.clone(
      this.userName,
      this.token,
      this.head.url,
      this.head.name,
      'tmp',
    );
    shell.cd(`tmp/${this.head.name}`);
    this.git.addRemote(this.head.url, this.head.name);
    this.git.config('user.name', `"${this.userName}"`);
    this.git.config('user.email', `"${this.email}"`);
  }

  getReleaseInfo(commitHash: string): ReleaseInfo {
    if (!this.git) {
      throw new Error('Git is not initialized');
    }

    this.git.fetch(this.head.name, '--tags');

    const result = this.git.exec('tag --contains ' + commitHash);
    if (!result || !result.stdout) {
      return {};
    }

    const tags = result.stdout
      .toString()
      .split('\n')
      .filter(Boolean)
      .map((tag: string) => this.#getTagInfo(tag));

    return {
      preRelease: tags.find((tag: ReleaseTag) => tag.tag.includes('-')),
      release: tags.find((tag: ReleaseTag) => !tag.tag.includes('-')),
    };
  }

  #getTagInfo(tag: string): ReleaseTag {
    const repoUrl = getUrlWithoutDotGit(this.head.url);
    return {
      tag: tag.trim(),
      url: `${repoUrl}/releases/tag/${tag.trim()}`,
    };
  }
}
