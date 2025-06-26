import { getBooleanInput, getInput, getMultilineInput } from '../inputUtils';

import { describe, expect, it } from 'vitest';

const INPUTS = {
  token: 'abc123',
  enabled: 'true',
  paths: 'a\nb\nc',
};

describe('plugin input helpers', () => {
  it('getInput returns raw string', () => {
    expect(getInput(INPUTS, 'token')).toBe('abc123');
  });

  it('getBooleanInput parses booleans', () => {
    expect(getBooleanInput(INPUTS, 'enabled')).toBe(true);
    expect(getBooleanInput({ enabled: 'false' }, 'enabled')).toBe(false);
  });

  it('getMultilineInput splits lines', () => {
    expect(getMultilineInput(INPUTS, 'paths')).toEqual(['a', 'b', 'c']);
  });
});
