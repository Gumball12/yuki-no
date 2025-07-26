import { log, splitByNewline } from '../utils';

import type { Git } from './core';

import { valid as isValidVersion, parse as parseVersion } from 'semver';

type Tag = {
  version: string;
  url: string;
};

export type ReleaseInfo = {
  prerelease: Tag | undefined;
  release: Tag | undefined;
};

export const getRelease = (git: Git, commitHash: string): ReleaseInfo => {
  log('I', `getRelease :: Retrieving release list for commit ${commitHash}`);
  const result = git.exec(`tag --contains ${commitHash}`);

  if (!result.length) {
    log('I', 'getRelease :: Not released');
    return {
      prerelease: undefined,
      release: undefined,
    };
  }

  const versions = splitByNewline(result);
  const parsedVersions = versions
    .filter(v => isValidVersion(v))
    .map(v => parseVersion(v));

  const firstPrereleaseVersion = parsedVersions.find(
    v => v?.prerelease.length && v.prerelease.length > 0,
  )?.raw;
  const firstReleaseVersion = parsedVersions.find(
    v => v?.prerelease.length === 0,
  )?.raw;

  const releaseInfo = {
    prerelease: createTag(git.repoUrl, firstPrereleaseVersion),
    release: createTag(git.repoUrl, firstReleaseVersion),
  };

  log(
    'I',
    `getRelease :: Released (pre: ${releaseInfo.prerelease?.version ?? ''} / prod: ${releaseInfo.release?.version ?? ''})`,
  );

  return releaseInfo;
};

const createTag = (repoUrl: string, version?: string): Tag | undefined => {
  if (!version) {
    return;
  }

  const tagUrl = `${repoUrl}/releases/tag/${version}`;

  return {
    url: tagUrl,
    version,
  };
};
