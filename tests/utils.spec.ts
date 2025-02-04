import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  log,
  assert,
  extractBasename,
  extractRepoName,
  extractRepoOwner,
  removeHash,
  splitByNewline,
} from '../src/utils';

describe('log', () => {
  afterEach(() => {
    delete process.env.VERBOSE;
    vi.clearAllMocks();
  });

  it('should log info message in verbose mode', () => {
    process.env.VERBOSE = 'true';
    const consoleSpy = vi.spyOn(console, 'info');
    log('I', 'test message');
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should log success message in verbose mode', () => {
    process.env.VERBOSE = 'true';
    const consoleSpy = vi.spyOn(console, 'info');
    log('S', 'test message');
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should log warning message in verbose mode', () => {
    process.env.VERBOSE = 'true';
    const consoleSpy = vi.spyOn(console, 'warn');
    log('W', 'test message');
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should log error message in verbose mode', () => {
    process.env.VERBOSE = 'true';
    const consoleSpy = vi.spyOn(console, 'error');
    log('E', 'test message');
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should not log info message in non-verbose mode', () => {
    process.env.VERBOSE = undefined;
    const consoleSpy = vi.spyOn(console, 'info');
    log('I', 'test message');
    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should not log success message in non-verbose mode', () => {
    process.env.VERBOSE = undefined;
    const consoleSpy = vi.spyOn(console, 'info');
    log('S', 'test message');
    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should log warning message in non-verbose mode', () => {
    process.env.VERBOSE = undefined;
    const consoleSpy = vi.spyOn(console, 'warn');
    log('W', 'test message');
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should log error message in non-verbose mode', () => {
    process.env.VERBOSE = undefined;
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
    expect(removeHash('fix: resolve issue (#456)')).toBe('fix: resolve issue');
    expect(removeHash('text without hash')).toBe('text without hash');
  });
});

describe('#splitByNewline', () => {
  it('splits the text by newline', () => {
    const text = 'line1\nline2\nline3\nline5';

    expect(splitByNewline(text)).toEqual(['line1', 'line2', 'line3', 'line5']);
  });

  it('removes empty lines', () => {
    const text = '\nline1\n\nline2\n\n';

    expect(splitByNewline(text)).toEqual(['line1', 'line2']);
  });

  it('returns empty array if text is empty', () => {
    expect(splitByNewline('')).toEqual([]);
  });

  it('returns empty array if text is undefined', () => {
    expect(splitByNewline(undefined)).toEqual([]);
  });
});
