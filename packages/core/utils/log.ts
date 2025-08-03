/*
NOTE: This file is not exported outside the @yuki-no/core module
*/
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
      // eslint-disable-next-line no-console
      console.info('[INFO]', colors.blue(message));
      break;
    case 'S':
      // eslint-disable-next-line no-console
      console.info('[SUCCESS]', colors.green(message));
      break;
    case 'W':
      // eslint-disable-next-line no-console
      console.warn('[WARNING]', colors.yellow(message));
      break;
    case 'E':
      // eslint-disable-next-line no-console
      console.error('[ERROR]', colors.red(message));
      break;
  }
}
