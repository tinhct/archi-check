# Implementation Plan: Dynamic Gemini Model Version Configuration

**Target Story/Epic:** AC-ST-701

**Status:** Approved

**Approved By:** PM | **Approval Date:** 2026-07-28

## 🔎 Retrospective Scan — Historical Mitigations Applied

| Past Lesson | Source Sprint | Mitigation in This Plan |
|-------------|---------------|-------------------------|
| Environment variables leaked across test blocks in Vitest because the suite lacked cleanup hooks for global variables | Sprint 6 | Step 4 and Step 5 require explicit `beforeEach` and `afterEach` hooks to save and restore environment variables, protecting tests from cross-suite leakage. |
| Edge runtime Warns on node libraries | Sprint 5 | `src/config/env.ts` handles Node runtime environment variable validation only; mock fallbacks are safe. |

## 🎯 Execution Scope

* **Objective:** Remove hardcoded references to `'gemini-2.5-flash'` inside the LLM provider service (`src/lib/llm/provider.ts`) and expose a new Zod-validated environment config variable `GEMINI_MODEL_VERSION` inside `src/config/env.ts` (defaulting to `'gemini-2.5-flash'`), ensuring backward compatibility, zero-config sandbox out of the box, and full test suite passing.
* **Prerequisites:** None.

## 🛠️ Step-by-Step Execution Steps

| Step | Task Description | Target File(s) / Component | Validation (How to know it works) |
|------|------------------|----------------------------|-----------------------------------|
| 1    | **Add env Zod Schema property:** Extend the `envSchema` object in `src/config/env.ts` to include `GEMINI_MODEL_VERSION: z.string().default('gemini-2.5-flash')`. | `src/config/env.ts` | Zod parses and accepts the schema. |
| 2    | **Add Dev/Build Fallback key:** Inside the `catch` block of `src/config/env.ts`, add the property mapping `GEMINI_MODEL_VERSION: process.env.GEMINI_MODEL_VERSION || 'gemini-2.5-flash'`. | `src/config/env.ts` | Local development starts without error when the key is missing in `.env.local`. |
| 3    | **Expose helper in LLM Provider:** Inside `src/lib/llm/provider.ts`, replace the hardcoded strings `'gemini-2.5-flash'` with `env.GEMINI_MODEL_VERSION` (or defined default helper fallback). | `src/lib/llm/provider.ts` | The code compiles cleanly via `npx tsc --noEmit`. |
| 4    | **Update Environment Unit Tests:** Add test cases in `tests/unit/env.test.ts` to assert that `GEMINI_MODEL_VERSION` parses standard values correctly and defaults to `'gemini-2.5-flash'` when undefined. Implement `beforeEach`/`afterEach` blocks to backup and restore `process.env.GEMINI_MODEL_VERSION`. | `tests/unit/env.test.ts` | Run `npx vitest tests/unit/env.test.ts` and confirm all tests are green. |
| 5    | **Update Provider Unit Tests:** Add a test in `tests/unit/provider.test.ts` to verify the provider instantiates the GoogleGenerativeAI and VertexAI model engines with the customized `process.env.GEMINI_MODEL_VERSION` name. Ensure variables are cleaned up after runs. | `tests/unit/provider.test.ts` | Run `npx vitest tests/unit/provider.test.ts` and confirm all tests are green. |
| 6    | **Regression Validation:** Execute the complete linter and unit/integration test suites to ensure zero regressions across the codebase. | Entire repo | `npm run lint` and `npm test` are 100% green. |

## ⏪ Rollback Strategy

* **Trigger:** Any compilation error, boot check crash in production, or Vitest suite failures that cannot be resolved within 10 minutes.
* **Action:** Revert changes via git command:
  ```bash
  git checkout HEAD -- src/config/env.ts src/lib/llm/provider.ts tests/unit/env.test.ts tests/unit/provider.test.ts
  ```
