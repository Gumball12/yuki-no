import type { Git } from '@yuki-no/plugin-sdk/infra/git';
import { splitByNewline } from '@yuki-no/plugin-sdk/utils/input';

// format: 100644 blob (blobHash) (fileName)
const LS_TREE_REGEX = /^(\d+) blob ([a-f0-9]+)\t(.+)$/;

export const extractBlobHash = (
  git: Git,
  hash: string,
  fileName: string,
): string => {
  const lsTreeString = git.exec(`ls-tree -r ${hash}`);
  const lines = splitByNewline(lsTreeString);

  for (const line of lines) {
    const match = line.match(LS_TREE_REGEX);

    if (!match) {
      continue;
    }

    const [, , blobHash, parsedFileName] = match;
    if (parsedFileName === fileName) {
      return blobHash;
    }
  }

  throw new Error(
    `Failed to extract blob hash for ${fileName} (head-repo: ${hash})`,
  );
};
