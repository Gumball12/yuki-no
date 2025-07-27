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

export const splitByNewline = (text?: string): string[] => {
  const trimText = text?.trim();

  if (!trimText) {
    return [];
  }

  return trimText.split('\n').filter(line => line.trim() !== '');
};
