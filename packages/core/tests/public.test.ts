import { afterEach, beforeEach, describe, expect, it } from 'vitest';

describe('public module exports', () => {
  it('exports YukiNoPlugin type', async () => {
    const publicModule = await import('../plugin-sdk');
    expect(publicModule).toBeDefined();
  });

  it('exports inputUtils functions', async () => {
    const { getInput, getBooleanInput, getMultilineInput } = await import(
      '../plugin-sdk'
    );

    expect(typeof getInput).toBe('function');
    expect(typeof getBooleanInput).toBe('function');
    expect(typeof getMultilineInput).toBe('function');
  });

  describe('inputUtils functions work correctly', () => {
    beforeEach(() => {
      process.env.TEST_INPUT = 'test-value';
      process.env.BOOLEAN_INPUT = 'true';
      process.env.MULTILINE_INPUT = 'line1\nline2\nline3';
    });

    afterEach(() => {
      delete process.env.TEST_INPUT;
      delete process.env.BOOLEAN_INPUT;
      delete process.env.MULTILINE_INPUT;
    });

    it('environment variable functions work correctly', async () => {
      const { getInput, getBooleanInput, getMultilineInput } = await import(
        '../plugin-sdk'
      );

      expect(getInput('TEST_INPUT')).toBe('test-value');
      expect(getBooleanInput('BOOLEAN_INPUT')).toBe(true);
      expect(getMultilineInput('MULTILINE_INPUT')).toEqual([
        'line1',
        'line2',
        'line3',
      ]);
    });
  });
});
