import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  log,
  assert,
  extractBasename,
  extractRepoName,
  extractRepoOwner,
  removeHash,
} from '../src/utils';

describe('utils', () => {
  describe('log', () => {
    let originalGithubActions: string | undefined;

    beforeEach(() => {
      originalGithubActions = process.env.GITHUB_ACTIONS;
    });

    afterEach(() => {
      process.env.GITHUB_ACTIONS = originalGithubActions;
      vi.clearAllMocks();
    });

    it('should log info message in development', () => {
      process.env.GITHUB_ACTIONS = undefined;
      const consoleSpy = vi.spyOn(console, 'info');
      log('I', 'test message');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should log success message in development', () => {
      process.env.GITHUB_ACTIONS = undefined;
      const consoleSpy = vi.spyOn(console, 'info');
      log('S', 'test message');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should log warning message in development', () => {
      process.env.GITHUB_ACTIONS = undefined;
      const consoleSpy = vi.spyOn(console, 'warn');
      log('W', 'test message');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should log error message in development', () => {
      process.env.GITHUB_ACTIONS = undefined;
      const consoleSpy = vi.spyOn(console, 'error');
      log('E', 'test message');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should not log info message in GitHub Actions', () => {
      process.env.GITHUB_ACTIONS = 'true';
      const consoleSpy = vi.spyOn(console, 'info');
      log('I', 'test message');
      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should not log success message in GitHub Actions', () => {
      process.env.GITHUB_ACTIONS = 'true';
      const consoleSpy = vi.spyOn(console, 'info');
      log('S', 'test message');
      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should log warning message in GitHub Actions', () => {
      process.env.GITHUB_ACTIONS = 'true';
      const consoleSpy = vi.spyOn(console, 'warn');
      log('W', 'test message');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should log error message in GitHub Actions', () => {
      process.env.GITHUB_ACTIONS = 'true';
      const consoleSpy = vi.spyOn(console, 'error');
      log('E', 'test message');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('assert', () => {
    it('should not throw error when condition is true', () => {
      expect(() => assert(true, 'test message')).not.toThrow();
    });

    it('should throw error when condition is false', () => {
      expect(() => assert(false, 'test message')).toThrow('test message');
    });
  });

  describe('extractBasename', () => {
    it('extracts the basename from the given url', () => {
      expect(extractBasename('https://github.com/test/repo.git')).toBe(
        'repo.git',
      );
      expect(extractBasename('git@github.com:test/repo.git')).toBe('repo.git');
    });
  });

  describe('extractRepoName', () => {
    it('extracts repo name from the given url', () => {
      expect(extractRepoName('https://github.com/test/repo.git')).toBe('repo');
      expect(extractRepoName('git@github.com:test/repo.git')).toBe('repo');
    });
  });

  describe('extractRepoOwner', () => {
    it('extracts repo owner from the given url', () => {
      expect(extractRepoOwner('https://github.com/test/repo.git')).toBe('test');
      expect(extractRepoOwner('git@github.com:test/repo.git')).toBe('test');
    });
  });

  describe('removeHash', () => {
    it('returns the text with hash removed', () => {
      expect(removeHash('feat: add new feature (#123)')).toBe(
        'feat: add new feature',
      );
      expect(removeHash('fix: resolve issue (#456)')).toBe(
        'fix: resolve issue',
      );
      expect(removeHash('text without hash')).toBe('text without hash');
    });
  });
});
