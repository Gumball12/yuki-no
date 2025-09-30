export interface E2EEnvironment {
  accessToken: string;
  headRepoUrl: string;
  upstreamRepoUrl: string;
  labels?: string;
}

export const validateEnvironment = (): E2EEnvironment => {
  const envVars = {
    E2E_ACCESS_TOKEN: process.env.E2E_ACCESS_TOKEN,
    E2E_HEAD_REPO: process.env.E2E_HEAD_REPO,
    E2E_UPSTREAM_REPO: process.env.E2E_UPSTREAM_REPO,
  };

  const missing: string[] = [];
  for (const [key, value] of Object.entries(envVars)) {
    if (!value) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables in .env: ${missing.join(', ')}`,
    );
  }

  return {
    accessToken: envVars.E2E_ACCESS_TOKEN!,
    headRepoUrl: envVars.E2E_HEAD_REPO!,
    upstreamRepoUrl: envVars.E2E_UPSTREAM_REPO!,
    labels: process.env.LABELS,
  };
};

export const parseLabels = (labelsEnv?: string): string[] => {
  if (!labelsEnv) {
    return [];
  }

  return labelsEnv
    .split(/[,\n]/)
    .map(label => label.trim())
    .filter(Boolean);
};
