import {
  COMMIT_DATA_SEPARATOR,
  COMMIT_SEP,
  getCommits,
} from '../../git/getCommits';

import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mocking Git to avoid direct execution during tests
const mockGit: any = { exec: vi.fn() };

const MOCK_CONFIG = {
  trackFrom: 'start-commit-hash',
  headRepoSpec: {
    owner: 'test-owner',
    name: 'test-repo',
    branch: 'main',
  },
  include: [],
  exclude: [],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getCommits - git log command creation', () => {
  it('Should execute the correct git log command', () => {
    mockGit.exec.mockReturnValue(
      [
        `${COMMIT_SEP}hash1${COMMIT_DATA_SEPARATOR}title1${COMMIT_DATA_SEPARATOR}2023-01-01T10:00:00Z`,
        'file1.ts',
        'file2.ts',
      ].join('\n'),
    );

    getCommits(MOCK_CONFIG, mockGit);

    expect(mockGit.exec).toHaveBeenCalledWith(
      [
        'log origin/main',
        'start-commit-hash..',
        '--name-only',
        '--format=":COMMIT_START_SEP:%H:COMMIT_DATA_SEP:%s:COMMIT_DATA_SEP:%aI"',
        '--no-merges',
      ].join(' '),
    );
  });

  it('Should omit the trackFrom argument when not provided', () => {
    mockGit.exec.mockReturnValue(
      [
        `${COMMIT_SEP}hash1${COMMIT_DATA_SEPARATOR}title1${COMMIT_DATA_SEPARATOR}2023-01-01T10:00:00Z`,
        'file1.ts',
        'file2.ts',
      ].join('\n'),
    );

    getCommits({ ...MOCK_CONFIG, trackFrom: '' }, mockGit);

    expect(mockGit.exec).toHaveBeenCalledWith(
      expect.stringMatching(/^log origin\/main +--name-only/),
    );
    expect(mockGit.exec).toHaveBeenCalledWith(
      expect.not.stringMatching(/\.\.$/),
    );
  });

  it('Should filter commits after the given date when latestSuccessfulRun is provided', () => {
    mockGit.exec.mockReturnValue(
      [
        `${COMMIT_SEP}hash1${COMMIT_DATA_SEPARATOR}title1${COMMIT_DATA_SEPARATOR}2023-01-01T10:00:00Z`,
        'file1.ts',
        'file2.ts',
      ].join('\n'),
    );

    const latestRun = '2023-01-01';

    getCommits(MOCK_CONFIG, mockGit, latestRun);

    expect(mockGit.exec).toHaveBeenCalledWith(
      expect.stringMatching(`--since="${latestRun}"`),
    );
  });
});

describe('getCommits - result verification', () => {
  it('return an empty array when result is empty', () => {
    mockGit.exec.mockReturnValue('     ');

    const result = getCommits(MOCK_CONFIG, mockGit);

    expect(result).toEqual([]);
  });

  it('git log result should not contain COMMIT_SEP to throw an error', () => {
    mockGit.exec.mockReturnValue('invalid result');

    expect(() => getCommits(MOCK_CONFIG, mockGit)).toThrow(
      `Invalid trackFrom commit hash: ${MOCK_CONFIG.trackFrom}`,
    );
  });

  it('git log result should be parsed correctly', () => {
    const commitData = [
      `${COMMIT_SEP}hash1${COMMIT_DATA_SEPARATOR}title1${COMMIT_DATA_SEPARATOR}2023-01-01T10:00:00Z`,
      'file1.ts',
      'file2.ts',
      `${COMMIT_SEP}hash2${COMMIT_DATA_SEPARATOR}title2${COMMIT_DATA_SEPARATOR}2023-01-02T10:00:00Z`,
      'file3.ts',
    ].join('\n');

    mockGit.exec.mockReturnValue(commitData);

    const result = getCommits(MOCK_CONFIG, mockGit);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      hash: 'hash1',
      title: 'title1',
      isoDate: expect.any(String),
      fileNames: ['file1.ts', 'file2.ts'],
    });
    expect(result[1]).toEqual({
      hash: 'hash2',
      title: 'title2',
      isoDate: expect.any(String),
      fileNames: ['file3.ts'],
    });
  });
});

describe('getCommits - commit filtering', () => {
  it('Should filter commits if any of hash, title, or date is missing', () => {
    const commitData = [
      `${COMMIT_SEP}${COMMIT_DATA_SEPARATOR}title1${COMMIT_DATA_SEPARATOR}2023-01-01T10:00:00Z`,
      'src/file1.ts',
      `${COMMIT_SEP}hash1${COMMIT_DATA_SEPARATOR}${COMMIT_DATA_SEPARATOR}2023-01-01T10:00:00Z`,
      'src/file1.ts',
      `${COMMIT_SEP}hash1${COMMIT_DATA_SEPARATOR}title1${COMMIT_DATA_SEPARATOR}`,
      'file1.ts',
    ].join('\n');

    mockGit.exec.mockReturnValue(commitData);

    const result = getCommits(MOCK_CONFIG, mockGit);

    expect(result).toHaveLength(0);
  });

  it('Should filter commits based on include pattern', () => {
    const commitData = [
      `${COMMIT_SEP}hash1${COMMIT_DATA_SEPARATOR}title1${COMMIT_DATA_SEPARATOR}2023-01-01T10:00:00Z`,
      'src/file1.ts',
      `${COMMIT_SEP}hash2${COMMIT_DATA_SEPARATOR}title2${COMMIT_DATA_SEPARATOR}2023-01-02T10:00:00Z`,
      'test/file2.ts',
    ].join('\n');

    mockGit.exec.mockReturnValue(commitData);

    const result = getCommits({ ...MOCK_CONFIG, include: ['src/**'] }, mockGit);

    expect(result).toHaveLength(1);
    expect(result[0].hash).toBe('hash1');
  });

  it('Should filter commits based on exclude pattern', () => {
    const commitData = [
      `${COMMIT_SEP}hash1${COMMIT_DATA_SEPARATOR}title1${COMMIT_DATA_SEPARATOR}2023-01-01T10:00:00Z`,
      'src/file1.ts',
      `${COMMIT_SEP}hash2${COMMIT_DATA_SEPARATOR}title2${COMMIT_DATA_SEPARATOR}2023-01-02T10:00:00Z`,
      'test/file2.ts',
    ].join('\n');

    mockGit.exec.mockReturnValue(commitData);

    const result = getCommits(
      { ...MOCK_CONFIG, exclude: ['test/**'] },
      mockGit,
    );

    expect(result).toHaveLength(1);
    expect(result[0].hash).toBe('hash1');
  });
});

describe('getCommits - commit sorting', () => {
  it('Should sort commits by date', () => {
    const commitData = [
      `${COMMIT_SEP}hash2${COMMIT_DATA_SEPARATOR}title2${COMMIT_DATA_SEPARATOR}2023-01-02T10:00:00Z`,
      'file1.ts',
      `${COMMIT_SEP}hash1${COMMIT_DATA_SEPARATOR}title1${COMMIT_DATA_SEPARATOR}2023-01-01T10:00:00Z`,
      'file2.ts',
    ].join('\n');

    mockGit.exec.mockReturnValue(commitData);

    const result = getCommits(MOCK_CONFIG, mockGit);

    expect(result[0].hash).toBe('hash1');
    expect(result[1].hash).toBe('hash2');
  });
});
