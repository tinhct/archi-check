/**
 * Unit Tests: /api/playground route — AC-ST-501 / Epic-05
 *
 * Historical Mitigation (Sprint 4): All fs calls and external modules
 * are mocked to prevent reading real disk files and polluting the environment.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Module-level mock state ──────────────────────────────────────────────────
// Must be declared BEFORE vi.mock() hoisting, so the mock factory can close
// over these variables. Using function-form mocks (not arrow functions) so
// that `new LLMProvider()` works correctly.
const mockGenerateQuiz = vi.fn();

vi.mock('@/lib/security/sanitizer', () => ({
  scrubSecrets: vi.fn(async (content: string) =>
    content.replace(/AKIAIOSFODNN7EXAMPLE/g, '[REDACTED_SECRET]')
  ),
}));

vi.mock('@/lib/llm/provider', () => ({
  // function keyword required — arrow functions are not constructable with `new`
  LLMProvider: function () {
    return { generateQuiz: mockGenerateQuiz };
  },
}));

// ─── Mock next/navigation to avoid Next.js context requirement ───────────────
vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

// ─── Import route handler AFTER mocks are declared ────────────────────────────
import { POST } from './route';
import { scrubSecrets } from '@/lib/security/sanitizer';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function makeRequest(body: object): NextRequest {
  return new NextRequest('http://localhost:3000/api/playground', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────
describe('POST /api/playground', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = 'test';
    process.env.LLM_PROVIDER_TYPE = 'mock';

    // Re-bind the scrubSecrets mock after clearAllMocks resets call state
    vi.mocked(scrubSecrets).mockImplementation(async (content: string) =>
      content.replace(/AKIAIOSFODNN7EXAMPLE/g, '[REDACTED_SECRET]')
    );

    // Default happy-path mock for generateQuiz
    mockGenerateQuiz.mockResolvedValue({
      questions: [
        {
          id: 'q1',
          question: 'Why is this change necessary?',
          targetFile: 'src/index.ts',
          codeSnippet: 'const added = "new";',
          rationale: 'To understand the architecture decision.',
        },
      ],
    });
  });

  it('returns sanitizedDiff, quiz, and tokenCost for a valid diff', async () => {
    const req = makeRequest({ diff: 'const x = "AKIAIOSFODNN7EXAMPLE";', provider: 'mock' });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('sanitizedDiff');
    expect(body.sanitizedDiff).toContain('[REDACTED_SECRET]');
    expect(body).toHaveProperty('quiz');
    expect(body.quiz.questions).toHaveLength(1);
    expect(body).toHaveProperty('tokenCost');
    expect(typeof body.tokenCost).toBe('string');
  });

  it('calls scrubSecrets before calling the LLM', async () => {
    const req = makeRequest({ diff: 'const x = 1;', provider: 'mock' });
    await POST(req);
    expect(scrubSecrets).toHaveBeenCalledWith('const x = 1;', [], undefined, 'playground');
  });

  it('returns 400 when diff is missing', async () => {
    const req = makeRequest({ provider: 'mock' });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  it('returns 400 when diff is an empty string', async () => {
    const req = makeRequest({ diff: '   ', provider: 'mock' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 when body is invalid JSON', async () => {
    const req = new NextRequest('http://localhost:3000/api/playground', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 500 when the LLM throws', async () => {
    mockGenerateQuiz.mockRejectedValueOnce(new Error('LLM upstream error'));

    const req = makeRequest({ diff: 'const x = 1;', provider: 'mock' });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain('LLM upstream error');
  });

  it('does NOT call notFound() when NODE_ENV is "test"', async () => {
    const { notFound } = await import('next/navigation');
    const req = makeRequest({ diff: 'const x = 1;', provider: 'mock' });
    await POST(req);
    expect(notFound).not.toHaveBeenCalled();
  });
});
