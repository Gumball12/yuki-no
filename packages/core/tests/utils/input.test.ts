import {
  getBooleanInput,
  getInput,
  getMultilineInput,
  splitByNewline,
} from '../../utils/input';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

describe('plugin input helpers', () => {
  beforeEach(() => {
    process.env.YUKI_NO_TEST_TOKEN = 'abc123';
    process.env.YUKI_NO_TEST_ENABLED = 'true';
    process.env.YUKI_NO_TEST_PATHS = 'a\nb\nc';
  });

  afterEach(() => {
    delete process.env.YUKI_NO_TEST_TOKEN;
    delete process.env.YUKI_NO_TEST_ENABLED;
    delete process.env.YUKI_NO_TEST_PATHS;
    delete process.env.YUKI_NO_TEST_FALSE;
  });

  describe('getInput', () => {
    it('returns environment variable value with YUKI_NO_ prefix', () => {
      expect(getInput('YUKI_NO_TEST_TOKEN')).toBe('abc123');
    });

    it('returns undefined for non-existent variable', () => {
      expect(getInput('YUKI_NO_NON_EXISTENT')).toBeUndefined();
    });

    it('returns undefined for variable without YUKI_NO_ prefix', () => {
      process.env.TEST_TOKEN_NO_PREFIX = 'secret';
      expect(getInput('TEST_TOKEN_NO_PREFIX')).toBeUndefined();
      delete process.env.TEST_TOKEN_NO_PREFIX;
    });

    it('returns default value when variable is undefined', () => {
      expect(getInput('YUKI_NO_NON_EXISTENT', 'default')).toBe('default');
    });

    it('returns default value for variable without YUKI_NO_ prefix', () => {
      process.env.TEST_TOKEN_NO_PREFIX = 'secret';
      expect(getInput('TEST_TOKEN_NO_PREFIX', 'default')).toBe('default');
      delete process.env.TEST_TOKEN_NO_PREFIX;
    });

    it('returns environment value over default', () => {
      expect(getInput('YUKI_NO_TEST_TOKEN', 'default')).toBe('abc123');
    });
  });

  describe('getBooleanInput', () => {
    it('parses true correctly', () => {
      expect(getBooleanInput('YUKI_NO_TEST_ENABLED')).toBe(true);
    });

    it('parses false correctly', () => {
      process.env.YUKI_NO_TEST_FALSE = 'false';
      expect(getBooleanInput('YUKI_NO_TEST_FALSE')).toBe(false);
    });

    it('returns false by default for non-existent variable', () => {
      expect(getBooleanInput('YUKI_NO_NON_EXISTENT')).toBe(false);
    });

    it('returns false for variable without YUKI_NO_ prefix', () => {
      process.env.TEST_ENABLED_NO_PREFIX = 'true';
      expect(getBooleanInput('TEST_ENABLED_NO_PREFIX')).toBe(false);
      delete process.env.TEST_ENABLED_NO_PREFIX;
    });

    it('returns custom default value', () => {
      expect(getBooleanInput('YUKI_NO_NON_EXISTENT', true)).toBe(true);
    });
  });

  describe('getMultilineInput', () => {
    it('splits lines correctly', () => {
      expect(getMultilineInput('YUKI_NO_TEST_PATHS')).toEqual(['a', 'b', 'c']);
    });

    it('returns empty array by default for non-existent variable', () => {
      expect(getMultilineInput('YUKI_NO_NON_EXISTENT')).toEqual([]);
    });

    it('returns empty array for variable without YUKI_NO_ prefix', () => {
      process.env.TEST_PATHS_NO_PREFIX = 'x\ny\nz';
      expect(getMultilineInput('TEST_PATHS_NO_PREFIX')).toEqual([]);
      delete process.env.TEST_PATHS_NO_PREFIX;
    });

    it('returns custom default value', () => {
      expect(
        getMultilineInput('YUKI_NO_NON_EXISTENT', ['default1', 'default2']),
      ).toEqual(['default1', 'default2']);
    });
  });
});

describe('splitByNewline', () => {
  it('Empty strings or undefined should return an empty array', () => {
    expect(splitByNewline('')).toEqual([]);
    expect(splitByNewline('  ')).toEqual([]);
    expect(splitByNewline(undefined)).toEqual([]);
  });

  it('Should split newline-delimited strings into an array', () => {
    expect(splitByNewline('a\nb\nc')).toEqual(['a', 'b', 'c']);
  });

  it('Should exclude empty and blank lines from results', () => {
    expect(splitByNewline('a\n\nb\n \nc')).toEqual(['a', 'b', 'c']);
  });

  it('Should remove leading and trailing whitespace', () => {
    expect(splitByNewline('  a\nb  ')).toEqual(['a', 'b']);
  });
});
