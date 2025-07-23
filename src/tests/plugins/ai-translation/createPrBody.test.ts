import {
  createPrBody,
  type TranslateIssueType,
} from '../../../plugins/ai-translation/createPrBody';

import { describe, expect, it } from 'vitest';

describe('createPrBody', () => {
  it('should create PR body with empty sections', () => {
    const issueStatus: { number: number; type: TranslateIssueType }[] = [];
    const result = createPrBody(issueStatus);

    expect(result).toContain('## 🤖 AI Translation Batch');
    expect(result).toContain('### Pending Issues');
    expect(result).toContain('### Resolved Issues');
  });

  it('should create PR body with issue comments', () => {
    const issueStatus = [
      { number: 123, type: 'Pending' as TranslateIssueType },
      { number: 456, type: 'Resolved' as TranslateIssueType },
    ];
    const result = createPrBody(issueStatus);

    expect(result).toContain('Pending #123');
    expect(result).toContain('Resolved #456');
  });
});
