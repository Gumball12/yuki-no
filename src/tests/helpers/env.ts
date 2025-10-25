export const setEnv = (overrides: Record<string, string>): void => {
  Object.assign(process.env, overrides);
};
