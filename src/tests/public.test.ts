import { describe, expect, it } from 'vitest';

describe('public module exports', () => {
  it('exports YukiNoPlugin type', async () => {
    const publicModule = await import('../public');
    expect(publicModule).toBeDefined();
  });

  it('exports inputUtils functions', async () => {
    const { getInput, getBooleanInput, getMultilineInput } = await import(
      '../public'
    );

    expect(typeof getInput).toBe('function');
    expect(typeof getBooleanInput).toBe('function');
    expect(typeof getMultilineInput).toBe('function');
  });

  it('inputUtils functions work correctly', async () => {
    const { getInput, getBooleanInput, getMultilineInput } = await import(
      '../public'
    );

    const testInputs = {
      'test-input': 'test-value',
      'boolean-input': 'true',
      'multiline-input': 'line1\nline2\nline3',
    };

    expect(getInput(testInputs, 'test-input')).toBe('test-value');
    expect(getBooleanInput(testInputs, 'boolean-input')).toBe(true);
    expect(getMultilineInput(testInputs, 'multiline-input')).toEqual([
      'line1',
      'line2',
      'line3',
    ]);
  });
});
