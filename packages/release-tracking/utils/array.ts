export const uniqueWith = <V>(value: V[], mapper: (v: V) => unknown): V[] => {
  if (value.length <= 1) {
    return [...value];
  }

  const result: V[] = [];
  const seen = new Set();

  for (const v of value) {
    const mapped = mapper(v);

    if (seen.has(mapped)) {
      continue;
    }

    result.push(v);
    seen.add(mapped);
  }

  return [...result];
};

export const mergeArray = <T>(a: T[], b: T[]): T[] => {
  if (a.length === 0 && b.length === 0) {
    return [];
  }

  if (a.length === 0) {
    return [...b];
  }

  if (b.length === 0) {
    return [...a];
  }

  return [...a, ...b];
};
