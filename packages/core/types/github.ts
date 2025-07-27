export type IssueMeta = Readonly<{
  title: string;
  body: string;
  labels: string[];
}>;

export type Issue = {
  number: number;
  body: string;
  labels: string[];
  hash: string;
  isoDate: string;
};
