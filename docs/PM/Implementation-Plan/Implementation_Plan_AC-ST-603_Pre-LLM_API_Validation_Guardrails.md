# Implementation Plan: Standardize Pre-LLM API Validation Guardrails (Deterministic Filtering)

**Target Story/Epic:** AC-ST-603 / Epic-02

**Status:** Approved

**Approved By:** Product Owner | **Approval Date:** 2026-07-14

## 🔎 Retrospective Scan — Historical Mitigations Applied

* **Rubber-Stamp Mock Bypass (Sprint 5):** The mock LLM allowed developers to bypass gates locally using random 20-character sequences because it lacked structural parsing and character entropy checks.
  * **Mitigation:** We implement a shared deterministic string validator (`validateCommentReply`) that checks word-spacing, character variety, consecutive repetition limits, and word lengths, standardizing these guardrails across webhook and playground API endpoints.

## 🎯 Execution Scope

* **Objective:** Implement a centralized TypeScript validator utility (`deterministicFilter.ts`) that runs lightweight checks on developer answers before any external LLM calls are made, short-circuiting spam/nonsense justifications early to protect token budgets.
* **Prerequisites:** None.

## 🛠️ Step-by-Step Execution Steps

### 🟡 Task Group A: Centralized Filter Utility

| Step | Task Description | Target File(s) / Component | Validation (How to know it works) |
|------|------------------|----------------------------|-----------------------------------|
| A1 | **Create `deterministicFilter.ts`:** Create a new file `src/lib/security/deterministicFilter.ts`. Export `validateCommentReply(reply: string): { valid: boolean; reason?: string }` containing: (1) Repetitive Letter Check matching `/([a-zA-Z0-9])\1{3,}/i` (excludes spaces/headers). (2) Word Spacing Check enforcing `words.length >= 3` if string length $\ge 20$. (3) Distinct Character Variety enforcing $\ge 6$ unique lowercase alphanumeric characters if length $\ge 20$. (4) Suspicious Word Length rejecting words $> 15$ chars unless they contain path separators (`/`, `.`, `_`) or lowercase-to-uppercase camelCase transitions (`/[a-z][A-Z]/`). | `src/lib/security/deterministicFilter.ts` (NEW) | Typecheck compiles cleanly. |
| A2 | **Export answer block parser:** Export `extractAnswers(concatenated: string): string[]` to parse individual answers from concatenated playground strings using regex: `/A\d+:\s+([\s\S]*?)(?=\n\nQ\d+:\|$)/g`. | `src/lib/security/deterministicFilter.ts` | Test strings partition correctly. |

### 🟡 Task Group B: API & Webhook Gating Integration

| Step | Task Description | Target File(s) / Component | Validation (How to know it works) |
|------|------------------|----------------------------|-----------------------------------|
| B1 | **Integrate into Webhook handler:** In `src/app/api/webhook/route.ts`, process the author's reply comment through `validateCommentReply` at comment entry. If `valid` is false, post a warning comment using `octokit.rest.issues.createComment` explaining the exact validation rule failed (e.g. repetition or too few words), keeping status locked, and return HTTP `200` without calling `validateAnswers`. | `src/app/api/webhook/route.ts` | Webhook comments containing `aaaa` or random letters get rejected automatically. |
| B2 | **Integrate into Playground evaluate route:** In `src/app/api/playground/evaluate/route.ts`, extract answers using `extractAnswers()` and run `validateCommentReply` on each answer block. If any block is invalid, return HTTP `200` with payload `{ reason: 'sanitizer_rejection', passed: false, score: null, reasoning: 'Rejected by pre-LLM validation: [reason]', passingThreshold: 7, tokens: { input: 0, output: 0, total: 0 } }`. | `src/app/api/playground/evaluate/route.ts` | Submitting `aaaa` in the playground UI shows a Sanitizer Blocked badge. |

### 🟡 Task Group C: QA Validation & Regression

| Step | Task Description | Target File(s) / Component | Validation (How to know it works) |
|------|------------------|----------------------------|-----------------------------------|
| C1 | **Write unit tests for validator:** Create `tests/unit/deterministicFilter.test.ts` testing: (1) Happy path (valid sentences in English/German/Vietnamese). (2) >3 character repetition failure. (3) Non-spaced blocks failure. (4) Missing unique character range failure. (5) Long gibberish words failure. (6) CamelCase class name passing. (7) Slash/dot path names passing. | `tests/unit/deterministicFilter.test.ts` (NEW) | `npm run test:run` passes. |
| C2 | **Write integration tests:** Update webhook integration tests and evaluate route tests to assert gibberish requests bypass LLM call and return proper rejection payloads/responses. | Webhook & evaluate tests | All integration tests green. |
| C3 | **Final Regression execution:** Run full Vitest regression testing suite. | Test runner | All 141+ tests pass. |

## ⏪ Rollback Strategy

* **Trigger:** Telemetry testing indicates valid camelCase structures or multi-language justifications are incorrectly blocked.
* **Action:** Revert changes to `route.ts` handlers and disable the filter execution path.
