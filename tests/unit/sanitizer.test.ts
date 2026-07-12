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

  it('should redact Slack Bot Tokens and AWS Keys and Private Key Blocks', async () => {
    const input = 'const AWS = "AKIAIOSFODNN7EXAMPLE";\nconst slack = "xoxb-123-456-abc";\nconst pem = "-----BEGIN RSA PRIVATE KEY-----\nMIIEvgI...\n-----END RSA PRIVATE KEY-----";';
    const sanitized = await scrubSecrets(input);

    expect(sanitized).not.toContain('AKIAIOSFODNN7EXAMPLE');
    expect(sanitized).not.toContain('xoxb-123-456-abc');
    expect(sanitized).not.toContain('MIIEvgI');
    expect(sanitized).toContain('AWS = "[REDACTED_SECRET]"');
    expect(sanitized).toContain('slack = "[REDACTED_SECRET]"');
    expect(sanitized).toContain('pem = "[REDACTED_SECRET]"');
  });

  it('should redact secrets assigned with variable prefixes and key configurations', async () => {
    const input = 'const AWS_SECRET = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY";\nconst awsSecret = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY";\nconst aws_key = "some_value";\nconst myKey = "some_value";\nconst monkey = "banana";\nconst whiskey = "jack";';
    const sanitized = await scrubSecrets(input);

    expect(sanitized).not.toContain('wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY');
    expect(sanitized).not.toContain('some_value');
    expect(sanitized).toContain('AWS_SECRET = "[REDACTED_SECRET]"');
    expect(sanitized).toContain('awsSecret = "[REDACTED_SECRET]"');
    expect(sanitized).toContain('aws_key = "[REDACTED_SECRET]"');
    expect(sanitized).toContain('myKey = "[REDACTED_SECRET]"');
    expect(sanitized).toContain('monkey = "banana"');
    expect(sanitized).toContain('whiskey = "jack"');
  });

  it('should leave non-sensitive code untouched', async () => {
    const input = 'const x = 5;\nconsole.log(x);';
    const sanitized = await scrubSecrets(input);

    expect(sanitized).toBe(input);
  });

  it('should trigger the 500ms circuit breaker when encountering a ReDoS pattern', async () => {
    const redosPattern = '(x+x+)+y';
    const longString = 'x'.repeat(26) + '...some text...';

    await expect(scrubSecrets(longString, [redosPattern])).rejects.toThrow(
      'Sanitization timeout (possible ReDoS)'
    );
  }, 15000);

  it('should trigger mock ReDoS timeout when encountering TRIGGER_REDOS_TIMEOUT keyword', async () => {
    const input = 'some code\nTRIGGER_REDOS_TIMEOUT\nother code';
    await expect(scrubSecrets(input)).rejects.toThrow(
      'Sanitization timeout (possible ReDoS)'
    );
  }, 15000);
});
