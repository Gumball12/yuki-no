import {
  assert,
  chunk,
  excludeFrom,
  isNotEmpty,
  log,
  splitByNewline,
  unique,
} from '../utils';

import colors from 'colors/safe';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Overwrite the global mocking from vitest setup files
// with the original implementation for testing purposes
vi.mock('../utils', async importOriginal => await importOriginal());

describe('log', () => {
  beforeEach(() => {
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.VERBOSE;
  });

  it('Should log [INFO] message when VERBOSE is true', () => {
    process.env.VERBOSE = 'true';
    log('I', 'Test message');
    expect(console.info).toHaveBeenCalledWith(
      '[INFO]',
      colors.blue('Test message'),
    );
  });

  it('Should log [SUCCESS] message when VERBOSE is true', () => {
    process.env.VERBOSE = 'true';
    log('S', 'Test message');
    expect(console.info).toHaveBeenCalledWith(
      '[SUCCESS]',
      colors.green('Test message'),
    );
  });

  it('[WARNING] logs should always be output regardless of VERBOSE setting', () => {
    delete process.env.VERBOSE;
    log('W', 'Test message');
    expect(console.warn).toHaveBeenCalledWith(
      '[WARNING]',
      colors.yellow('Test message'),
    );
  });

  it('[ERROR] logs should always be output regardless of VERBOSE setting', () => {
    delete process.env.VERBOSE;
    log('E', 'Test message');
    expect(console.error).toHaveBeenCalledWith(
      '[ERROR]',
      colors.red('Test message'),
    );
  });

  it('Should not output [INFO] and [SUCCESS] logs when VERBOSE is false', () => {
    delete process.env.VERBOSE;
    log('I', 'Test message');
    log('S', 'Test message');
    expect(console.info).not.toHaveBeenCalled();
  });

  it('Should process VERBOSE setting regardless of case', () => {
    process.env.VERBOSE = 'TRUE';
    log('I', 'Test message');
    expect(console.info).toHaveBeenCalled();
  });
});

describe('assert', () => {
  it('Should not throw an exception when the condition is true', () => {
    expect(() => assert(true, 'Error message')).not.toThrow();
  });

  it('Should throw an exception with the specified message when the condition is false', () => {
    expect(() => assert(false, 'Error message')).toThrow('Error message');
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

describe('excludeFrom', () => {
  it('Should exclude elements of the second array from the first array', () => {
    expect(excludeFrom(['a', 'b', 'c'], ['b'])).toEqual(['a', 'c']);
    expect(excludeFrom(['1', '2', '3', '4'], ['2', '4'])).toEqual(['1', '3']);
  });

  it('Should return the first array unchanged if no matching elements are found', () => {
    expect(excludeFrom(['a', 'b', 'c'], ['d'])).toEqual(['a', 'b', 'c']);
    expect(excludeFrom(['a', 'b', 'c'], [])).toEqual(['a', 'b', 'c']);
  });

  it('Should return an empty array if all elements are excluded', () => {
    expect(excludeFrom(['a', 'b'], ['a', 'b'])).toEqual([]);
  });
});

describe('chunk', () => {
  it('Should split an array into chunks of specified size', () => {
    expect(chunk(['a', 'b', 'c', 'd', 'e'], 2)).toEqual([
      ['a', 'b'],
      ['c', 'd'],
      ['e'],
    ]);
    expect(chunk([1, 2, 3, 4, 5, 6], 3)).toEqual([
      [1, 2, 3],
      [4, 5, 6],
    ]);
  });

  it('Should return a single chunk containing the entire array if chunk size is larger than array length', () => {
    expect(chunk(['a', 'b', 'c'], 5)).toEqual([['a', 'b', 'c']]);
  });

  it('Should throw an error if chunk size is 0 or negative', () => {
    expect(() => chunk([1, 2, 3], 0)).toThrow('Invalid chunkSize');
    expect(() => chunk([1, 2, 3], -1)).toThrow('Invalid chunkSize');
  });

  it('Should return a single chunk containing an empty array for an empty input array', () => {
    expect(chunk([], 3)).toEqual([[]]);
  });
});

describe('isNotEmpty', () => {
  it('Should return false for null and undefined', () => {
    expect(isNotEmpty(null)).toBeFalsy();
    expect(isNotEmpty(undefined)).toBeFalsy();
  });

  it('Should return false for empty string', () => {
    expect(isNotEmpty('')).toBeFalsy();
  });

  it('Should return true for strings, numbers, objects, and other values', () => {
    expect(isNotEmpty('hello')).toBeTruthy();
    expect(isNotEmpty(0)).toBeTruthy();
    expect(isNotEmpty({})).toBeTruthy();
    expect(isNotEmpty([])).toBeTruthy();
  });

  it('Should return true for strings with only whitespace', () => {
    expect(isNotEmpty(' ')).toBeTruthy();
  });
});

describe('unique', () => {
  it('Should remove duplicate elements from an array', () => {
    expect(unique(['a', 'b', 'a', 'c'])).toEqual(['a', 'b', 'c']);
    expect(unique([1, 2, 2, 3, 1, 4])).toEqual([1, 2, 3, 4]);
  });

  it('Should return arrays without duplicates unchanged', () => {
    expect(unique(['a', 'b', 'c'])).toEqual(['a', 'b', 'c']);
  });

  it('Should return an empty array for an empty input array', () => {
    expect(unique([])).toEqual([]);
  });

  it('Should maintain only unique references in object arrays', () => {
    const obj1 = { id: 1 };
    const obj2 = { id: 2 };
    expect(unique([obj1, obj2, obj1])).toEqual([obj1, obj2]);
  });
});
