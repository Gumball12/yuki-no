import colors from 'colors/safe';

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
    return isNotNullable && value.length > 0;
  }

  return isNotNullable;
};

export const unique = <T>(value: T[]): T[] => Array.from(new Set(value));
