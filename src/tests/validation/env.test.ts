import { parseEnv } from '../../validation/env';

import { afterEach, describe, expect, it } from 'vitest';

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('validation/env', () => {
  it('parseEnv should accept minimal required vars', () => {
    const input = {
      ACCESS_TOKEN: 't',
      HEAD_REPO: 'https://github.com/user/repo.git',
      TRACK_FROM: 'hash',
    };

    const env = parseEnv(input);

    expect(env).toEqual(
      expect.objectContaining({
        ACCESS_TOKEN: 't',
        HEAD_REPO: 'https://github.com/user/repo.git',
        TRACK_FROM: 'hash',
      }),
    );
  });

  it('parseEnv should throw with the same message as previous asserts for missing access token', () => {
    const input = {
      HEAD_REPO: 'https://github.com/user/repo.git',
      TRACK_FROM: 'hash',
    } as any;

    expect(() => parseEnv(input)).toThrow('`accessToken` is required.');
  });

  it('parseEnv should throw with the same message for missing head repo', () => {
    const input = {
      ACCESS_TOKEN: 't',
      TRACK_FROM: 'hash',
    } as any;

    expect(() => parseEnv(input)).toThrow('`headRepo` is required.');
  });

  it('parseEnv should throw with the same message for missing trackFrom', () => {
    const input = {
      ACCESS_TOKEN: 't',
      HEAD_REPO: 'https://github.com/user/repo.git',
    } as any;

    expect(() => parseEnv(input)).toThrow('`trackFrom` is required.');
  });
});
