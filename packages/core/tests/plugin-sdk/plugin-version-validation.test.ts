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

  it('handles pre-release version edge cases', () => {
    // Pre-release versions should extract package name correctly
    expect(getResolveId('plugin@1.0.0-beta.1')).toBe('plugin');
    expect(getResolveId('plugin@1.0.0-alpha.2')).toBe('plugin');
    expect(getResolveId('plugin@1.0.0-rc.1')).toBe('plugin');

    // Scoped packages with pre-release versions
    expect(getResolveId('@scope/plugin@1.0.0-beta.1')).toBe('@scope/plugin');
    expect(getResolveId('@yuki-no/plugin@2.1.0-alpha.3')).toBe(
      '@yuki-no/plugin',
    );
    expect(getResolveId('@org/test-plugin@3.0.0-rc.2')).toBe(
      '@org/test-plugin',
    );
  });

  it('handles build metadata version edge cases', () => {
    // Build metadata should be handled correctly
    expect(getResolveId('plugin@1.0.0+build.123')).toBe('plugin');
    expect(getResolveId('plugin@1.0.0+20230101.abc123')).toBe('plugin');

    // Scoped packages with build metadata
    expect(getResolveId('@scope/plugin@1.0.0+build.456')).toBe('@scope/plugin');
    expect(getResolveId('@yuki-no/plugin@1.0.0+feature.xyz')).toBe(
      '@yuki-no/plugin',
    );
  });

  it('handles complex version combinations', () => {
    // Pre-release + build metadata
    expect(getResolveId('plugin@1.0.0-beta.1+build.123')).toBe('plugin');
    expect(getResolveId('@scope/plugin@1.0.0-rc.1+build.456')).toBe(
      '@scope/plugin',
    );
    expect(getResolveId('@yuki-no/plugin@2.0.0-alpha.1+feature.branch')).toBe(
      '@yuki-no/plugin',
    );
  });

  it('handles malformed version strings gracefully', () => {
    // Multiple @ symbols in malformed strings
    expect(getResolveId('plugin@invalid@version')).toBe('plugin');
    expect(getResolveId('@scope/plugin@invalid@version')).toBe('@scope/plugin');

    // Empty version parts
    expect(getResolveId('plugin@')).toBe('plugin');
    expect(getResolveId('@scope/plugin@')).toBe('@scope/plugin');

    // Just @ symbol
    expect(getResolveId('@')).toBe('@');
  });
});
