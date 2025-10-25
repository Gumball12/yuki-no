import nock from 'nock';
import { afterEach, beforeAll } from 'vitest';

beforeAll(() => {
  nock.disableNetConnect();
});

afterEach(() => {
  try {
    nock.abortPendingRequests();
  } catch {}
  try {
    nock.cleanAll();
  } catch {}
});
