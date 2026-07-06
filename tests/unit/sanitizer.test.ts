import { describe, it, expect } from 'vitest';
import { scrubSecrets } from '@/lib/security/sanitizer';
import { MOCK_DIFF_WITH_SECRET } from '../fixtures/mock-diffs';

describe('Secret Sanitizer Unit Tests', () => {
  it('should redact Google API Keys from a text string', () => {
    const rawDiff = MOCK_DIFF_WITH_SECRET;
    const sanitized = scrubSecrets(rawDiff);

    expect(sanitized).not.toContain('AIzaSyDummyKey');
    expect(sanitized).toContain('[REDACTED GOOGLE API KEY]');
  });

  it('should redact generic passwords assigned via config assignment', () => {
    const input = 'const api_key = "my-secret-token-value";';
    const sanitized = scrubSecrets(input);

    expect(sanitized).not.toContain('my-secret-token-value');
    expect(sanitized).toContain('api_key: "[REDACTED SECRET]"');
  });

  it('should leave non-sensitive code untouched', () => {
    const input = 'const x = 5;\nconsole.log(x);';
    const sanitized = scrubSecrets(input);

    expect(sanitized).toBe(input);
  });
});
