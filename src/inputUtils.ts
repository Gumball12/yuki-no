import { splitByNewline } from './utils';

export const getInput = (name: string): string | undefined => {
  return process.env[name];
};

export const getBooleanInput = (name: string): boolean => {
  const value = getInput(name);
  return value?.toLowerCase() === 'true';
};

export const getMultilineInput = (name: string): string[] => {
  const value = getInput(name);
  return splitByNewline(value);
};
