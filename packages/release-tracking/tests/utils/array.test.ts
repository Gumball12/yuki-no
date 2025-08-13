import { mergeArray, uniqueWith } from '../../utils/array';

import { describe, expect, it } from 'vitest';

describe('utils/array', () => {
  describe('mergeArray', () => {
    it('returns empty when both arrays are empty', () => {
      expect(mergeArray([], [])).toEqual([]);
    });

    it('returns b when a is empty', () => {
      expect(mergeArray([], [1, 2])).toEqual([1, 2]);
    });

    it('returns a when b is empty', () => {
      expect(mergeArray([1, 2], [])).toEqual([1, 2]);
    });

    it('concat when both are non-empty', () => {
      expect(mergeArray([1], [2, 3])).toEqual([1, 2, 3]);
    });
  });

  describe('uniqueWith', () => {
    it('returns copy when length <= 1', () => {
      const obj = [{ id: 1 }];
      const result = uniqueWith(obj, v => v.id);
      expect(result).toEqual(obj);
      expect(result).not.toBe(obj);
    });

    it('removes duplicates based on mapper', () => {
      const input = [{ id: 1 }, { id: 2 }, { id: 1 }, { id: 3 }];
      const result = uniqueWith(input, v => v.id);
      expect(result).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
    });
  });
});
