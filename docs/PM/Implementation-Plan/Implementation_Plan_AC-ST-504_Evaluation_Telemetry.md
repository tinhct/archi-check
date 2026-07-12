# Implementation Plan: Isolate & Surface LLM Evaluation Telemetry

**Target Story/Epic:** AC-ST-504 / Epic-05

**Status:** Approved

**Approved By:** Engineering Lead | **Approval Date:** 2026-07-12

## 🔎 Retrospective Scan — Historical Mitigations Applied

| Past Lesson | Source Sprint | Mitigation in This Plan |
|-------------|---------------|-------------------------|
| Mocking `gitHubAuthService` requires stubbing both `.rest` and `.request` methods | Sprint 3 | AC-5 (Shadow Mode verification) explicitly requires running the full simulation test against the updated code, not just unit-level mocks. |
| Test assertions on return values must be updated atomically with source changes | Sprint 4 | AC-6 mandates CI-green status before merge. PR template will checklist all affected test files. |

## 🟎️ Execution Scope

* **Objective:** Formally verify `validateAnswers` in `src/lib/llm/provider.ts` contains zero Redis/Octokit side effects, then update its return type to surface per-direction token counts (`input`, `output`, `total`). This unlocks the playground evaluate endpoint (AC-ST-501-P2) which depends on token counts for the receipt display UX.
* **Prerequisites:**
  - No upstream blockers. This story has no dependencies.
  - DEP-10: This story is itself the blocker for AC-ST-501-P2 Task 5.1.2.

## 🛠️ Step-by-Step Execution Steps

| Step | Task Description | Target File(s) / Component | Validation (How to know it works) |
|------|------------------|----------------------------|-----------------------------------|
| 1 | **Purity Audit:** Read `src/lib/llm/provider.ts` `validateAnswers` method and `src/app/api/webhook/route.ts` in full. Confirm no `redis.*`, `octokit.*`, `createCommitStatus`, or `createComment` calls exist inside `validateAnswers`. Write the confirmation statement in the PR description. | `src/lib/llm/provider.ts`, `src/app/api/webhook/route.ts` | PR description contains explicit purity confirmation statement. |
| 2 | **Update `EvaluationResult` type:** Add `tokens: { input: number; output: number; total: number }` field to the `EvaluationResult` interface in `src/types/archicheck.ts`. | `src/types/archicheck.ts` | TypeScript compiler (`npx tsc --noEmit`) passes with no errors after change. |
| 3 | **Thread token counts through `callGeminiDeveloper`:** Update the private method to return `{ text: string, tokens: { input, output, total } }` instead of just `string`. Map `tokenUsage.promptTokenCount` → `input`, `tokenUsage.candidatesTokenCount` → `output`. | `src/lib/llm/provider.ts` | Existing Gemini Developer telemetry log still fires. Method signature change compiles cleanly. |
| 4 | **Thread token counts through `callVertexAI`:** Same as Step 3 for the Vertex AI code path. | `src/lib/llm/provider.ts` | Same as Step 3. |
| 5 | **Thread token counts through `callClaude`:** Map `tokenUsage.input_tokens` → `input`, `tokenUsage.output_tokens` → `output`. | `src/lib/llm/provider.ts` | Same as Step 3. |
| 6 | **Update `callLLM` private method:** Change return type from `Promise<string>` to `Promise<{ text: string; tokens: { input: number; output: number; total: number } }>`. Update `executeWithRetry` call-site accordingly. | `src/lib/llm/provider.ts` | `npx tsc --noEmit` passes. |
| 7 | **Update `validateAnswers` return:** Parse `jsonResponse.text`, compute `passed = result.passed`, apply `passingThreshold: 7` constant. Return `{ passed, score: result.score, reasoning: result.reasoning, passingThreshold: 7, tokens: jsonResponse.tokens }`. Update fail-open return to include `tokens: { input: 0, output: 0, total: 0 }`. | `src/lib/llm/provider.ts` | Unit tests still pass after update. |
| 8 | **Update `generateQuiz` return (if affected):** If `generateQuiz` also routes through `callLLM`, update its return or add a separate code path to avoid changing `QuizPayload` type. `generateQuiz` return type should NOT include tokens — tokens for quiz gen will be handled in Phase 1 route update (AC-ST-501-P2 Task 5.1.1b). | `src/lib/llm/provider.ts` | `QuizPayload` type is unchanged. `generateQuiz` compiles cleanly. |
| 9 | **Update webhook route call-site:** Destructure the new return value of `validateAnswers` but discard `tokens` field in the webhook route (it is not used there). Ensure TypeScript accepts this silently. | `src/app/api/webhook/route.ts` | `npx tsc --noEmit` passes. Webhook integration tests still pass. |
| 10 | **Update unit tests:** Update `tests/unit/provider.test.ts` fail-open test assertions to expect `tokens: { input: 0, output: 0, total: 0 }` in the returned object from the circuit-breaker path. | `tests/unit/provider.test.ts` | `npm run test:run` shows green for provider.test.ts. |
| 11 | **Verify Shadow Mode:** Run `tests/integration/simulation.test.ts` with `ARCHICHECK_MODE=shadow`. Confirm `logIntercepted` still fires for `createComment` and `createCommitStatus` (i.e., the Octokit interceptor in `auth.ts` still correctly wraps these at the client level). | All integration tests | Shadow Mode test assertions pass. |
| 12 | **Final CI gate:** Run full test suite `npm run test:run`. All 85+ tests must be green. | All test files | Zero test failures. |

## ⏪ Rollback Strategy

* **Trigger:** Any test in the suite fails after Step 10 or Step 11, OR TypeScript compilation fails after Step 6.
* **Action:** `git revert` the entire PR before merge. The dual-approval requirement means no partial merges are possible. Re-open the story with a revised approach to threading token counts.
