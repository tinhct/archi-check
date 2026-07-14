# Implementation Plan: Token Burn Telemetry Alerting

**Target Story/Epic:** AC-ST-302 / Epic-03

**Status:** Approved

**Approved By:** Product Owner | **Approval Date:** 2026-07-14

## 🔎 Retrospective Scan — Historical Mitigations Applied

* **Redis Write Latency (Sprint 4):** Real-time database calls executed synchronously inside the request path delay client response times, causing webhook timeouts.
  * **Mitigation:** We isolate all telemetry writes and budget aggregation calls inside asynchronous background processes (`waitUntil` on Edge or fallback asyncTracker task streams on Node), keeping HTTP response latencies under 200ms.

## 🎯 Execution Scope

* **Objective:** Track cumulative LLM token consumption in Upstash Redis and push a notification to a Slack webhook when the calculated cost exceeds the monthly configured threshold.
* **Prerequisites:**
  - `SLACK_WEBHOOK_URL` environment variable.
  - `TELEMETRY_BUDGET_LIMIT` environment variable.

## 🛠️ Step-by-Step Execution Steps

### 🟡 Task Group A: Env Configs & Cost Aggregator

| Step | Task Description | Target File(s) / Component | Validation (How to know it works) |
|------|------------------|----------------------------|-----------------------------------|
| A1 | **Update env schema:** Add `TELEMETRY_BUDGET_LIMIT` (default `'200'`, parses to integer) and `SLACK_WEBHOOK_URL` (optional Zod string, validating URL structure if present) to `src/config/env.ts`. | `src/config/env.ts` | Server boots and parses the variables successfully. |
| A2 | **Create budget check utility:** Create `src/lib/telemetry/budgetAlert.ts` exporting `checkTokenBudget(tokens: TokenCounts): Promise<void>`. Inside this function: (1) Call `redis.incrby('archicheck:telemetry:input_tokens', tokens.input)`. (2) Call `redis.incrby('archicheck:telemetry:output_tokens', tokens.output)`. (3) Read new totals, calculate dollar cost: `(input * 0.075 / 1000000) + (output * 0.30 / 1000000)`. (4) Compare cost against `env.TELEMETRY_BUDGET_LIMIT`. (5) Check if alert was already sent by reading `redis.get('archicheck:telemetry:alert_sent')`. (6) If cost exceeds limit and no alert has been sent, POST alert JSON payload to `env.SLACK_WEBHOOK_URL` and write `'true'` to `archicheck:telemetry:alert_sent` (TTL: 24h). | `src/lib/telemetry/budgetAlert.ts` (NEW) | Code compiles and handles exceptions without throwing crashes. |

### 🟡 Task Group B: Execution & Integration

| Step | Task Description | Target File(s) / Component | Validation (How to know it works) |
|------|------------------|----------------------------|-----------------------------------|
| B1 | **Integrate in Webhook Route:** In `src/app/api/webhook/route.ts`, extract the token counts returned from `validateAnswers` and call `checkTokenBudget()` inside the background task context (`waitUntil`). | `src/app/api/webhook/route.ts` | The API responds with `202 Accepted` synchronously, processing telemetry in the background. |
| B2 | **Integrate in Evaluate Route:** In `src/app/api/playground/evaluate/route.ts`, after calling `validateAnswers`, execute `checkTokenBudget()` in a non-blocking floating promise (or custom async tracker queue). | `src/app/api/playground/evaluate/route.ts` | Playground evaluate response completes synchronously without waiting for the database write. |

### 🟡 Task Group C: QA Validation

| Step | Task Description | Target File(s) / Component | Validation (How to know it works) |
|------|------------------|----------------------------|-----------------------------------|
| C1 | **Write unit tests for budget checker:** Create `tests/unit/budgetAlert.test.ts`. Mock `redis` commands. Assert: (1) Cost calculation logic matches pricing schema. (2) Limit check triggers if threshold is breached. (3) Warning alert is dispatched via HTTP POST. (4) Alert is debounced (not sent if `alert_sent` cache key is present). | `tests/unit/budgetAlert.test.ts` (NEW) | `npm run test:run` passes. |
| C2 | **Verify regression tests:** Run full Vitest test suite. | Test runner | All 146+ tests are green. |

## ⏪ Rollback Strategy

* **Trigger:** Excessive Redis latency or webhook failures during telemetry updates.
* **Action:** Remove the `checkTokenBudget()` invocation from the webhook route handlers or set `SLACK_WEBHOOK_URL` to empty.
