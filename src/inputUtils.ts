import { splitByNewline } from './utils';

export const getInput = (
  inputs: Record<string, string | undefined>,
  name: string,
): string | undefined => {
  return inputs[name];
};

export const getBooleanInput = (
  inputs: Record<string, string | undefined>,
  name: string,
): boolean => {
  const value = getInput(inputs, name);
  return value?.toLowerCase() === 'true';
};

export const getMultilineInput = (
  inputs: Record<string, string | undefined>,
  name: string,
): string[] => {
  const value = getInput(inputs, name);
  return splitByNewline(value);
};
