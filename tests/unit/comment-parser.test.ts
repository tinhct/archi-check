import { describe, it, expect } from 'vitest';
import { parseDeveloperReply } from '@/lib/github/comment-parser';

describe('Comment Reply Parser Unit Tests', () => {
  it('should return the original text if there are no blockquotes', () => {
    const input = 'This is a clean developer response explanation.';
    const output = parseDeveloperReply(input);
    expect(output).toBe(input);
  });

  it('should strip out lines starting with > and return only the newly typed lines', () => {
    const input = `
> ### ❓ Question: What is the concurrency strategy?
> * **Target File**: src/index.ts
> * **Rationale**: Ensures no race conditions.

My custom justification response is that we use Upstash locks to serialize executions.
    `.trim();

    const output = parseDeveloperReply(input);
    expect(output).toBe('My custom justification response is that we use Upstash locks to serialize executions.');
  });

  it('should handle multiple scattered blockquotes and return only the clean non-quoted lines', () => {
    const input = `
> quote 1
new reply line 1
> quote 2
new reply line 2
    `.trim();

    const output = parseDeveloperReply(input);
    expect(output).toBe('new reply line 1\nnew reply line 2');
  });

  it('should return empty string if the entire comment is blockquotes', () => {
    const input = `
> quoted line 1
> quoted line 2
    `.trim();

    const output = parseDeveloperReply(input);
    expect(output).toBe('');
  });
});
