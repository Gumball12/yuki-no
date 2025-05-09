import { vi } from 'vitest';

vi.mock('../utils', async importOriginal => {
  const actual = (await importOriginal()) as any;

  return {
    ...actual,
    // Disable actual log output during tests
    log: vi.fn(),
  };
});
