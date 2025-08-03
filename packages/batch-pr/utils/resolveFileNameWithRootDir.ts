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

  const normalizedRootDir = rootDir.endsWith('/') ? rootDir : `${rootDir}/`;

  if (!fileName.startsWith(normalizedRootDir)) {
    return fileName;
  }

  return fileName.substring(normalizedRootDir.length);
};
