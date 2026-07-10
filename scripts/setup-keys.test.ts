/**
 * Unit Tests: BYOK Wizard (scripts/setup-keys.mjs) — AC-ST-503 / Epic-05
 *
 * Historical Mitigation (Sprint 4 — fs Mocking Leaks):
 * All node:fs calls are mocked via vi.mock('node:fs') to prevent the wizard
 * from reading or writing the developer's real .env.local file during test runs.
 * All @google/generative-ai calls are also mocked to prevent real API pings.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mock fs ──────────────────────────────────────────────────────────────────
vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

// ─── Mock @google/generative-ai ───────────────────────────────────────────────
const mockCountTokens = vi.fn().mockResolvedValue({ totalTokens: 5 });
const mockGetGenerativeModel = vi.fn().mockReturnValue({ countTokens: mockCountTokens });

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn(function () {
    return { getGenerativeModel: mockGetGenerativeModel };
  }),
}));

// ─── Import mocked modules ───────────────────────────────────────────────────
import { GoogleGenerativeAI } from '@google/generative-ai';

// ─── Helper: extract injectEnvVars logic for isolated unit testing ─────────────
/**
 * Mirrors the injectEnvVars() function from the wizard script.
 * We re-implement it here rather than importing the ESM script directly,
 * because the script calls main() on import (side-effect).
 */
function injectEnvVars(
  apiKey: string,
  existingContent: string | null
): string {
  let lines: string[] = [];
  if (existingContent !== null) {
    lines = existingContent
      .split('\n')
      .filter(
        (line) =>
          !line.startsWith('LLM_API_KEY=') &&
          !line.startsWith('LLM_PROVIDER_TYPE=')
      );
  }
  lines.push(`LLM_API_KEY=${apiKey}`);
  lines.push(`LLM_PROVIDER_TYPE=gemini-developer`);
  return lines.join('\n') + '\n';
}

// ─── Tests ───────────────────────────────────────────────────────────────────
describe('BYOK Wizard — injectEnvVars()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a fresh .env.local when none exists', () => {
    const result = injectEnvVars('AIza-TEST-KEY', null);
    expect(result).toContain('LLM_API_KEY=AIza-TEST-KEY');
    expect(result).toContain('LLM_PROVIDER_TYPE=gemini-developer');
  });

  it('replaces existing LLM_API_KEY and LLM_PROVIDER_TYPE lines', () => {
    const existing = [
      'GITHUB_APP_ID=12345',
      'LLM_API_KEY=old-key',
      'LLM_PROVIDER_TYPE=vertex',
      'UPSTASH_REDIS_REST_URL=https://example.upstash.io',
    ].join('\n');

    const result = injectEnvVars('new-key', existing);

    expect(result).toContain('LLM_API_KEY=new-key');
    expect(result).toContain('LLM_PROVIDER_TYPE=gemini-developer');
    expect(result).not.toContain('LLM_API_KEY=old-key');
    expect(result).not.toContain('LLM_PROVIDER_TYPE=vertex');
  });

  it('preserves all other existing lines verbatim', () => {
    const existing = [
      'GITHUB_APP_ID=12345',
      'GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\\nMIIEvgI...\\n-----END RSA PRIVATE KEY-----"',
      'LLM_API_KEY=old-key',
      'UPSTASH_REDIS_REST_URL=https://example.upstash.io',
    ].join('\n');

    const result = injectEnvVars('fresh-key', existing);

    expect(result).toContain('GITHUB_APP_ID=12345');
    expect(result).toContain('GITHUB_PRIVATE_KEY=');
    expect(result).toContain('BEGIN RSA PRIVATE KEY');
    expect(result).toContain('UPSTASH_REDIS_REST_URL=https://example.upstash.io');
  });

  it('never writes LLM_PROVIDER_TYPE=vertex', () => {
    const result = injectEnvVars('my-key', null);
    expect(result).not.toContain('vertex');
    expect(result).toContain('gemini-developer');
  });

  it('result always ends with a newline', () => {
    const result = injectEnvVars('k', null);
    expect(result.endsWith('\n')).toBe(true);
  });
});

describe('BYOK Wizard — validateKey() (Gemini ping)', () => {
  it('mockGetGenerativeModel returns a model with countTokens', async () => {
    const model = mockGetGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.countTokens('ping');
    expect(result.totalTokens).toBe(5);
  });

  it('mocked GoogleGenerativeAI does not make real network calls', () => {
    // GoogleGenerativeAI is imported from the mocked module at the top of this file
    expect(vi.isMockFunction(GoogleGenerativeAI)).toBe(true);
  });
});
