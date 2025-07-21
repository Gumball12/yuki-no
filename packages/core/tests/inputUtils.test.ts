import { getBooleanInput, getInput, getMultilineInput } from '../inputUtils';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

describe('plugin input helpers', () => {
  beforeEach(() => {
    process.env.TEST_TOKEN = 'abc123';
    process.env.TEST_ENABLED = 'true';
    process.env.TEST_PATHS = 'a\nb\nc';
  });

  afterEach(() => {
    delete process.env.TEST_TOKEN;
    delete process.env.TEST_ENABLED;
    delete process.env.TEST_PATHS;
  });

  describe('getInput', () => {
    it('returns environment variable value', () => {
      expect(getInput('TEST_TOKEN')).toBe('abc123');
    });

    it('returns undefined for non-existent variable', () => {
      expect(getInput('NON_EXISTENT')).toBeUndefined();
    });

    it('returns default value when variable is undefined', () => {
      expect(getInput('NON_EXISTENT', 'default')).toBe('default');
    });

    it('returns environment value over default', () => {
      expect(getInput('TEST_TOKEN', 'default')).toBe('abc123');
    });
  });

  describe('getBooleanInput', () => {
    it('parses true correctly', () => {
      expect(getBooleanInput('TEST_ENABLED')).toBe(true);
    });

    it('parses false correctly', () => {
      process.env.TEST_FALSE = 'false';
      expect(getBooleanInput('TEST_FALSE')).toBe(false);
      delete process.env.TEST_FALSE;
    });

    it('returns false by default for non-existent variable', () => {
      expect(getBooleanInput('NON_EXISTENT')).toBe(false);
    });

    it('returns custom default value', () => {
      expect(getBooleanInput('NON_EXISTENT', true)).toBe(true);
    });
  });

  describe('getMultilineInput', () => {
    it('splits lines correctly', () => {
      expect(getMultilineInput('TEST_PATHS')).toEqual(['a', 'b', 'c']);
    });

    it('returns empty array by default for non-existent variable', () => {
      expect(getMultilineInput('NON_EXISTENT')).toEqual([]);
    });

    it('returns custom default value', () => {
      expect(
        getMultilineInput('NON_EXISTENT', ['default1', 'default2']),
      ).toEqual(['default1', 'default2']);
    });
  });
});
