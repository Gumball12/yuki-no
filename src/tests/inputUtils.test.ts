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

  it('getInput returns raw string', () => {
    expect(getInput('TEST_TOKEN')).toBe('abc123');
    expect(getInput('NON_EXISTENT')).toBeUndefined();
  });

  it('getBooleanInput parses booleans', () => {
    expect(getBooleanInput('TEST_ENABLED')).toBe(true);

    process.env.TEST_FALSE = 'false';
    expect(getBooleanInput('TEST_FALSE')).toBe(false);
    delete process.env.TEST_FALSE;

    expect(getBooleanInput('NON_EXISTENT')).toBe(false);
  });

  it('getMultilineInput splits lines', () => {
    expect(getMultilineInput('TEST_PATHS')).toEqual(['a', 'b', 'c']);
    expect(getMultilineInput('NON_EXISTENT')).toEqual([]);
  });
});
