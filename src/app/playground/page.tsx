'use client';

/**
 * Local AI Playground — AC-ST-501-P2 / Epic-05 / AC-ST-505
 *
 * Phase 2 + Pipeline Thread Redesign.
 * State Machine:  idle → quiz_ready → evaluated
 *
 * Layout: "Pipeline Thread"
 *   LEFT  — Context & Configuration (diff tabs, fixture, provider, generate)
 *   RIGHT — Interactive AI Thread (questions + inline reply boxes, eval result)
 *
 * Reply state:  perQuestionReplies: Record<question.id, string>
 * Concatenation: structured "Q{n}: {question}\nA{n}: {answer}" joined by \n\n
 * Partial submission: ALL boxes must meet MIN_REPLY_LENGTH before Evaluate enables.
 *
 * Defense Layer 2: notFound() secondary gate.
 * The edge middleware (middleware.ts) is the primary Layer-1 block.
 */
import { notFound } from 'next/navigation';
import { useState, useCallback } from 'react';
import './playground.css';

// Static JSON import — webpack alias resolves to {} in production builds
// (see next.config.ts), so FIXTURES gracefully degrades to an empty array.
import fixturesData from '@/lib/mocks/fixtures/playground-fixtures.json';

// ─── Types ─────────────────────────────────────────────────────────────────────

type Phase = 'idle' | 'quiz_ready' | 'evaluated';
type LeftTab = 'raw' | 'sanitized';

interface TokenCounts {
  input: number;
  output: number;
  total: number;
}

interface Question {
  id: string;
  question: string;
  targetFile: string;
  codeSnippet: string;
  rationale: string;
}

interface Phase1Result {
  sanitizedDiff: string;
  quiz: { questions: Question[] };
  tokens: TokenCounts;
}

type EvaluateResponse =
  | {
      reason: 'success';
      passed: boolean;
      score: number;
      reasoning: string;
      passingThreshold: number;
      tokens: TokenCounts;
    }
  | {
      reason: 'sanitizer_rejection';
      passed: false;
      score: null;
      reasoning: string;
      passingThreshold: number;
      tokens: TokenCounts;
    }
  | {
      reason: 'llm_format_error';
      passed: false;
      score: null;
      reasoning: string;
      passingThreshold: number;
      tokens: TokenCounts;
    };

interface EvalError {
  message: string;
  retryable: boolean;
}

interface PlaygroundFixture {
  id: string;
  name: string;
  description: string;
  phase1: { diff: string };
  phase2?: {
    quizJson: Question[];
    reply?: string; // retained in schema for documentation; ignored by UI (boxes left empty)
  };
}

// Minimum per-box reply length — mirrors MockLLMProvider default minimum_answer_length
// and the API-level Zod min(20) guard in /api/playground/evaluate/route.ts.
const MIN_REPLY_LENGTH = 20;

// ─── Fixture Loader ─────────────────────────────────────────────────────────────
// In production, webpack alias resolves the import to {} (empty module);
// the ?. chain + ?? [] ensures a graceful no-op fallback.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const FIXTURES: PlaygroundFixture[] = (fixturesData as any)?.fixtures ?? [];

// ─── Component ─────────────────────────────────────────────────────────────────
export default function PlaygroundPage() {
  // Defense Layer 2 — secondary production gate
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  // ── Phase 1 state ────────────────────────────────────────────────────────────
  const [diff, setDiff] = useState('');
  const [provider, setProvider] = useState<'mock' | 'gemini-developer'>('mock');
  const [fixtureId, setFixtureId] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [phase1Result, setPhase1Result] = useState<Phase1Result | null>(null);
  const [phase1Error, setPhase1Error] = useState<string | null>(null);

  // ── Left pane tab state ───────────────────────────────────────────────────────
  const [leftTab, setLeftTab] = useState<LeftTab>('raw');

  // ── Phase 2 state ────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>('idle');
  const [quizJson, setQuizJson] = useState<Question[] | null>(null);
  const [isFixtureSeeded, setIsFixtureSeeded] = useState(false);
  // Per-question replies keyed on question.id (replaces single reply string)
  const [perQuestionReplies, setPerQuestionReplies] = useState<Record<string, string>>({});
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<EvaluateResponse | null>(null);
  const [evalError, setEvalError] = useState<EvalError | null>(null);

  // ── Strict Downstream Invalidation ──────────────────────────────────────────
  // Must be called before any state change that invalidates downstream outputs.
  const invalidateDownstream = useCallback(() => {
    setPhase1Result(null);
    setPhase1Error(null);
    setQuizJson(null);
    setPhase('idle');
    setIsFixtureSeeded(false);
    setPerQuestionReplies({});
    setEvaluationResult(null);
    setEvalError(null);
    setLeftTab('raw'); // reset tab — sanitized view only meaningful after Generate
  }, []);

  // ── Diff Change Handler ──────────────────────────────────────────────────────
  // Any edit to the diff instantly clears all downstream state (no debounce).
  const handleDiffChange = useCallback(
    (value: string) => {
      setDiff(value);
      setFixtureId('');
      invalidateDownstream();
    },
    [invalidateDownstream]
  );

  // ── Fixture Loader ───────────────────────────────────────────────────────────
  const handleFixtureLoad = useCallback(
    (id: string) => {
      setFixtureId(id);
      invalidateDownstream();

      if (!id) {
        setDiff('');
        return;
      }

      const fixture = FIXTURES.find((f) => f.id === id);
      if (!fixture) return;

      // Inject Phase 1 diff content
      setDiff(fixture.phase1.diff);

      // If the fixture includes a Phase 2 payload, auto-advance to quiz_ready
      // without making an API call (fixture-seeded state).
      // Note: fixture.phase2.reply is intentionally ignored — reply boxes are left empty.
      if (fixture.phase2?.quizJson?.length) {
        setQuizJson(fixture.phase2.quizJson);
        setPhase('quiz_ready');
        setIsFixtureSeeded(true);
      }
    },
    [invalidateDownstream]
  );

  // ── Phase 1: Generate Quiz ───────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (!diff.trim() || isGenerating) return;
    setIsGenerating(true);
    // Strict downstream invalidation — Regenerate uses REPLACE semantics (not accumulate)
    invalidateDownstream();

    try {
      const res = await fetch('/api/playground', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ diff, provider }),
      });
      const data = await res.json();

      if (!res.ok) {
        setPhase1Error(data.error ?? `HTTP ${res.status}`);
      } else {
        const result = data as Phase1Result;
        setPhase1Result(result);
        setQuizJson(result.quiz?.questions ?? []);
        setPhase('quiz_ready');
      }
    } catch (err) {
      setPhase1Error(err instanceof Error ? err.message : 'Network error.');
    } finally {
      setIsGenerating(false);
    }
  }, [diff, provider, isGenerating, invalidateDownstream]);

  // ── Per-question reply handler ────────────────────────────────────────────────
  const handleReplyChange = useCallback((questionId: string, value: string) => {
    setPerQuestionReplies((prev) => ({ ...prev, [questionId]: value }));
  }, []);

  // ── Phase 2: Evaluate ────────────────────────────────────────────────────────
  // Builds a structured Q/A string: "Q1: {question}\nA1: {answer}\n\nQ2: ..."
  // All boxes must meet MIN_REPLY_LENGTH before this is callable.
  const handleEvaluate = useCallback(async () => {
    if (!quizJson || isEvaluating || phase !== 'quiz_ready') return;

    // Build structured reply string from per-question map
    const reply = quizJson
      .map((q, idx) => {
        const n = idx + 1;
        const answer = perQuestionReplies[q.id]?.trim() ?? '';
        return `Q${n}: ${q.question}\nA${n}: ${answer}`;
      })
      .join('\n\n');

    setIsEvaluating(true);
    setEvaluationResult(null);
    setEvalError(null);

    try {
      const res = await fetch('/api/playground/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ diff, quizJson, reply, provider }),
      });
      const data = await res.json();

      if (res.status === 400) {
        // Validation error — no retry (developer must fix input)
        setEvalError({ message: data.error ?? `HTTP ${res.status}`, retryable: false });
      } else if (res.status >= 500) {
        // Server / timeout error — retryable
        setEvalError({ message: data.error ?? 'Internal server error.', retryable: true });
      } else {
        // HTTP 200 — discriminated union (success | sanitizer_rejection | llm_format_error)
        setEvaluationResult(data as EvaluateResponse);
        setPhase('evaluated');
      }
    } catch (err) {
      setEvalError({ message: err instanceof Error ? err.message : 'Network error.', retryable: true });
    } finally {
      setIsEvaluating(false);
    }
  }, [quizJson, perQuestionReplies, isEvaluating, phase, diff, provider]);

  // ── Reset Pipeline ───────────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    setDiff('');
    setFixtureId('');
    setProvider('mock');
    setPerQuestionReplies({});
    setIsGenerating(false);
    setIsEvaluating(false);
    invalidateDownstream();
  }, [invalidateDownstream]);

  // ── Retry Evaluation (preserves per-question replies) ────────────────────────
  // perQuestionReplies is NOT cleared — the developer keeps their drafts.
  const handleRetryEval = useCallback(() => {
    setEvalError(null);
    setEvaluationResult(null);
    setPhase('quiz_ready');
  }, []);

  const parseReasoning = useCallback((text: string) => {
    if (!text) return { summary: '', breakdown: [] };
    
    // Split on Q1, Q2, Question 1, For Q1, For Question 2, bullet points, indicators
    const parts = text.split(/(?=\bFor\s+Q\d+\b|\bFor\s+Question\s+\d+\b|\bQ\d+\b|\bQuestion\s+\d+\b|❌|✅|•)/i);
    
    const summaryParts: string[] = [];
    const breakdown: Array<{ prefix: string; text: string }> = [];
    
    parts.forEach((part) => {
      const trimmed = part.trim();
      if (!trimmed) return;
      
      const isQuestionBlock = /^(For\s+Q\d+|For\s+Question\s+\d+|Q\d+|Question\s+\d+)/i.test(trimmed);
      if (isQuestionBlock) {
        const match = trimmed.match(/^(For\s+Q\d+|For\s+Question\s+\d+|Q\d+|Question\s+\d+)([:,\s.]*)/i);
        const prefix = match ? match[1] : '';
        let rest = match ? trimmed.slice(match[0].length) : trimmed;
        if (rest && rest.length > 0) {
          rest = rest.charAt(0).toUpperCase() + rest.slice(1);
        }
        breakdown.push({ prefix, text: rest });
      } else {
        const isBulletBlock = /^(❌|✅|•)/.test(trimmed);
        if (isBulletBlock && breakdown.length > 0) {
          breakdown[breakdown.length - 1].text += '\n\n' + trimmed;
        } else {
          summaryParts.push(trimmed);
        }
      }
    });
    
    return {
      summary: summaryParts.join('\n\n') || 'No summary provided.',
      breakdown
    };
  }, []);

  // ── Derived Values ───────────────────────────────────────────────────────────
  const showPipelineSpinner = isGenerating || isEvaluating;
  const p1Total = phase1Result?.tokens?.total ?? null;
  const p2Total = evaluationResult?.tokens?.total ?? null;
  const pipelineTotal =
    p1Total !== null && p2Total !== null
      ? p1Total + p2Total
      : p1Total;

  const generateLabel = isGenerating
    ? '⏳ Generating…'
    : isFixtureSeeded
    ? '🔄 Regenerate (Overwrites Fixture)'
    : quizJson
    ? '🔄 Regenerate Quiz'
    : '▶ Generate Quiz';

  const selectedFixture = FIXTURES.find((f) => f.id === fixtureId);

  // All per-question boxes must have ≥ MIN_REPLY_LENGTH chars to enable Evaluate
  const allRepliesValid =
    quizJson != null &&
    quizJson.length > 0 &&
    quizJson.every((q) => (perQuestionReplies[q.id]?.trim().length ?? 0) >= MIN_REPLY_LENGTH);

  const renderReasoning = useCallback((text: string) => {
    if (!text) return null;
    
    // Split on Q1, Q2, Question 1, For Q1, For Question 2, bullet points, indicators
    const parts = text.split(/(?=\bFor\s+Q\d+\b|\bFor\s+Question\s+\d+\b|\bQ\d+\b|\bQuestion\s+\d+\b|❌|✅|•)/i);
    
    return parts.map((part, index) => {
      const trimmed = part.trim();
      if (!trimmed) return null;

      // Match question tags like Q1, For Q1, Question 1, For Question 1
      const isQuestionBlock = /^(For\s+Q\d+|For\s+Question\s+\d+|Q\d+|Question\s+\d+)/i.test(trimmed);
      
      if (isQuestionBlock) {
        const match = trimmed.match(/^(For\s+Q\d+|For\s+Question\s+\d+|Q\d+|Question\s+\d+)([:,\s.]*)/i);
        const prefix = match ? match[1] : '';
        let rest = match ? trimmed.slice(match[0].length) : trimmed;
        
        // Capitalize first letter of target text block if needed
        if (rest && rest.length > 0) {
          rest = rest.charAt(0).toUpperCase() + rest.slice(1);
        }
        
        return (
          <div key={index} className="reasoning-block reasoning-block--question">
            <span className="reasoning-block__badge">{prefix}</span>
            <p className="reasoning-block__text">{rest}</p>
          </div>
        );
      }

      const isBulletBlock = /^(❌|✅|•)/.test(trimmed);
      if (isBulletBlock) {
        return (
          <div key={index} className="reasoning-block reasoning-block--bullet">
            <p className="reasoning-block__text">{trimmed}</p>
          </div>
        );
      }

      return (
        <div key={index} className="reasoning-block reasoning-block--general">
          <p className="reasoning-block__text">{trimmed}</p>
        </div>
      );
    });
  }, []);

  return (
    <div className="playground-root">

      {/* ════════════════════════════════════════════════
          HEADER
      ════════════════════════════════════════════════ */}
      <header className="playground-header">
        <h1>🧪 ArchiCheck AI Playground</h1>
        <span className="playground-badge">DEV ONLY</span>

        {/* Pipeline HUD */}
        <div className="pipeline-hud">
          <div className="pipeline-total-display">
            <span className="pipeline-label">Pipeline Total</span>
            {showPipelineSpinner ? (
              <span className="pipeline-mini-spinner" aria-label="Computing…" />
            ) : pipelineTotal !== null && pipelineTotal !== undefined ? (
              <span className="pipeline-value">{pipelineTotal.toLocaleString()} tokens</span>
            ) : (
              <span className="pipeline-value pipeline-value--empty">—</span>
            )}
          </div>
          <button
            id="btn-reset"
            className="btn-reset"
            onClick={handleReset}
            disabled={isGenerating || isEvaluating}
            title="Reset all state and return to idle"
          >
            ↺ Reset Pipeline
          </button>
        </div>

        <span className="playground-dev-warning">⚠️ Local dev only</span>
      </header>

      {/* ════════════════════════════════════════════════
          SPLIT BODY
      ════════════════════════════════════════════════ */}
      <main className="playground-body">

        {/* ══════════════════════════════════════════════
            LEFT PANE — Context & Configuration
        ══════════════════════════════════════════════ */}
        <section className="pane">

          <div className="pane-header">
            <span>📄 Context Configuration</span>
            <span>{diff.length.toLocaleString()} chars</span>
          </div>

          {/* Fixture + Provider selects */}
          <div className="controls">
            <label htmlFor="fixture-select">Load Fixture:</label>
            <select
              id="fixture-select"
              value={fixtureId}
              onChange={(e) => handleFixtureLoad(e.target.value)}
            >
              <option value="">— Select a fixture —</option>
              {FIXTURES.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.phase2 ? '⚡ ' : ''}{f.name}
                </option>
              ))}
            </select>

            <label htmlFor="provider-select">Provider:</label>
            <select
              id="provider-select"
              value={provider}
              onChange={(e) => setProvider(e.target.value as 'mock' | 'gemini-developer')}
            >
              <option value="mock">🤖 Mock LLM (offline)</option>
              <option value="gemini-developer">✨ Gemini (BYOK)</option>
            </select>
          </div>

          {/* Fixture description hint */}
          {selectedFixture && (
            <div className="fixture-hint">
              <span>{selectedFixture.description}</span>
              {selectedFixture.phase2 && (
                <span className="fixture-hint__tag">⚡ Phase 2 Fixture</span>
              )}
            </div>
          )}

          {/* ── Diff Editor with tabs ── */}
          <div className="diff-tab-container">
            <div className="diff-tab-bar">
              <button
                id="tab-raw"
                className={`diff-tab${leftTab === 'raw' ? ' diff-tab--active' : ''}`}
                onClick={() => setLeftTab('raw')}
              >
                Raw PR Diff
              </button>
              <button
                id="tab-sanitized"
                className={`diff-tab${leftTab === 'sanitized' ? ' diff-tab--active' : ''}`}
                onClick={() => setLeftTab('sanitized')}
                disabled={!phase1Result}
                title={!phase1Result ? 'Generate a quiz first to see the sanitized view' : undefined}
              >
                Sanitized View (Sent to LLM)
              </button>
              <span className="diff-tab-bar__chars">
                {leftTab === 'raw'
                  ? `${diff.length.toLocaleString()} chars`
                  : `${(phase1Result?.sanitizedDiff ?? '').length.toLocaleString()} chars`}
              </span>
            </div>

            <div className="diff-input-area">
              {leftTab === 'raw' ? (
                <textarea
                  id="diff-input"
                  className="diff-textarea"
                  value={diff}
                  onChange={(e) => handleDiffChange(e.target.value)}
                  placeholder={`Paste a raw git diff here, or load a fixture above.\n\nExample:\ndiff --git a/src/index.ts b/src/index.ts\n+const added = "new line";`}
                  spellCheck={false}
                  aria-label="Git diff input"
                />
              ) : (
                <pre
                  className="diff-textarea diff-textarea--readonly"
                  aria-label="Sanitized diff sent to LLM"
                  role="region"
                >
                  {phase1Result?.sanitizedDiff ?? ''}
                </pre>
              )}
            </div>
          </div>

          {/* Phase 1 Generate button */}
          <div className="submit-bar">
            <button
              id="btn-generate"
              className={`btn-submit${isFixtureSeeded ? ' btn-submit--warn' : ''}`}
              onClick={handleGenerate}
              disabled={isGenerating || isEvaluating || !diff.trim()}
              title={
                isFixtureSeeded
                  ? 'This will overwrite the fixture-seeded quiz with a live LLM call.'
                  : undefined
              }
            >
              {generateLabel}
            </button>
            <span className="char-count">
              ~{Math.ceil(diff.length / 4).toLocaleString()} tokens (est.)
            </span>
          </div>
        </section>

        {/* ══════════════════════════════════════════════
            RIGHT PANE — Interactive AI Thread
        ══════════════════════════════════════════════ */}
        <section className="pane">
          <div className="pane-header">
            <span>🧠 The Pipeline Thread</span>
            {phase !== 'idle' && !isGenerating && (
              <span className={`phase-badge phase-badge--${phase}`}>
                {phase === 'quiz_ready' ? '✓ Quiz Ready' : '✓ Evaluated'}
              </span>
            )}
          </div>

          <div className="output-pane">

            {/* ── Empty State ── */}
            {!isGenerating && !phase1Result && !phase1Error && !quizJson && (
              <div className="output-empty">
                <span className="output-icon">🔬</span>
                <p>
                  Paste a diff and click <strong>Generate Quiz</strong>,<br />
                  or load a fixture from the dropdown.
                </p>
              </div>
            )}

            {/* ── Phase 1: Loading Spinner ── */}
            {isGenerating && (
              <div className="spinner-wrap">
                <div className="spinner" />
                <span>Calling {provider === 'mock' ? 'Mock LLM' : 'Gemini API'}…</span>
              </div>
            )}

            {/* ── Phase 1: Error ── */}
            {phase1Error && !isGenerating && (
              <div className="error-box" role="alert">
                <span>❌</span>
                <div>
                  <strong>Generation Error</strong>
                  <div style={{ marginTop: '0.2rem' }}>{phase1Error}</div>
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════
                PHASE 1 OUTPUT CARD
                Questions + inline reply boxes
            ════════════════════════════════════════ */}
            {quizJson && quizJson.length > 0 && !isGenerating && (
              <>
                <div className="phase1-output-divider">
                  <span>Phase 1 — Generated Questions</span>
                </div>
                <div className="thread-card">

                  {/* Card header: title + compact token badges */}
                  <div className="thread-card__header">
                    <div className="thread-card__title">
                      <span>🤖 Questions Generated ({quizJson.length})</span>
                      {isFixtureSeeded && <span className="fixture-seeded-tag">fixture</span>}
                    </div>
                  {phase1Result && (
                    <div className="token-badges">
                      <span className="token-badge-item">
                        In: <strong>{phase1Result.tokens.input.toLocaleString()}</strong>
                      </span>
                      <span className="token-badge-sep">|</span>
                      <span className="token-badge-item">
                        Out: <strong>{phase1Result.tokens.output.toLocaleString()}</strong>
                      </span>
                      <span className="token-badge-sep">|</span>
                      <span className="token-badge-item token-badge-item--total">
                        Total: <strong>{phase1Result.tokens.total.toLocaleString()}</strong>
                      </span>
                    </div>
                  )}
                </div>

                {/* Questions thread */}
                <div className="thread-card__body">
                  {quizJson.map((q, idx) => {
                    const n = idx + 1;
                    const replyVal = perQuestionReplies[q.id] ?? '';
                    const isBelowMin = replyVal.trim().length > 0 && replyVal.trim().length < MIN_REPLY_LENGTH;
                    return (
                      <div
                        key={q.id ?? idx}
                        className={`question-thread-block${idx > 0 ? ' question-thread-block--sep' : ''}`}
                      >
                        {/* Question */}
                        <div className="question-thread-q">
                          <span className="question-thread-num">Q{n}.</span>
                          <span className="question-thread-text">{q.question}</span>
                        </div>

                        {/* Metadata: file + rationale */}
                        <div className="question-thread-meta">
                          {q.targetFile && (
                            <span className="question-meta">
                              <strong>File:</strong> {q.targetFile}
                            </span>
                          )}
                          {q.rationale && (
                            <p className="question-rationale">{q.rationale}</p>
                          )}
                          {q.codeSnippet && (
                            <pre className="question-snippet">{q.codeSnippet}</pre>
                          )}
                        </div>

                        {/* Inline reply textarea */}
                        <div className="question-thread-reply">
                          <div className="question-thread-reply__label">↳ Your reply</div>
                          <textarea
                            id={`reply-input-${q.id}`}
                            className={`reply-textarea${phase === 'idle' ? ' diff-textarea--locked' : ''}`}
                            rows={3}
                            value={replyVal}
                            onChange={(e) => handleReplyChange(q.id, e.target.value)}
                            disabled={phase === 'idle' || isEvaluating || phase === 'evaluated'}
                            placeholder={`Draft your answer for Q${n}…`}
                            spellCheck={false}
                            aria-label={`Reply to question ${n}`}
                          />
                          {isBelowMin && (
                            <span className="reply-char-hint">
                              {replyVal.trim().length} / {MIN_REPLY_LENGTH} chars · min. {MIN_REPLY_LENGTH} chars
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* ── Evaluate footer ── */}
                <div className="thread-card__footer">
                  <p className="thread-footer__hint">
                    Individual answers will be bundled and evaluated by the Phase 2 LLM against the scoring rubric.
                  </p>
                  <div className="thread-footer__actions">
                    <button
                      id="btn-evaluate"
                      className="btn-evaluate"
                      onClick={handleEvaluate}
                      disabled={phase !== 'quiz_ready' || !allRepliesValid || isEvaluating}
                      title={
                        !allRepliesValid
                          ? `All ${quizJson.length} answer box${quizJson.length !== 1 ? 'es' : ''} must have at least ${MIN_REPLY_LENGTH} characters`
                          : undefined
                      }
                    >
                      {isEvaluating ? '⏳ Evaluating…' : '⚖ Evaluate All Replies'}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* ════════════════════════════════════════
                PHASE 2 OUTPUT
            ════════════════════════════════════════ */}
            {(phase !== 'idle' || isEvaluating) && !isGenerating && (
              <>
                <div className="phase2-output-divider">
                  <span>Phase 2 — Evaluation Result</span>
                </div>

                {/* Phase 2: Loading Spinner */}
                {isEvaluating && (
                  <div className="spinner-wrap spinner-wrap--compact">
                    <div className="spinner" />
                    <span>Calling LLM evaluator…</span>
                  </div>
                )}

                {/* Phase 2: Persistent Inline Error Block */}
                {evalError && !isEvaluating && (
                  <div className="error-box error-box--persistent" role="alert">
                    <div className="error-box__content">
                      <span>❌</span>
                      <div>
                        <strong>Evaluation Error</strong>
                        <div style={{ marginTop: '0.2rem' }}>{evalError.message}</div>
                      </div>
                    </div>
                    <div className="error-box__actions">
                      {evalError.retryable && (
                        <button
                          className="btn-error btn-error--retry"
                          onClick={handleRetryEval}
                        >
                          ↺ Retry
                        </button>
                      )}
                      <button
                        className="btn-error btn-error--dismiss"
                        onClick={() => setEvalError(null)}
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                )}

                {/* Phase 2: Evaluation Result Card */}
                {evaluationResult && !isEvaluating && (() => {
                  const { summary, breakdown } = parseReasoning(evaluationResult.reasoning);
                  return (
                    <div className={`eval-card eval-card--${
                      evaluationResult.reason === 'success'
                        ? (evaluationResult.passed ? 'pass' : 'fail')
                        : evaluationResult.reason === 'sanitizer_rejection'
                        ? 'blocked'
                        : 'system-error'
                    }`}>
                      {/* Card Body */}
                      <div className="eval-card__body">
                        {evaluationResult.reason === 'success' ? (
                          <>
                            {/* Score & Executive Summary */}
                            <div className="eval-main-row">
                              <div className="eval-score-box">
                                <span className={`eval-verdict-tag eval-verdict-tag--${evaluationResult.passed ? 'pass' : 'fail'}`}>
                                  {evaluationResult.passed ? '✅ PASS' : '❌ FAIL'}
                                </span>
                                <div className="eval-score-num">
                                  {evaluationResult.score}
                                  <span className="eval-score-denom">/10</span>
                                </div>
                                <span className="eval-score-threshold">
                                  Threshold: ≥ {evaluationResult.passingThreshold}
                                </span>
                              </div>
                              <div className="eval-summary-box">
                                <h4 className="eval-section-title">
                                  <i className="fa-solid fa-file-lines mr-1.5" /> EXECUTIVE SUMMARY:
                                </h4>
                                <p className="eval-summary-text">{summary}</p>
                              </div>
                            </div>

                            {/* Detailed Breakdown */}
                            {breakdown.length > 0 && (
                              <div className="eval-breakdown">
                                <h4 className="eval-section-title">
                                  <i className="fa-solid fa-list-check mr-1.5" /> PER-QUESTION BREAKDOWN:
                                </h4>
                                <ul className="eval-breakdown-list">
                                  {breakdown.map((item, idx) => {
                                    const prefixText = item.prefix.endsWith(':') ? item.prefix : `${item.prefix}:`;
                                    return (
                                      <li key={idx} className="eval-breakdown-item">
                                        <span className="eval-breakdown-badge">{prefixText}</span>
                                        <div className="eval-breakdown-content">
                                          <p className="eval-breakdown-text">{item.text}</p>
                                        </div>
                                      </li>
                                    );
                                  })}
                                </ul>
                              </div>
                            )}
                          </>
                        ) : evaluationResult.reason === 'sanitizer_rejection' ? (
                          <>
                            <div className="eval-main-row">
                              <div className="eval-score-box">
                                <span className="eval-verdict-tag eval-verdict-tag--fail">
                                  Blocked
                                </span>
                                <div className="eval-score-num">
                                  —
                                  <span className="eval-score-denom">/10</span>
                                </div>
                              </div>
                              <div className="eval-summary-box">
                                <h4 className="eval-section-title">
                                  <i className="fa-solid fa-triangle-exclamation mr-1.5" /> SECURITY BLOCKED:
                                </h4>
                                <p className="eval-summary-text">{evaluationResult.reasoning}</p>
                              </div>
                            </div>
                            <button
                              className="btn-clear"
                              style={{ marginTop: '0.75rem' }}
                              onClick={handleRetryEval}
                            >
                              ↺ Retry with clean reply
                            </button>
                          </>
                        ) : (
                          /* llm_format_error */
                          <>
                            <div className="eval-main-row">
                              <div className="eval-score-box">
                                <span className="eval-verdict-tag eval-verdict-tag--fail">
                                  Error
                                </span>
                                <div className="eval-score-num">
                                  —
                                  <span className="eval-score-denom">/10</span>
                                </div>
                              </div>
                              <div className="eval-summary-box">
                                <h4 className="eval-section-title">
                                  <i className="fa-solid fa-triangle-exclamation mr-1.5" /> SYSTEM ERROR:
                                </h4>
                                <p className="eval-summary-text">{evaluationResult.reasoning}</p>
                              </div>
                            </div>
                            <button
                              className="btn-clear"
                              style={{ marginTop: '0.75rem' }}
                              onClick={handleRetryEval}
                            >
                              ↺ Retry
                            </button>
                          </>
                        )}
                      </div>

                      {/* Card Footer: unified token receipt at the bottom */}
                      <div className="eval-card__footer">
                        <div className="token-badges text-xs font-mono">
                          <span className="token-badge-item">
                            In: <strong>{evaluationResult.tokens.input.toLocaleString()}</strong>
                          </span>
                          <span className="token-badge-sep">|</span>
                          <span className="token-badge-item">
                            Out: <strong>{evaluationResult.tokens.output.toLocaleString()}</strong>
                          </span>
                          <span className="token-badge-sep">|</span>
                          <span className="token-badge-item token-badge-item--total">
                            Total: <strong>{evaluationResult.tokens.total.toLocaleString()}</strong>
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Phase 2: Awaiting submission */}
                {!evaluationResult && !evalError && !isEvaluating && phase === 'quiz_ready' && (
                  <div className="eval-empty">
                    <span className="eval-empty__icon">⚖</span>
                    <p>Answer each question above and click <strong>Evaluate All Replies</strong>.</p>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
