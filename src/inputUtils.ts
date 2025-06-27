import { splitByNewline } from './utils';

export const getInput = (
  name: string,
  defaultValue?: string,
): string | undefined => {
  return process.env[name] ?? defaultValue;
};

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
