/**
 * Filters environment variables to only include those with YUKI_NO_ prefix
 * for secure plugin execution
 */
export const filterPluginEnv = (): Record<string, string> => {
  const filteredEnv: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith('YUKI_NO_') && value !== undefined) {
      filteredEnv[key] = value;
    }
  }
  
  return filteredEnv;
};

/**
 * Plugin-safe getInput function that only reads from filtered environment variables
 */
export const getPluginInput = (
  env: Record<string, string>,
  name: string,
): string | undefined;
export const getPluginInput = (
  env: Record<string, string>,
  name: string,
  defaultValue: string,
): string;
export const getPluginInput = (
  env: Record<string, string>,
  name: string,
  defaultValue?: string | undefined,
) => {
  return env[name] ?? defaultValue;
};

/**
 * Plugin-safe getBooleanInput function
 */
export const getPluginBooleanInput = (
  env: Record<string, string>,
  name: string,
  defaultValue = false,
): boolean => {
  const value = getPluginInput(env, name);

  if (value === undefined) {
    return defaultValue;
  }

  return value?.toLowerCase() === 'true';
};

/**
 * Plugin-safe getMultilineInput function
 */
export const getPluginMultilineInput = (
  env: Record<string, string>,
  name: string,
  defaultValue: string[] = [],
): string[] => {
  const value = getPluginInput(env, name);

  if (value === undefined) {
    return defaultValue;
  }

  return splitByNewline(value);
};

const splitByNewline = (text?: string): string[] => {
  const trimText = text?.trim();

  if (!trimText) {
    return [];
  }

  return trimText.split('\n').filter(line => line.trim() !== '');
};