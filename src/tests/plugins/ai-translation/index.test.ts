import { Git } from '../../../git/core';
import { GitHub } from '../../../github/core';
import { applyFileLineChanges } from '../../../plugins/ai-translation/applyFilePatches';
import { ensureTranslationPr } from '../../../plugins/ai-translation/ensureTranslationPr';
import { extractFileLineChanges } from '../../../plugins/ai-translation/extractFilePatches';
import { getNotTrackedIssues } from '../../../plugins/ai-translation/getNotTrackedIssues';
import { getTranslationOptions } from '../../../plugins/ai-translation/getTranslationOptions';
import aiTranslationPlugin from '../../../plugins/ai-translation/index';
import { useIsTrackingFile } from '../../../utils';

import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock all dependencies
vi.mock('../../../git/core', () => ({
  Git: vi.fn(),
}));

vi.mock('../../../github/core', () => ({
  GitHub: vi.fn(),
}));

vi.mock('../../../utils', () => ({
  log: vi.fn(),
  useIsTrackingFile: vi.fn(),
}));

vi.mock('../../../plugins/ai-translation/getTranslationOptions', () => ({
  getTranslationOptions: vi.fn(),
}));

vi.mock('../../../plugins/ai-translation/ensureTranslationPr', () => ({
  ensureTranslationPr: vi.fn(),
  pushBranch: vi.fn(),
  updatePullRequest: vi.fn(),
  BRANCH_NAME: 'yuki-no-translation',
}));

vi.mock('../../../plugins/ai-translation/getNotTrackedIssues', () => ({
  getNotTrackedIssues: vi.fn(),
}));

vi.mock('../../../plugins/ai-translation/extractFilePatches', () => ({
  extractFileLineChanges: vi.fn(),
}));

vi.mock('../../../plugins/ai-translation/applyFilePatches', () => ({
  applyFileLineChanges: vi.fn(),
}));

vi.mock('../../../plugins/ai-translation/createCommit', () => ({
  createCommit: vi.fn(),
}));

const mockedGetTranslationOptions = vi.mocked(getTranslationOptions);
const mockedEnsureTranslationPr = vi.mocked(ensureTranslationPr);
const mockedGetNotTrackedIssues = vi.mocked(getNotTrackedIssues);
const mockedExtractFileLineChanges = vi.mocked(extractFileLineChanges);
const mockedApplyFileLineChanges = vi.mocked(applyFileLineChanges);
const mockedUseIsTrackingFile = vi.mocked(useIsTrackingFile);
const mockedGit = vi.mocked(Git);
const mockedGitHub = vi.mocked(GitHub);

const createMockContext = () => ({
  config: {
    upstreamRepoSpec: {
      owner: 'upstream-owner',
      repo: 'upstream-repo',
      branch: 'main',
    },
    headRepoSpec: {
      owner: 'head-owner',
      repo: 'head-repo',
      branch: 'main',
    },
    configuredLabels: ['yuki-no'],
  },
  createdIssues: [
    {
      number: 1,
      hash: 'hash1',
      body: 'body1',
      labels: [],
      isoDate: '2023-01-01',
    },
    {
      number: 2,
      hash: 'hash2',
      body: 'body2',
      labels: [],
      isoDate: '2023-01-02',
    },
  ],
});

const createMockGit = () => ({
  exec: vi.fn(),
  repoSpec: { branch: 'main' },
});

const createMockGitHub = () => ({
  api: {},
  ownerAndRepo: { owner: 'test-owner', repo: 'test-repo' },
});

describe('aiTranslationPlugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('plugin metadata', () => {
    it('should have correct name', () => {
      expect(aiTranslationPlugin.name).toBe('core:ai-translation');
    });

    it('should have onInit and onExit methods', () => {
      expect(typeof aiTranslationPlugin.onInit).toBe('function');
      expect(typeof aiTranslationPlugin.onExit).toBe('function');
    });
  });

  describe('onInit', () => {
    it('should validate options at the beginning', async () => {
      // Given
      const mockCtx = createMockContext();

      mockedGetTranslationOptions.mockReturnValue({
        modelString: 'openai/gpt-4',
        apiKey: 'test-key',
        targetLang: 'ko',
        maxToken: 4000,
      });

      const mockGit = createMockGit();
      const mockGitHub = createMockGitHub();
      mockedGit.mockImplementation(() => mockGit as any);
      mockedGitHub.mockImplementation(() => mockGitHub as any);

      mockedEnsureTranslationPr.mockResolvedValue({ prNumber: 123 });
      mockedGetNotTrackedIssues.mockResolvedValue({
        notTrackedIssues: [],
        hasPendingIssues: false,
      });

      // When
      await aiTranslationPlugin.onInit!(mockCtx as any);

      // Then
      expect(mockedGetTranslationOptions).toHaveBeenCalledTimes(1);
    });

    it('should exit early when no not tracked issues', async () => {
      // Given
      const mockCtx = createMockContext();

      mockedGetTranslationOptions.mockReturnValue({
        modelString: 'openai/gpt-4',
        apiKey: 'test-key',
        targetLang: 'ko',
        maxToken: 4000,
      });

      const mockGit = createMockGit();
      const mockGitHub = createMockGitHub();
      mockedGit.mockImplementation(() => mockGit as any);
      mockedGitHub.mockImplementation(() => mockGitHub as any);

      mockedEnsureTranslationPr.mockResolvedValue({ prNumber: 123 });
      mockedGetNotTrackedIssues.mockResolvedValue({
        notTrackedIssues: [], // No issues to process
        hasPendingIssues: false,
      });

      // When
      await aiTranslationPlugin.onInit!(mockCtx as any);

      // Then
      // Should not create head Git instance or process file patches
      expect(mockedGit).toHaveBeenCalledTimes(1); // Only upstream git
      expect(mockedExtractFileLineChanges).not.toHaveBeenCalled();
      expect(mockedApplyFileLineChanges).not.toHaveBeenCalled();
    });
  });

  describe('onExit', () => {
    it('should process created issues file line changes', async () => {
      // Given
      const mockCtx = createMockContext();

      mockedGetTranslationOptions.mockReturnValue({
        modelString: 'openai/gpt-4',
        apiKey: 'test-key',
        targetLang: 'ko',
        maxToken: 4000,
      });

      const mockIsTrackingFile = vi.fn().mockReturnValue(true);
      mockedUseIsTrackingFile.mockReturnValue(mockIsTrackingFile);

      const mockFileLineChanges = [
        { filename: 'file1.md', changes: [] },
        { filename: 'file2.md', changes: [] },
      ];
      mockedExtractFileLineChanges.mockReturnValue(mockFileLineChanges);
      mockedApplyFileLineChanges.mockResolvedValue();

      // When
      await aiTranslationPlugin.onExit!(mockCtx as any);

      // Then
      expect(mockedUseIsTrackingFile).toHaveBeenCalledWith(mockCtx.config);
    });
  });
});
