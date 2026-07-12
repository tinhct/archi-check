# Sprint Report: Sprint 5 — "Live-Fire" Developer Toolkit (Epic 05)

**Date:** 2026-07-12

## 🎯 Goal

Deliver the complete "Live-Fire" Developer Toolkit (Epic 05) — enabling developers to test AI-generated quiz flows locally without GitHub webhooks. Sprint 5 extended the Playground from a single-phase diff analyzer into a full two-stage interactive pipeline (Generate Quiz → Reply Per Question → Evaluate with LLM), added shared schema infrastructure, surfaced per-phase LLM token telemetry, and redesigned the UI from a Dashboard layout to a Pipeline Thread layout mirroring the GitHub PR comment thread UX.

---

## 📋 List of Stories

| Story | Description | Result |
|-------|-------------|--------|
| **AC-ST-504** | Isolate & Surface LLM Evaluation Telemetry | ✅ Done |
| **AC-ST-501-P2** | Local AI Playground — Phase 2 (Two-Stage Evaluation Pipeline) | ✅ Done |
| **AC-ST-505** | Playground UI — "Pipeline Thread" Layout Redesign | ✅ Done |
| **BUG-505-1** | Reply textarea accepted trivially short inputs (`min(1)`) | ✅ Fixed |
| **BUG-505-2** | Next.js 16 Turbopack warning for webpack config | ✅ Fixed |

*Note: AC-ST-501, AC-ST-502, AC-ST-503 were completed and validated in a prior session; this sprint report covers the Phase 2 extension work.*

---

## 🏗️ Implementation Outcome

### AC-ST-504 — LLM Evaluation Telemetry
- `EvaluationResult` type in `src/types/archicheck.d.ts` extended with `tokens: { input, output, total }`.
- `validateAnswers` in `src/lib/llm/provider.ts` now threads `promptTokenCount` and `candidatesTokenCount` from `usageMetadata` into the returned object.
- Fail-open path returns `tokens: { input: 0, output: 0, total: 0 }` for type safety.
- Mock LLM (`mock_llm.ts`) updated to return token counts in its evaluation responses.
- Zero Redis/Octokit side effects confirmed inside `validateAnswers` (pure function, all side effects remain in webhook route handler).
- Shadow Mode compatibility confirmed — `auth.ts` Octokit interceptor unaffected by return type change.
- Tests updated: 97/97 passing.

### AC-ST-501-P2 — Two-Stage Evaluation Pipeline
- **Shared schema:** `src/schema/quiz.ts` — `QuizSchema`, `DiffSchema`, `EvaluateResponseSchema` (Zod discriminated union).
- **Phase 1 breaking change:** `POST /api/playground` response schema changed from `{ quiz, tokenCost }` to `{ quiz, tokens: { input, output, total } }`. All 9 Phase 1 unit tests updated.
- **Evaluate route:** `POST /api/playground/evaluate` (Node.js runtime). Validates: diff (max 50,000 chars), quizJson (max 20 questions), reply (min 20, max 10,000 chars). Applies `scrubSecrets` to reply before LLM call. Returns discriminated union: `success | sanitizer_rejection | llm_format_error`. Blocked by `notFound()` in production.
- **Fixture system:** `src/lib/mocks/fixtures/playground-fixtures.json` with 4 scenarios (clean, leaky, injection, ReDoS). webpack alias strips mocks from production client bundle.
- **Two-stage React UI:** State machine `idle → quiz_ready → evaluated`. Strict downstream invalidation on diff change or Regenerate. Fixture seeding skips API call. Pipeline HUD with cumulative token total.
- **Test coverage:** 11 unit tests for evaluate route; 97/97 total across 17 files.

### AC-ST-505 — Pipeline Thread UI Redesign
- **State:** `reply: string` → `perQuestionReplies: Record<string, string>` keyed on `question.id`.
- **Right pane:** Continuous thread with per-question `question-thread-block` containing inline `<textarea>` reply box (`reply-input-{question.id}`), rationale aside, file reference.
- **Left pane:** Tab bar with `[Raw PR Diff]` / `[Sanitized View (Sent to LLM)]`. Sanitized tab disabled until after Generate; resets to Raw on `invalidateDownstream()`.
- **Token display:** `~150px` token receipt table removed. Replaced with single-line `In: X | Out: Y | Total: Z` badge in Phase 1 card header.
- **Concatenation:** Structured `Q{n}: {question}\nA{n}: {answer}` format joined by `\n\n` before POST to evaluate endpoint. API contract unchanged.
- **Evaluate button:** Enabled only when ALL per-question boxes meet `MIN_REPLY_LENGTH` (20 chars). Per-box amber hint shown below threshold. Matches API-level `min(20)` Zod guard.
- **No API changes** — URL, method, and response schema unchanged.

---

## ⚖️ Decisions Made

| Decision | Rationale |
|----------|-----------|
| `reply: string` → `perQuestionReplies: Record<string, string>` | Per-question inline boxes eliminate cross-screen eye travel; concatenation preserves API contract |
| Structured Q/A concatenation format | Gives LLM evaluator per-question context, reduces hallucination in scoring |
| ALL boxes must meet `MIN_REPLY_LENGTH` (Option B) | Partial submissions mislead the scoring rubric; per-box hints make requirement obvious |
| `fixture.phase2.reply` ignored on fixture load | Free-form string cannot be reliably split across N question boxes |
| `min(20)` on API reply Zod schema | Matches mock LLM's `minimum_answer_length: 20`; rejects trivially short inputs before LLM call |
| `turbopack: {}` in `next.config.ts` | Next.js 16 uses Turbopack by default in dev; webpack config only applies to production builds |
| Case B (Live-Fire Staging) extracted to dedicated guide | Real GitHub App testing requires step-by-step junior dev guidance separate from offline tests |

---

## 🧠 Lessons Learned (Honest Retrospective)

* **What went wrong — Missing input validation (BUG-505-1):**
  The reply textarea Zod schema was set to `min(1)` in the original implementation, allowing clearly nonsensical inputs (e.g., `"ddddd"`) to pass API validation and reach the LLM. This was caught by a user during manual testing of the running dev server, not by the automated test suite.

  * **Root Cause:** The AC for the evaluate route specified `z.string().max(10000)` but did not specify a minimum. The implementation defaulted to `min(1)` (implicit in `z.string()`). The mock LLM had a `minimum_answer_length: 20` guard but this was not mirrored at the API boundary.

  * **Actionable Improvement:** When writing API validation schemas, always cross-reference the LLM/business-layer constraints and mirror the most restrictive bound at the API boundary as well. Add a regression test for the boundary value immediately after discovering it (done: `reply: 'ddddd'` test now exists in `evaluate/route.test.ts`).

* **What went wrong — Turbopack config omission (BUG-505-2):**
  The webpack alias added to `next.config.ts` was correct for production builds but triggered a Next.js 16 Turbopack warning in dev because no `turbopack` config key was present.

  * **Root Cause:** Insufficient awareness that Next.js 16 enables Turbopack by default for `npm run dev`. The `.cursorrules` Next.js version constraint was not checked before adding a webpack-only config.

  * **Actionable Improvement:** When modifying `next.config.ts`, always verify the Next.js major version in `package.json` and consult the migration notes for that version's bundler changes.

* **What went well:**
  - The discriminated union approach for the Phase 2 response schema (`success | sanitizer_rejection | llm_format_error`) was robust — no edge cases found during manual testing.
  - The `invalidateDownstream()` single-function invalidation pattern worked flawlessly across all three pipeline phases.
  - The Pipeline Thread redesign was implemented without any API contract changes — a clean UI refactor.

---

## ⏳ Pending & Open Items

* **Unfinished Tasks/Stories:** None. All Sprint 5 stories complete.
* **Sprint 6 Candidates:**
  - AC-ST-302: Token Burn Telemetry Alerting (High)
  - AC-ST-301: Pilot Onboarding & Cohort Configuration (Medium)
* **Technical Debt:**
  - `fixture.phase2.reply` field in the fixture JSON is currently ignored by the UI. Consider adding a split/parse utility in a future sprint if fixture pre-population is needed.
  - The `playwright/` E2E tests do not yet cover the Playground UI (Phase 2 interaction flow). Playwright coverage for `/playground` is deferred to Sprint 6.

---

## 💸 Burned Tokens

* **Total Prompt Tokens:** N/A (mock provider used for all local testing)
* **Total Completion Tokens:** N/A
* **Estimated API Cost:** $0.00 (all tests run offline via `LLM_PROVIDER_TYPE=mock`)
