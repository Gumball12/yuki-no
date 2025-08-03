import {
  assert,
  chunk,
  excludeFrom,
  extractHashFromIssue,
  isNotEmpty,
  mergeArray,
  unique,
  uniqueWith,
} from '../../utils/common';

import { describe, expect, it } from 'vitest';

describe('assert', () => {
  it('Should not throw when condition is true', () => {
    expect(() => assert(true, 'test message')).not.toThrow();
  });

  it('Should throw error when condition is false', () => {
    expect(() => assert(false, 'test message')).toThrow('test message');
  });
});

describe('extractHashFromIssue', () => {
  it('should extract hash from valid commit URL', () => {
    const issue = {
      body: 'This issue is related to https://github.com/username/repo/commit/1234567890abcdef1234567890abcdef12345678.',
    };

    expect(extractHashFromIssue(issue)).toBe(
      '1234567890abcdef1234567890abcdef12345678',
    );
  });

  it('should extract short 7-character hash', () => {
    const issue = {
      body: 'This issue is related to https://github.com/username/repo/commit/1234567.',
    };

    expect(extractHashFromIssue(issue)).toBe('1234567');
  });

  it('should return undefined when body is undefined', () => {
    const issue = {};

    expect(extractHashFromIssue(issue)).toBeUndefined();
  });

  it('should return undefined when no commit URL is present', () => {
    const issue = {
      body: 'This issue does not contain a commit URL.',
    };

    expect(extractHashFromIssue(issue)).toBeUndefined();
  });

  it('should ignore incorrectly formatted URLs', () => {
    const issue = {
      body: 'This URL is invalid: https://github.com/username/repo/commits/1234567',
    };

    expect(extractHashFromIssue(issue)).toBeUndefined();
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

describe('uniqueWith', () => {
  it('Should remove duplicates from string array based on specific criteria', () => {
    const fruits = ['apple', 'Apple', 'APPLE', 'banana', 'Banana'];
    expect(uniqueWith(fruits, v => v.toLowerCase())).toEqual([
      'apple',
      'banana',
    ]);
  });

  it('Should remove duplicates from object array based on specific property', () => {
    const users = [
      { id: 1, name: 'Kim' },
      { id: 2, name: 'Lee' },
      { id: 3, name: 'kim' },
      { id: 4, name: 'Park' },
    ];
    expect(uniqueWith(users, v => v.name.toLowerCase())).toEqual([
      { id: 1, name: 'Kim' },
      { id: 2, name: 'Lee' },
      { id: 4, name: 'Park' },
    ]);
  });

  it('Should return an empty array for an empty input array', () => {
    expect(uniqueWith<string>([], v => v)).toEqual([]);
  });

  it('Should preserve original order when there are no duplicates', () => {
    const numbers = [3, 1, 2];
    expect(uniqueWith(numbers, v => v.toString())).toEqual([3, 1, 2]);
  });

  it('Should keep only the first occurrence of items with the same mapped value', () => {
    const items = [
      { id: 1, category: 'A' },
      { id: 2, category: 'B' },
      { id: 3, category: 'a' },
      { id: 4, category: 'b' },
    ];
    const result = uniqueWith(items, v => v.category.toLowerCase());
    expect(result.length).toBe(2);
    expect(result).toEqual([
      { id: 1, category: 'A' },
      { id: 2, category: 'B' },
    ]);
  });
});

describe('mergeArray', () => {
  it('Should return a new array when the first array is empty', () => {
    const a: number[] = [];
    const b = [1, 2, 3];
    const result = mergeArray(a, b);
    expect(result).toEqual([1, 2, 3]);
  });

  it('Should return a new array when the second array is empty', () => {
    const a = ['a', 'b', 'c'];
    const b: string[] = [];
    const result = mergeArray(a, b);
    expect(result).toEqual(['a', 'b', 'c']);
  });

  it('Should merge both arrays when neither is empty', () => {
    const a = [1, 2];
    const b = [3, 4];
    expect(mergeArray(a, b)).toEqual([1, 2, 3, 4]);
  });

  it('Should handle arrays of different types with proper typing', () => {
    interface User {
      id: number;
      name: string;
    }
    const users: User[] = [{ id: 1, name: 'Kim' }];
    const newUsers: User[] = [{ id: 2, name: 'Lee' }];
    const result = mergeArray(users, newUsers);

    expect(result).toEqual([
      { id: 1, name: 'Kim' },
      { id: 2, name: 'Lee' },
    ]);
  });

  it('Should return an empty array when both inputs are empty', () => {
    const a: string[] = [];
    const b: string[] = [];
    expect(mergeArray(a, b)).toEqual([]);
  });
});

describe('formatError', () => {
  it('Should format error', () => {
    const msg = 'formatted error';
    const error = new Error(msg);
    expect(formatError(error)).toBe(msg);
  });

  it('Should not format error', () => {
    const msg = { message: 'msg' };
    expect(formatError(msg)).toBe('');
  });
});
