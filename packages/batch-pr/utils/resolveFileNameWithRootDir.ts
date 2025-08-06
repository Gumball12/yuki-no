export const resolveFileNameWithRootDir = (
  fileName: string,
  rootDir?: string,
): string => {
  if (!rootDir) {
    return fileName;
  }

  if (fileName === rootDir) {
    return '';
  }

  const normalizedRootDir = normalizeRootDir(rootDir);

  if (!fileName.startsWith(normalizedRootDir)) {
    return fileName;
  }

  return fileName.substring(normalizedRootDir.length);
};

export const normalizeRootDir = (rootDir?: string): string => {
  if (!rootDir) {
    return '';
  }

  if (rootDir.endsWith('/')) {
    return rootDir as `${string}/`;
  }

  return `${rootDir}/`;
};
