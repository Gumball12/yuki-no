type FileChangeBase = {
  upstreamFileName: string;
};

type TextFileChange =
  | {
      type: 'update';
      changes: LineChange[];
      totalLineCount: number;
    }
  | {
      type: 'rename' | 'copy';
      nextUpstreamFileName: string;
      similarity: number;
      changes: LineChange[];
      totalLineCount: number;
    };

type BinaryFileChange = {
  type: 'update';
  changes: Buffer;
};

export type FileChange = FileChangeBase &
  (
    | TextFileChange
    | BinaryFileChange
    | {
        type: 'delete';
      }
    | {
        type: 'type';
      }
  );

export type LineChange =
  | {
      type: 'insert-line';
      lineNumber: number;
      content: string;
    }
  | {
      type: 'delete-line';
      lineNumber: number;
    };

export type FileStatus =
  | {
      status: 'M' | 'A' | 'D' | 'T';
      headFileName: string;
    }
  | {
      status: 'R' | 'C';
      headFileName: string;
      nextHeadFileName: string;
      similarity: number;
    };
