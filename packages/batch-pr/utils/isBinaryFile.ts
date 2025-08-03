import path from 'node:path';

const BINARY_FILE_EXTENSIONS: Readonly<Set<string>> = new Set([
  // Images
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.bmp',
  '.tiff',
  '.ico',
  '.webp',
  // Executables
  '.exe',
  '.dll',
  '.so',
  '.dylib',
  '.bin',
  // Archives
  '.zip',
  '.rar',
  '.tar',
  '.gz',
  '.7z',
  // Audio/Video
  '.mp3',
  '.mp4',
  '.avi',
  '.mkv',
  '.wav',
  '.flac',
  // Fonts
  '.ttf',
  '.otf',
  '.woff',
  '.woff2',
  // Documents
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  // Databases
  '.db',
  '.sqlite',
  '.mdb',
  // Other
  '.iso',
  '.dmg',
  '.img',
]);

export const isBinaryFile = (fileName: string): boolean => {
  const ext = path.extname(fileName).toLowerCase();
  return BINARY_FILE_EXTENSIONS.has(ext);
};
