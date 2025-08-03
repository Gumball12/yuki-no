export type FileNameFilter = (fileName: string) => boolean;

type FileChangeBase = {
  upstreamFileName: string;
};

export type FileChange = FileChangeBase &
  (
    | {
        type: 'update';
        changes: LineChange[] | Buffer;
      }
    | {
        type: 'delete';
      }
    | {
        type: 'rename' | 'copy';
        nextUpstreamFileName: string;
        similarity: number;
        changes: LineChange[];
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
