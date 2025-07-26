import { createRepoUrl } from '../../git/utils';

import { expect, it } from 'vitest';

it('Should create correct URL based on provided repository information', () => {
  const url = createRepoUrl({
    owner: 'my-owner',
    name: 'my-repo',
  });

  expect(url).toBe('https://github.com/my-owner/my-repo');
});
