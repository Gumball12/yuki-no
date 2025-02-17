import path from 'path';
import colors from 'colors/safe';

/**
 * Log types:
 * - I: For development debugging
 * - S: For successful operations
 * - W: For warning messages
 * - E: For error messages
 * - D: For debug messages
 */
export type LogType = 'I' | 'W' | 'E' | 'S' | 'D';

export function log(type: LogType, message: string): void {
  // Only show warnings and errors unless verbose mode is enabled
  if (
    process.env.VERBOSE?.toLowerCase() !== 'true' &&
    (type === 'I' || type === 'S')
  ) {
    return;
  }

  switch (type) {
    case 'I':
      console.info(colors.blue(message));
      break;
    case 'S':
      console.info(colors.green(message));
      break;
    case 'W':
      console.warn(colors.yellow(message));
      break;
    case 'E':
      console.error(colors.red(message));
      break;
  }
}

export function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

export function extractBasename(url: string): string {
  return path.basename(url);
}

export function extractRepoName(url: string): string {
  return path.basename(url, '.git');
}

export function extractRepoOwner(url: string): string {
  let dirname = path.dirname(url);

  if (dirname.includes(':')) {
    dirname = dirname.split(':').pop()!;
  }

  return path.basename(dirname);
}

export function removeHash(text: string): string {
  return text.replace(/( )?\(#.*\)/, '');
}

export function splitByNewline(text?: string): string[] {
  if (!text) {
    return [];
  }

  return text.split('\n').filter(line => line.trim() !== '');
}

export function getUrlWithoutDotGit(url: string): string {
  const repoUrl = url.replace(/\.git$/, '');
  return repoUrl;
}
