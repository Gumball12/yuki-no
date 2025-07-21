import { afterEach, beforeEach, vi } from 'vitest';

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env = { ...originalEnv };
  vi.clearAllMocks();
});

afterEach(() => {
  process.env = originalEnv;
});
