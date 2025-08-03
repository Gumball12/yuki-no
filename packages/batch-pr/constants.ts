export const FILE_HEADER_PREFIX: Readonly<string[]> = [
  '+++',
  '---',
  'diff',
  'index',
  'new file mode ',
  'deleted file mode ',
  '\\', // special message
];

export const FILE_STATUS_REGEX = {
  RENAMED: /^R(\d+)\t(.+)\t(.+)$/, // Rename pattern: R100\told.ts\tnew.ts
  COPIED: /^C(\d+)\t(.+)\t(.+)$/, // Copy pattern: C85\tsource.ts\tcopy.ts
  TYPE_CHANGED: /^T\t(.+)$/, // Type change pattern: T\tfile.sh
  MODIFIED_ADDED_DELETED: /^([MAD])\t(.+)$/, // pattern: M\tfile.ts, A\tfile.ts, D\tfile.ts
};
