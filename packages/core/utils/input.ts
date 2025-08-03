import { isNotEmpty } from './common';

export function getInput(name: string): string | undefined;
export function getInput(name: string, defaultValue: string): string;
export function getInput(name: string, defaultValue?: string | undefined) {
  return process.env[name] ?? defaultValue;
}

export const getBooleanInput = (
  name: string,
  defaultValue = false,
): boolean => {
  const value = getInput(name);

  if (value === undefined) {
    return defaultValue;
  }

  return value?.toLowerCase() === 'true';
};

export const getMultilineInput = (
  name: string,
  defaultValue: string[] = [],
): string[] => {
  const value = getInput(name);

  if (value === undefined) {
    return defaultValue;
  }

  return splitByNewline(value);
};

export const splitByNewline = (text?: string, trim = true): string[] => {
  const normalizedText = trim ? text?.trim() : text;
  if (!normalizedText) {
    return [];
  }

  let splittedByNewline = normalizedText.split('\n');

  if (trim) {
    splittedByNewline = splittedByNewline.map(line => line.trim());
  }

  return splittedByNewline.filter(isNotEmpty);
};
