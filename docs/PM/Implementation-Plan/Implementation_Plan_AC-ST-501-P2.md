# Implementation Plan: Local AI Playground — Phase 2 (Two-Stage Evaluation Pipeline)

**Target Story/Epic:** AC-ST-501-P2 / Epic-05

**Status:** Approved

**Approved By:** Engineering Lead | **Approval Date:** 2026-07-12

## 🔎 Retrospective Scan — Historical Mitigations Applied

| Past Lesson | Source Sprint | Mitigation in This Plan |
|-------------|---------------|-------------------------|
| Vitest scans all files by default, causing crashes on Playwright-specific constructs | Sprint 4 | New test files for evaluate route must use `.test.ts` extension. Fixture files are JSON (not `.ts`) so no Vitest conflict. |
| `fs.readFileSync` leaks and reads real local files in tests | Sprint 4 | `playground-fixtures.json` is a static JSON import (not `fs` read), eliminating the leak vector. Vitest tests for TemplateLoader must mock the JSON import via `vi.mock`. |
| Integration tests can leave stale Redis records affecting concurrent runs | Sprint 4 | Evaluate endpoint is stateless (no Redis writes). No teardown hooks needed. |
| Mocking coverage: stub both `.rest` and `.request` on Octokit mocks | Sprint 3 | Evaluate endpoint does not call Octokit. No Octokit mocking required for evaluate tests. |
| `waitUntil` is undefined in Vitest environments | Sprint 3 | Evaluate endpoint does not use `waitUntil`. Runs synchronously on Node.js runtime. |

## 🟎️ Execution Scope

* **Objective:** Extend the Local AI Playground from a stateless one-way generator into a stateful two-stage interactive pipeline. Add `POST /api/playground/evaluate`, update the Phase 1 API response schema, create shared Zod schemas, build the fixture system, and implement the two-stage React UI with a complete state machine.
* **Prerequisites:**
  - **DEP-10 RESOLVED:** AC-ST-504 must be merged before Task Group B (evaluate route) begins.
  - **DEP-11 RESOLVED:** Task Group A (Phase 1 schema change) must complete before Task Group C (Two-Stage UI) begins.
  - **DEP-12 RESOLVED:** `src/schema/quiz.ts` must exist before Task Groups B and D.

## 🛠️ Step-by-Step Execution Steps

### 🟡 Task Group A: Shared Schema & Phase 1 Breaking Change (No blockers — begin immediately)

| Step | Task Description | Target File(s) / Component | Validation |
|------|------------------|----------------------------|------------|
| A1 | **Create `src/schema/quiz.ts`:** Export `QuizSchema` (Zod object matching `quizPayloadSchema` question shape from `src/lib/llm/schema.ts`) and `DiffSchema` (`z.string().min(1).max(50000)`). Do NOT duplicate the schema — import and re-export the question shape from `src/lib/llm/schema.ts` to keep a single source of truth, or inline it with a cross-reference comment. Also export `EvaluateResponseSchema` as the Zod discriminated union (see Step B4). | `src/schema/quiz.ts` (NEW) | `npx tsc --noEmit` passes. Both playground routes can import from this file. |
| A2 | **Update Phase 1 route `tokenCost` → `tokens`:** In `src/app/api/playground/route.ts`, replace the estimated `tokenCost` string calculation with a real `tokens: { input, output, total }` object sourced from the LLM provider response. Import `DiffSchema` from `src/schema/quiz.ts` and add `DiffSchema.safeParse(diff)` validation (runs AFTER existing `parseDiff()` structural check). Use `{ error: string }` for all HTTP 400 responses (replace any raw Zod error returns). | `src/app/api/playground/route.ts` | Response shape is `{ quiz, tokens: { input, output, total } }`. Old `tokenCost` field is gone. |
| A3 | **Update Phase 1 unit tests:** Update all assertions in `src/app/api/playground/route.test.ts` that reference `tokenCost` to reference `tokens.input`, `tokens.output`, `tokens.total`. Update any HTTP 400 assertions to expect `{ error: string }` body format. | `src/app/api/playground/route.test.ts` | `npm run test:run` green for route.test.ts. |

### 🟠 Task Group B: Evaluate API Route (Requires DEP-10 + DEP-12 resolved)

| Step | Task Description | Target File(s) / Component | Validation |
|------|------------------|----------------------------|------------|
| B1 | **Create evaluate route directory:** Create `src/app/api/playground/evaluate/` directory with `route.ts`. Add `export const runtime = 'nodejs';` at top of file (explicit Node.js runtime declaration). Add secondary production gate: `if (process.env.NODE_ENV === 'production') { notFound(); }` | `src/app/api/playground/evaluate/route.ts` (NEW) | File exists. Compilation succeeds. |
| B2 | **Implement request body parsing & validation order:** Parse JSON body. Then run Zod validation (structure + size limits) FIRST, BEFORE `parseDiff()`. Use `DiffSchema` for `diff`, `z.array(QuizSchema).max(20)` for `quizJson`, `z.string().max(10000)` for `reply`. Return `{ error: string }` HTTP 400 for any validation failure. | `src/app/api/playground/evaluate/route.ts` | HTTP 400 returned for: missing fields, diff over 50k chars, quizJson over 20 items, reply over 10k chars. |
| B3 | **Implement `parseDiff()` re-validation on `diff`:** After Zod size check, call `diffParserService.parseDiff(diff)` and reject diffs with 0 lines changed. | `src/app/api/playground/evaluate/route.ts` | Invalid diff structure returns `{ error: string }` 400. |
| B4 | **Implement `EvaluateResponseSchema` (discriminated union):** Import from `src/schema/quiz.ts`. Three variants keyed on `reason`: (1) `z.object({ reason: z.literal('success'), passed: z.boolean(), score: z.number().int().min(0).max(10), reasoning: z.string(), passingThreshold: z.number(), tokens: TokenSchema })`, (2) `z.object({ reason: z.literal('sanitizer_rejection'), passed: z.literal(false), score: z.null(), reasoning: z.string(), passingThreshold: z.number(), tokens: TokenSchema })`, (3) `z.object({ reason: z.literal('llm_format_error'), passed: z.literal(false), score: z.null(), reasoning: z.string(), passingThreshold: z.number(), tokens: TokenSchema })`. Note: field is `reasoning` (not `rationale`) to match production `EvaluationResult` type. | `src/schema/quiz.ts` | Zod schema compiles. TypeScript infers correct union type. |
| B5 | **Implement sanitizer check:** Call `scrubSecrets(reply, [], undefined, 'playground')`. If reply is materially changed by scrubbing (check if output !== input), return `{ reason: 'sanitizer_rejection', passed: false, score: null, reasoning: 'Rejected by input sanitizer: sensitive or malicious content detected in reply.', passingThreshold: 7, tokens: { input: 0, output: 0, total: 0 } }` as HTTP 200 OK. | `src/app/api/playground/evaluate/route.ts` | Submitting `AKIAIOSFODNN7EXAMPLE` in reply returns 200 with `reason: sanitizer_rejection`. |
| B6 | **Implement LLM call with synthetic context:** Call `llmProvider.validateAnswers(diff, quizJson, [sanitizedReply])` with synthetic values `repoName: 'local-sandbox'`, `prAuthor: 'local-dev'` embedded in the prompt context. Note: current `validateAnswers` signature is `(diff, questions, answers)`. Pass `quizJson` as `questions` and `[sanitizedReply]` as `answers`. | `src/app/api/playground/evaluate/route.ts` | LLM is called. Valid response is returned. |
| B7 | **Implement score validation and `llm_format_error` fallback:** After `validateAnswers` returns, check if `result.score` is an integer in 0-10 range. If not (LLM hallucinated format), catch and return `{ reason: 'llm_format_error', passed: false, score: null, reasoning: 'LLM formatting error: Score out of bounds or unparseable.', passingThreshold: 7, tokens: result.tokens }` as HTTP 200 OK. | `src/app/api/playground/evaluate/route.ts` | Out-of-range score returns `reason: llm_format_error`. |
| B8 | **Implement success response:** Build `{ reason: 'success', passed: result.passed, score: result.score, reasoning: result.reasoning, passingThreshold: 7, tokens: result.tokens }` and return as HTTP 200 OK. | `src/app/api/playground/evaluate/route.ts` | Valid LLM response returns `reason: success` with all fields populated. |
| B9 | **Write unit tests for evaluate route:** Cover: happy path (success), sanitizer rejection (200 reason: sanitizer_rejection), malformed quizJson (400), reply over limit (400), production block (notFound), llm_format_error (200). | `src/app/api/playground/evaluate/route.test.ts` (NEW) | All tests pass. `npm run test:run` green. |

### 🔵 Task Group C: Fixture System (Requires DEP-12 resolved. Can run in parallel with Task Group B)

| Step | Task Description | Target File(s) / Component | Validation |
|------|------------------|----------------------------|------------|
| C1 | **Create fixture directory and JSON:** Create `src/lib/mocks/fixtures/playground-fixtures.json` with versioned wrapper `{ "version": "1.0", "fixtures": [...] }`. Include 4 fixtures: (1) `clean-diff` (phase1 only), (2) `leaky-diff` (phase1 with AWS key in diff), (3) `prompt-injection-eval` (phase1 diff + phase2 with adversarial reply), (4) `redos-bomb` (phase1 diff containing TRIGGER_REDOS_TIMEOUT). | `src/lib/mocks/fixtures/playground-fixtures.json` (NEW) | JSON is valid. File parses without errors. |
| C2 | **Configure webpack exclusion:** Update `next.config.ts` to add a webpack rule that applies NullLoader to `src/lib/mocks/` when `config.mode === 'production'`. | `next.config.ts` | Build succeeds. Fixture file not in production client bundle. |
| C3 | **Create `PlaygroundFixtureSchema` Zod schema:** In `src/schema/quiz.ts`, define the Zod schema for fixture validation: `z.object({ version: z.literal('1.0', { errorMap: () => ({ message: 'Unsupported fixture version. To add support, update the fixtureSchema in src/lib/mocks/fixtures/.' }) }), fixtures: z.array(PlaygroundFixtureSchema) })`. | `src/schema/quiz.ts` | Schema compiles. `fixtureFileSchema.parse(fixtures)` passes on the valid JSON. |

### 🟢 Task Group D: Two-Stage React UI (Requires DEP-11 + DEP-12 resolved)

| Step | Task Description | Target File(s) / Component | Validation |
|------|------------------|----------------------------|------------|
| D1 | **Implement state machine:** Add React state: `phase: 'idle' \| 'quiz_ready' \| 'evaluated'`, `quizJson: Quiz[] \| null`, `evaluationResult: EvaluateResponse \| null`, `phase1Tokens: TokenCounts \| null`, `phase2Tokens: TokenCounts \| null`, `evaluationError: string \| null`. | `src/app/playground/page.tsx` | State transitions compile. No type errors. |
| D2 | **Implement Strict Invalidation:** On diff textarea `onChange`: instantly set `quizJson = null`, `evaluationResult = null`, `phase1Tokens = null`, `phase2Tokens = null`, `evaluationError = null`, `phase = 'idle'`. Apply `transition: opacity 0.2s` CSS on Phase 1 and Phase 2 output panels (fade out when their data is null). | `src/app/playground/page.tsx` | Editing diff clears all outputs instantly. Visual fade is smooth. |
| D3 | **Implement Template Loader:** Import `playgroundFixtures` from `src/lib/mocks/fixtures/playground-fixtures.json`. Gate Zod parse with `if (process.env.NODE_ENV !== 'production') { fixtureFileSchema.parse(imported) }`. Null-safety: `const templates = imported?.fixtures ?? []`. On template load: reset all state, inject `phase1.diff`, and if `phase2` exists auto-advance to `quiz_ready` state with `quizJson = fixture.phase2.quizJson`. Update button label to `'Regenerate (Overwrites Fixture)'` when in fixture-seeded `quiz_ready`. | `src/app/playground/page.tsx` | Template dropdown populates from JSON. Selecting a Phase 2 fixture shows quiz without API call. |
| D4 | **Implement Phase 1 UI (quiz generation):** Update `fetch('/api/playground')` call-site to read `response.tokens` (not `tokenCost`). Display Phase 1 receipt card: `Input: X tokens / Output: Y tokens / Total: Z tokens`. Show spinner in place of receipt during `isGenerating`. Clicking Regenerate clears Phase 2 state, Phase 2 tokens, and pipeline total (spinner) before firing new API call. Token counter uses REPLACE not accumulate semantics. | `src/app/playground/page.tsx` | Phase 1 API response populates receipt card. Regenerate clears Phase 2 and shows spinner in pipeline total. |
| D5 | **Implement Phase 2 UI (evaluation):** Developer Reply textarea is disabled until `phase === 'quiz_ready'`. On submit, call `POST /api/playground/evaluate` with `{ diff, quizJson, reply }`. On success: update `evaluationResult`, set Phase 2 receipt, advance `phase = 'evaluated'`. Render `passed` as PASS/FAIL badge. Render `score` as `X / 10` (or `— / 10` if null). Render `passing threshold: ≥ 7/10` from `response.passingThreshold`. Render `reason === 'sanitizer_rejection'` as distinct `'Sanitizer Blocked'` badge. Render `reason === 'llm_format_error'` with inline error messaging. | `src/app/playground/page.tsx` | Full two-stage flow works end to end. |
| D6 | **Implement error boundaries:** Phase 2 failures (any non-success result including HTTP 400/500) show persistent inline error block replacing the evaluation result card. HTTP 200 sanitizer/llm_format_error: show structured message + `Retry` button (sets `evaluationError = null`, restores `phase = 'quiz_ready'`, preserves reply text). HTTP 400: show structured message + `Dismiss` button only (no Retry, developer must edit input). HTTP 500/timeout: show structured message + `Retry` button. | `src/app/playground/page.tsx` | All three error cases render correctly. Retry preserves reply text. |
| D7 | **Implement Pipeline Total HUD and Reset:** Add `Reset Pipeline` button in HUD: resets all state to `idle`, clears dropdown to default. Pipeline Total counter: sums Phase 1 + Phase 2 tokens. Shows spinner when `isGenerating` or `isEvaluating`. | `src/app/playground/page.tsx` | Reset returns UI to pristine idle state. Pipeline total shows correct sum. |

## ⏪ Rollback Strategy

* **Trigger:** (1) `npm run test:run` shows any new failures after any Task Group. (2) TypeScript compilation fails. (3) The Phase 1 playground route returns a different response shape than `{ quiz, tokens: { input, output, total } }` in integration testing.
* **Action:**
  - For Task Group A/B/C failures: Revert `src/schema/quiz.ts`, `route.ts` changes, and evaluate route. The existing playground Phase 1 UI still works as-is.
  - For Task Group D failures: The UI is additive — revert only `page.tsx` changes. Phase 1 and evaluate routes remain deployed.
  - Do NOT merge any Task Group until `npm run test:run` is fully green.
