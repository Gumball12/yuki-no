import { hasAnyRelease } from '../utils/hasAnyRelease';

import { beforeEach, expect, it, vi } from 'vitest';

// Mocking Git to avoid direct execution
const mockGit: any = { exec: vi.fn() };

beforeEach(() => {
  vi.clearAllMocks();
});

it('returns true when git tags exist', () => {
  mockGit.exec.mockReturnValue('v1.0.0\nv1.1.0\nv2.0.0');

  const result = hasAnyRelease(mockGit);

  expect(result).toBe(true);
  expect(mockGit.exec).toHaveBeenCalledWith('tag');
});

it('returns false when no git tags exist', () => {
  mockGit.exec.mockReturnValue('');

  const result = hasAnyRelease(mockGit);

  expect(result).toBe(false);
  expect(mockGit.exec).toHaveBeenCalledWith('tag');
});
