import { extractHashFromIssue, getISODate } from '../../github/utils';

import { describe, expect, it } from 'vitest';

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

describe('getISODate', () => {
  it('should convert Date object to ISO format', () => {
    const date = new Date('2023-01-01T12:00:00Z');

    expect(getISODate(date)).toBe('2023-01-01T12:00:00Z');
  });

  it('should convert date string to ISO format', () => {
    const dateString = '2023-01-01T12:00:00Z';

    expect(getISODate(dateString)).toBe('2023-01-01T12:00:00Z');
  });

  it('should include timezone Z at the end', () => {
    const date = new Date('2023-01-01T12:00:00Z');
    const isoDate = getISODate(date);

    expect(isoDate.endsWith('Z')).toBe(true);
  });

  it('should throw error for invalid date', () => {
    expect(() => {
      getISODate('invalid-date');
    }).toThrow();
  });

  it('should correctly handle date strings with timezone offset +09:00 (Asia/Seoul)', () => {
    const dateStringWithOffset = '2025-04-28T11:28:08+09:00';

    // +09:00 means 9 hours ahead of UTC, so when converted to UTC
    // the time becomes 02:28:08
    expect(getISODate(dateStringWithOffset)).toBe('2025-04-28T02:28:08Z');
  });

  it('should correctly handle date strings with timezone offset -07:00 (PDT)', () => {
    const dateStringWithOffset = '2025-04-28T10:30:15-07:00';

    // -07:00 means 7 hours behind UTC, so when converted to UTC
    // the time becomes 17:30:15
    expect(getISODate(dateStringWithOffset)).toBe('2025-04-28T17:30:15Z');
  });

  it('should correctly handle date strings with timezone offset +00:00 (UTC)', () => {
    const dateStringWithOffset = '2025-04-28T15:45:30+00:00';

    // +00:00 is UTC time, so it remains unchanged
    expect(getISODate(dateStringWithOffset)).toBe('2025-04-28T15:45:30Z');
  });

  it('should correctly handle date strings with timezone offset +05:30 (Asia/Kolkata)', () => {
    const dateStringWithOffset = '2025-04-28T18:15:45+05:30';

    // +05:30 means 5 hours and 30 minutes ahead of UTC
    // so when converted to UTC the time becomes 12:45:45
    expect(getISODate(dateStringWithOffset)).toBe('2025-04-28T12:45:45Z');
  });

  it('should correctly handle date strings with timezone offset -03:30 (Newfoundland)', () => {
    const dateStringWithOffset = '2025-04-28T08:20:10-03:30';

    // -03:30 means 3 hours and 30 minutes behind UTC
    // so when converted to UTC the time becomes 11:50:10
    expect(getISODate(dateStringWithOffset)).toBe('2025-04-28T11:50:10Z');
  });

  it('should handle date strings without timezone (depends on local timezone)', () => {
    const originalDate = new Date(Date.UTC(2025, 3, 28, 12, 30, 45));
    const dateString = originalDate.toISOString().replace('Z', '');

    console.log('Date string:', dateString);
    console.log('Result:', getISODate(dateString));
    console.log('Timezone offset (minutes):', new Date().getTimezoneOffset());

    expect(getISODate(dateString)).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/,
    );
  });
});
