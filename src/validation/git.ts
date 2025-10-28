import { z } from 'zod';

export const CommitSchema = z.object({
  title: z.string().min(1),
  isoDate: z.string().min(1),
  hash: z.string().min(1),
  fileNames: z.array(z.string().min(1)),
});
