import { z } from 'zod';

export const EnvSchema = z
  .object({
    ACCESS_TOKEN: z
      .string({ required_error: '`accessToken` is required.' })
      .min(1, '`accessToken` is required.'),
    HEAD_REPO: z
      .string({ required_error: '`headRepo` is required.' })
      .min(1, '`headRepo` is required.'),
    TRACK_FROM: z
      .string({ required_error: '`trackFrom` is required.' })
      .min(1, '`trackFrom` is required.'),

    USER_NAME: z.string().optional(),
    EMAIL: z.string().optional(),
    UPSTREAM_REPO: z.string().optional(),
    HEAD_REPO_BRANCH: z.string().optional(),
    INCLUDE: z.string().optional(),
    EXCLUDE: z.string().optional(),
    LABELS: z.string().optional(),
    RELEASE_TRACKING: z.string().optional(),
    RELEASE_TRACKING_LABELS: z.string().optional(),
    VERBOSE: z.string().optional(),
    MAYBE_FIRST_RUN: z.string().optional(),

    GITHUB_SERVER_URL: z.string().optional(),
    GITHUB_REPOSITORY: z.string().optional(),
  })
  .passthrough();

type Env = z.infer<typeof EnvSchema>;

export const parseEnv = (input: unknown): Env => {
  const res = EnvSchema.safeParse(input);
  if (!res.success) {
    const first = res.error.issues[0];
    throw new Error(first?.message ?? 'Invalid environment configuration');
  }

  return res.data;
};
