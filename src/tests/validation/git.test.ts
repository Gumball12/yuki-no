import { CommitSchema } from '../../validation/git';

import { describe, expect, it } from 'vitest';

describe('validation/git', () => {
  it('CommitSchema should pass with valid values', () => {
    const input = {
      title: 'feat: add x',
      isoDate: '2023-01-01T00:00:00Z',
      hash: 'abc1234',
      fileNames: ['src/a.ts', 'b.ts'],
    };

    const parsed = CommitSchema.safeParse(input);

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).toEqual(input);
    }
  });

  it('CommitSchema should fail when title is empty', () => {
    const input = {
      title: '',
      isoDate: '2023-01-01T00:00:00Z',
      hash: 'abc1234',
      fileNames: ['a'],
    };

    const parsed = CommitSchema.safeParse(input);

    expect(parsed.success).toBe(false);
  });

  it('CommitSchema should fail when fileNames includes empty string', () => {
    const input = {
      title: 't',
      isoDate: '2023-01-01T00:00:00Z',
      hash: 'abc1234',
      fileNames: [''],
    };

    const parsed = CommitSchema.safeParse(input);

    expect(parsed.success).toBe(false);
  });
});
