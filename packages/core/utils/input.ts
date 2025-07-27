// Internal function for system configuration (unrestricted access)
export function getSystemInput(name: string): string | undefined;
export function getSystemInput(name: string, defaultValue: string): string;
export function getSystemInput(name: string, defaultValue?: string | undefined) {
  return process.env[name] ?? defaultValue;
}

// Plugin-safe function (restricted to YUKI_NO_ prefix)
export function getInput(name: string): string | undefined;
export function getInput(name: string, defaultValue: string): string;
export function getInput(name: string, defaultValue?: string | undefined) {
  // Only allow access to environment variables with YUKI_NO_ prefix for security
  if (!name.startsWith('YUKI_NO_')) {
    return defaultValue;
  }
  
  return process.env[name] ?? defaultValue;
}

// System-level boolean input (unrestricted)
export const getSystemBooleanInput = (
  name: string,
  defaultValue = false,
): boolean => {
  const value = getSystemInput(name);

  if (value === undefined) {
    return defaultValue;
  }

  return value?.toLowerCase() === 'true';
};

// System-level multiline input (unrestricted)
export const getSystemMultilineInput = (
  name: string,
  defaultValue: string[] = [],
): string[] => {
  const value = getSystemInput(name);

  if (value === undefined) {
    return defaultValue;
  }

  return splitByNewline(value);
};

// Plugin-safe boolean input (restricted to YUKI_NO_ prefix)
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

// Plugin-safe multiline input (restricted to YUKI_NO_ prefix)
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
