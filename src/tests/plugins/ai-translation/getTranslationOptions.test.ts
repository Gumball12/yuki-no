import { getInput } from '../../../inputUtils';
import { getTranslationOptions } from '../../../plugins/ai-translation/getTranslationOptions';

import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock inputUtils
vi.mock('../../../inputUtils', () => ({
  getInput: vi.fn(),
}));

const mockedGetInput = vi.mocked(getInput);

describe('getTranslationOptions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when all required options are provided', () => {
    it('should return translation options with all values', () => {
      // Given
      mockedGetInput.mockImplementation(
        (key: string, defaultValue?: string) => {
          const values: Record<string, string> = {
            AI_TRANSLATION_MODEL: 'openai/gpt-4',
            AI_TRANSLATION_API_KEY: 'test-api-key',
            AI_TRANSLATION_LANG: 'ko',
            AI_TRANSLATION_SYSTEM_PROMPT: 'You are a translator',
            AI_TRANSLATION_MAX_TOKEN: '8000',
          };
          return values[key] || defaultValue || '';
        },
      );

      // When
      const result = getTranslationOptions();

      // Then
      expect(result).toEqual({
        modelString: 'openai/gpt-4',
        apiKey: 'test-api-key',
        targetLang: 'ko',
        systemPrompt: 'You are a translator',
        maxToken: 8000,
      });
    });

    it('should use default max token when not provided', () => {
      // Given
      mockedGetInput.mockImplementation(
        (key: string, defaultValue?: string) => {
          const values: Record<string, string> = {
            AI_TRANSLATION_MODEL: 'anthropic/claude-3',
            AI_TRANSLATION_API_KEY: 'test-api-key',
            AI_TRANSLATION_LANG: 'ja',
          };
          return values[key] || defaultValue || '';
        },
      );

      // When
      const result = getTranslationOptions();

      // Then
      expect(result.maxToken).toBe(4000);
    });

    it('should support different valid vendors', () => {
      // Given
      const vendors = ['openai', 'anthropic', 'google'];

      vendors.forEach(vendor => {
        mockedGetInput.mockImplementation(
          (key: string, defaultValue?: string) => {
            const values: Record<string, string> = {
              AI_TRANSLATION_MODEL: `${vendor}/model-name`,
              AI_TRANSLATION_API_KEY: 'test-api-key',
              AI_TRANSLATION_LANG: 'ko',
            };
            return values[key] || defaultValue || '';
          },
        );

        // When
        const result = getTranslationOptions();

        // Then
        expect(result.modelString).toBe(`${vendor}/model-name`);
      });
    });
  });

  describe('when required options are missing', () => {
    it('should throw error when modelString is missing', () => {
      // Given
      mockedGetInput.mockImplementation(
        (key: string, defaultValue?: string) => {
          const values: Record<string, string> = {
            AI_TRANSLATION_API_KEY: 'test-api-key',
            AI_TRANSLATION_LANG: 'ko',
          };
          return values[key] || defaultValue || '';
        },
      );

      // When & Then
      expect(() => getTranslationOptions()).toThrow(
        'AI_TRANSLATION_MODEL, AI_TRANSLATION_API_KEY, and AI_TRANSLATION_LANG are required',
      );
    });

    it('should throw error when apiKey is missing', () => {
      // Given
      mockedGetInput.mockImplementation(
        (key: string, defaultValue?: string) => {
          const values: Record<string, string> = {
            AI_TRANSLATION_MODEL: 'openai/gpt-4',
            AI_TRANSLATION_LANG: 'ko',
          };
          return values[key] || defaultValue || '';
        },
      );

      // When & Then
      expect(() => getTranslationOptions()).toThrow(
        'AI_TRANSLATION_MODEL, AI_TRANSLATION_API_KEY, and AI_TRANSLATION_LANG are required',
      );
    });

    it('should throw error when targetLang is missing', () => {
      // Given
      mockedGetInput.mockImplementation(
        (key: string, defaultValue?: string) => {
          const values: Record<string, string> = {
            AI_TRANSLATION_MODEL: 'openai/gpt-4',
            AI_TRANSLATION_API_KEY: 'test-api-key',
          };
          return values[key] || defaultValue || '';
        },
      );

      // When & Then
      expect(() => getTranslationOptions()).toThrow(
        'AI_TRANSLATION_MODEL, AI_TRANSLATION_API_KEY, and AI_TRANSLATION_LANG are required',
      );
    });
  });

  describe('when modelString format is invalid', () => {
    it('should throw error when vendor is not supported', () => {
      // Given
      mockedGetInput.mockImplementation(
        (key: string, defaultValue?: string) => {
          const values: Record<string, string> = {
            AI_TRANSLATION_MODEL: 'invalid-vendor/model-name',
            AI_TRANSLATION_API_KEY: 'test-api-key',
            AI_TRANSLATION_LANG: 'ko',
          };
          return values[key] || defaultValue || '';
        },
      );

      // When & Then
      expect(() => getTranslationOptions()).toThrow(
        'Invalid AI_TRANSLATION_MODEL',
      );
    });

    it('should throw error when modelString format is invalid', () => {
      // Given
      mockedGetInput.mockImplementation(
        (key: string, defaultValue?: string) => {
          const values: Record<string, string> = {
            AI_TRANSLATION_MODEL: 'no-slash-format',
            AI_TRANSLATION_API_KEY: 'test-api-key',
            AI_TRANSLATION_LANG: 'ko',
          };
          return values[key] || defaultValue || '';
        },
      );

      // When & Then
      expect(() => getTranslationOptions()).toThrow(
        'Invalid AI_TRANSLATION_MODEL',
      );
    });
  });

  describe('when optional values are not provided', () => {
    it('should return undefined for systemPrompt when not provided', () => {
      // Given
      mockedGetInput.mockImplementation(
        (key: string, defaultValue?: string) => {
          const values: Record<string, string> = {
            AI_TRANSLATION_MODEL: 'openai/gpt-4',
            AI_TRANSLATION_API_KEY: 'test-api-key',
            AI_TRANSLATION_LANG: 'ko',
          };
          return values[key] || defaultValue || '';
        },
      );

      // When
      const result = getTranslationOptions();

      // Then
      expect(result.systemPrompt).toBe('');
    });
  });
});
