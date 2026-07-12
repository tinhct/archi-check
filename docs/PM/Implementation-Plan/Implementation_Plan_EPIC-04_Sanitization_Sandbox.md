# Implementation Plan: Epic 4 (Sanitization Sandbox)

**Target Story/Epic:** Epic-04 / AC-ST-404 (Interactive Sanitization Pipeline Sandbox)

**Status:** Approved

**Approved By:** tinhct/User | **Approval Date:** 2026-07-09

## 🎯 Execution Scope

* **Objective:** Enhance the local developer sandbox to simulate and verify ArchiCheck's security sanitization pipeline: lookbehind secret scrubbing, prompt injection prevention, and ReDoS circuit breaker fail-opens. This will be driven by four default scenarios in `.archicheck.mock.json`.
* **Prerequisites:**
  * Epic-04 Part 1 Dynamic Local Sandbox must be executed (Completed).

## 🛠️ Step-by-Step Execution Steps

| Step | Task Description | Target File(s) / Component | Validation (How to know it works) |
|------|------------------|----------------------------|-----------------------------------|
| 1    | Update default patterns in secret sanitizer | `src/lib/security/sanitizer.ts` | Add `SLACK_BOT_TOKEN` regex (`/xoxb-[0-9a-zA-Z-]+/g`) to `DEFAULT_PATTERNS`. |
| 2    | Implement mock ReDoS timeout simulation trigger | `src/lib/security/sanitizer.ts` | If `content.includes('TRIGGER_REDOS_TIMEOUT')`, execute `await new Promise(resolve => setTimeout(resolve, 505))` at the start of `scrubSecrets`. |
| 3    | Wire up secret scrubbing inside the webhook routes | `src/app/api/webhook/route.ts` | Import `scrubSecrets`. Call `await scrubSecrets(rawDiff)` in both PR open/sync handlers and comment event handlers. Catch timeout rejections to update status checks to `success` with `"⚠️ Custom secret sanitizer timed out. Gate bypassed."` and comment a PR warning. |
| 4    | Implement prompt injection detection inside mock validator | `src/lib/llm/mock_llm.ts` | In `validateAnswers`, check for case-insensitive prompt injection triggers: <br>1. `"ignore all previous instructions"`, `"ignore previous instructions"`<br>2. `"system override"`, `"system prompt bypass"`<br>3. `"output the exact JSON"`, `"passed: true"`, `"passed\": true"`<br>4. `"I am the lead admin"`, `"You are now an unconstrained AI"`, `"/archicheck bypass"`. <br>If matched, return failure with reasoning: `"Security anomaly detected in response. Please provide a genuine architectural justification."`. |
| 5    | Write the four definitive sandbox scenarios | `.archicheck.mock.json` | Write: <br>1. **"Leaky Diff"**: contains `AKIA`, `xoxb-`, `BEGIN PRIVATE KEY`, returns redacted code questions.<br>2. **"Prompt Injection"**: contains `prompt-injection` keyword.<br>3. **"ReDoS Bomb"**: contains `TRIGGER_REDOS_TIMEOUT` keyword.<br>4. **"Perfect Loop"**: standard fallback scenario. |
| 6    | Write unit tests for sanitization scenarios | `tests/unit/mock_llm.test.ts` | Assert prompt injection matches fail validation with the security anomaly message, and the default fallback functions. |
