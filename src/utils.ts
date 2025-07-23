import type { Config } from './createConfig';

import colors from 'colors/safe';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import picomatch from 'picomatch';

/**
 * Log types:
 * - I: For development debugging
 * - S: For successful operations
 * - W: For warning messages
 * - E: For error messages
 */
export type LogType = 'I' | 'W' | 'E' | 'S';

export function log(type: LogType, message: string): void {
  // Only show warnings and errors unless verbose mode is enabled
  if (
    process.env.VERBOSE?.toLowerCase() !== 'true' &&
    type !== 'W' &&
    type !== 'E'
  ) {
    return;
  }

  switch (type) {
    case 'I':
      console.info('[INFO]', colors.blue(message));
      break;
    case 'S':
      console.info('[SUCCESS]', colors.green(message));
      break;
    case 'W':
      console.warn('[WARNING]', colors.yellow(message));
      break;
    case 'E':
      console.error('[ERROR]', colors.red(message));
      break;
  }
}

export const assert = (condition: boolean, message: string): void => {
  if (!condition) {
    throw new Error(message);
  }
};

export const splitByNewline = (text?: string): string[] => {
  const trimText = text?.trim();

  if (!trimText) {
    return [];
  }

  return trimText.split('\n').filter(line => line.trim() !== '');
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

export const isNotEmpty = <T>(value: T | undefined | null): value is T => {
  const isNotNullable = value !== undefined && value !== null;

  if (typeof value === 'string') {
    return value.length > 0;
  }

  return isNotNullable;
};

export const unique = <T>(value: T[]): T[] => Array.from(new Set(value));

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

export const useIsTrackingFile = (
  config: Pick<Config, 'include' | 'exclude'>,
) => {
  const isIncluded = picomatch(config.include.length ? config.include : ['**']);
  const isExcluded = picomatch(config.exclude);

  return (fileName: string): boolean => {
    if (!fileName.length) {
      return false;
    }

    if (config.include.length === 0 && config.exclude.length === 0) {
      return true;
    }

    return !isExcluded(fileName) && isIncluded(fileName);
  };
};

export const formatError = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export const createTempDir = (prefix: string): string =>
  fs.mkdtempSync(path.join(os.tmpdir(), prefix));
