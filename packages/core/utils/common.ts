import os from 'node:os';
import path from 'node:path';

export const assert = (condition: boolean, message: string): void => {
  if (!condition) {
    throw new Error(message);
  }
};

export const excludeFrom = (
  excludeSource: string[],
  reference: string[],
): string[] => excludeSource.filter(sourceEl => !reference.includes(sourceEl));

export const chunk = <T>(data: T[], chunkSize: number): T[][] => {
  if (chunkSize >= data.length) {
    return [data];
  }

  if (chunkSize < 1) {
    throw new Error('Invalid chunkSize');
  }

  return [...Array(Math.ceil(data.length / chunkSize))].map<T[]>((_, ind) =>
    data.slice(ind * chunkSize, (ind + 1) * chunkSize),
  );
};

export const uniqueWith = <V>(value: V[], mapper: (v: V) => unknown): V[] => {
  if (value.length <= 1) {
    return [...value];
  }

  const result: V[] = [];
  const seen = new Set();

  for (const v of value) {
    const mapped = mapper(v);

    if (seen.has(mapped)) {
      continue;
    }

    result.push(v);
    seen.add(mapped);
  }

  return [...result];
};

export const mergeArray = <T>(a: T[], b: T[]): T[] => {
  if (a.length === 0 && b.length === 0) {
    return [];
  }

  if (a.length === 0) {
    return [...b];
  }

  if (b.length === 0) {
    return [...a];
  }

  return [...a, ...b];
};

export const isNotEmpty = <T>(value: T | undefined | null): value is T => {
  const isNotNullable = value !== undefined && value !== null;

  if (typeof value === 'string') {
    return value.length > 0;
  }

  return isNotNullable;
};

export const unique = <T>(value: T[]): T[] => Array.from(new Set(value));

const COMMIT_URL_REGEX =
  /https:\/\/github\.com\/[^/]+\/[^/]+\/commit\/([a-f0-9]{7,40})/;

export const extractHashFromIssue = (issue: {
  body?: string;
}): string | undefined => {
  const match = issue.body?.match(COMMIT_URL_REGEX);
  return match?.[1];
};

export const createTempFilePath = (prefix: string): string =>
  path.join(os.tmpdir(), prefix);
