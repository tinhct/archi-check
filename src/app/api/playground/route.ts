import { NextRequest, NextResponse } from 'next/server';
import { notFound } from 'next/navigation';
import { scrubSecrets } from '@/lib/security/sanitizer';
import { LLMProvider } from '@/lib/llm/provider';
import { diffParserService } from '@/lib/analyzer/diff-parser';
import { DiffSchema } from '@/schema/quiz';

/**
 * POST /api/playground — AC-ST-501 / Epic-05
 *
 * Defense Layer 2: Secondary notFound() guard in case the middleware is
 * ever bypassed (e.g., direct Vercel function invocation in production).
 *
 * Accepts: { diff: string, provider?: string }
 * Returns: { sanitizedDiff: string, quiz: object, tokens: { input: number, output: number, total: number } }
 */
export async function POST(request: NextRequest) {
  // Secondary production gate (Defense in Depth — Layer 2)
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  let body: { diff?: string; provider?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { diff, provider: providerOverride } = body;

  if (!diff || typeof diff !== 'string' || diff.trim().length === 0) {
    return NextResponse.json({ error: 'Request body must include a non-empty "diff" string.' }, { status: 400 });
  }

  // Validate diff size via shared DiffSchema (max 50,000 chars — matches evaluate endpoint)
  const diffValidation = DiffSchema.safeParse(diff);
  if (!diffValidation.success) {
    return NextResponse.json(
      { error: diffValidation.error.issues[0]?.message ?? 'Invalid diff input.' },
      { status: 400 }
    );
  }

  // Validate Git diff structure/modifications using the same parser as webhooks
  const parsed = diffParserService.parseDiff(diff);
  if (parsed.linesAdded === 0 && parsed.linesRemoved === 0) {
    return NextResponse.json(
      { error: 'Invalid Git diff. The input must contain a valid unified git diff format (e.g. lines starting with "diff --git").' },
      { status: 400 }
    );
  }

  try {
    // 1. Sanitize secrets out of the diff before sending to LLM
    const sanitizedDiff = await scrubSecrets(diff, [], undefined, 'playground');

    // 2. Override provider type for this request if specified
    const originalProviderType = process.env.LLM_PROVIDER_TYPE;
    if (providerOverride && ['mock', 'gemini-developer'].includes(providerOverride)) {
      process.env.LLM_PROVIDER_TYPE = providerOverride;
    }

    const llm = new LLMProvider();
    const { quiz, tokens } = await llm.generateQuiz(sanitizedDiff);

    // Restore original provider type env var
    if (providerOverride) {
      if (originalProviderType === undefined) {
        delete process.env.LLM_PROVIDER_TYPE;
      } else {
        process.env.LLM_PROVIDER_TYPE = originalProviderType;
      }
    }

    return NextResponse.json({ sanitizedDiff, quiz, tokens }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error.';
    console.error('[Playground API] Error:', message);
    return NextResponse.json({ error: `LLM generation failed: ${message}` }, { status: 500 });
  }
}
