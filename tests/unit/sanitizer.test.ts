import { describe, it, expect } from 'vitest';
import { scrubSecrets } from '@/lib/security/sanitizer';
import { MOCK_DIFF_WITH_SECRET } from '../fixtures/mock-diffs';

describe('Secret Sanitizer Unit Tests', () => {
  it('should redact Google API Keys from a text string', async () => {
    const rawDiff = MOCK_DIFF_WITH_SECRET;
    const sanitized = await scrubSecrets(rawDiff);

    expect(sanitized).not.toContain('AIzaSyDummyKey');
    expect(sanitized).toContain('[REDACTED_SECRET]');
  });

  it('should redact generic passwords assigned via config assignment', async () => {
    const input = 'const api_key = "my-secret-token-value";';
    const sanitized = await scrubSecrets(input);

    expect(sanitized).not.toContain('my-secret-token-value');
    expect(sanitized).toContain('api_key = "[REDACTED_SECRET]"');
  });

  it('should leave non-sensitive code untouched', async () => {
    const input = 'const x = 5;\nconsole.log(x);';
    const sanitized = await scrubSecrets(input);

    expect(sanitized).toBe(input);
  });

  it('should trigger the 500ms circuit breaker when encountering a ReDoS pattern', async () => {
    // ReDoS pattern: matching a sequence of 'x' values with nested quantifiers.
    // 26 characters ensures it consistently exceeds our 500ms sanitization limit
    // while finishing in under 2 seconds on the test sandbox execution CPU.
    const redosPattern = '(x+x+)+y';
    const longString = 'x'.repeat(26) + '...some text...';

    // We expect the promise to reject with a timeout error
    await expect(scrubSecrets(longString, [redosPattern])).rejects.toThrow(
      'Sanitization timeout (possible ReDoS)'
    );
  }, 15000);
});
