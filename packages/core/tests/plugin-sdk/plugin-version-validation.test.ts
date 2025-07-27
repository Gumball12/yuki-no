import { getResolveId } from '../../plugin';

import { describe, expect, it } from 'vitest';

describe('Plugin version validation', () => {
  it('validates exact version format pattern', () => {
    // ref: checkout.sh
    const exactVersionPattern = /@[0-9]+\.[0-9]+\.[0-9]+$/;

    // Valid exact versions
    expect('plugin@1.0.0').toMatch(exactVersionPattern);
    expect('@org/plugin@2.1.3').toMatch(exactVersionPattern);
    expect('yuki-no-plugin-test@10.20.30').toMatch(exactVersionPattern);

    // Invalid versions (should be rejected)
    expect('plugin@^1.0.0').not.toMatch(exactVersionPattern);
    expect('plugin@~1.0.0').not.toMatch(exactVersionPattern);
    expect('plugin@1.0').not.toMatch(exactVersionPattern);
    expect('plugin@latest').not.toMatch(exactVersionPattern);
    expect('plugin@beta').not.toMatch(exactVersionPattern);
    expect('plugin').not.toMatch(exactVersionPattern);
    expect('plugin@1.0.0-beta').not.toMatch(exactVersionPattern);
    expect('plugin@1.0.0.0').not.toMatch(exactVersionPattern);
  });

  it('extracts resolve id', () => {
    // Regular packages
    expect(getResolveId('plugin@1.0.0')).toBe('plugin');
    expect(getResolveId('yuki-no-plugin-test@2.1.0')).toBe(
      'yuki-no-plugin-test',
    );

    // Scoped packages
    expect(getResolveId('@yuki-no/plugin-sdk-plugin-test@1.0.0')).toBe(
      '@yuki-no/plugin-sdk-plugin-test',
    );
    expect(getResolveId('@org/plugin@2.1.3')).toBe('@org/plugin');

    // Without versions
    expect(getResolveId('plugin')).toBe('plugin');
    expect(getResolveId('@scoped/package')).toBe('@scoped/package');
  });
});
