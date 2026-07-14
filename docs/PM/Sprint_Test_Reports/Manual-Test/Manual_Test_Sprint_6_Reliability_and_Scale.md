# Manual Test Plan: Sprint 6 - Production Reliability, Guardrails, and Scale

**Target Version:** Sprint 6 Build (v0.2.0) | **Execution Date:** 2026-07-14

**Tester / Developer:** tinhct/User

## 🎯 Testing Objective

To manually validate the reliability, scaling, onboarding, and telemetry guardrails implemented in Sprint 6:
1. **AC-ST-601**: Strict Environment Boot Validation (key format checks, newline normalizations).
2. **AC-ST-603**: Pre-LLM API Validation Guardrails (regex character repetition, variety, word length).
3. **AC-ST-302**: Token Burn Telemetry Budget Alerting (Slack webhook notifications, Redis debounces).
4. **AC-ST-602**: Edge Runtime `waitUntil` Async Queue Fallback (graceful in-memory tracking in standard containers).
5. **AC-ST-301**: YAML Cohort Configuration Overrides (complexity and path overrides based on author matching).

---

## 🏗️ Test Environment Setup (Local/Dev)

**Pre-requisites for Execution:**
* Node.js v18+ is installed.
* Local Upstash Redis instance or mock Redis adapter is configured.
* Terminal is open at the project root.

---

## Track-by-Track Execution Scripts

### Test Flow 1: Strict Boot Validation (AC-ST-601)

* **Description:** Verifying that the application validates critical secrets and normalizes key formatting during startup.

| Step | Action (Terminal/UI Input) | Expected System Response | Actual Result (Pass/Fail) |
|------|----------------------------|--------------------------|---------------------------|
| 1.   | Set `process.env.NODE_ENV = 'production'`, set `GITHUB_PRIVATE_KEY` with single-line PEM format, and trigger imports | Application logs validation failure, prints specific key error, and halts process via `process.exit(1)`. | |
| 2.   | Set `GITHUB_PRIVATE_KEY` with escaped `\n` characters (e.g. `-----BEGIN...\n...`) | Parser successfully normalizes escaped `\n` to real newlines, successfully passes boot validations, and imports cleanly. | |

### Test Flow 2: Pre-LLM Deterministic Validation (AC-ST-603)

* **Description:** Verifying that gibberish or spam comments are immediately filtered out before hitting LLM endpoints.

| Step | Action (Terminal/UI Input) | Expected System Response | Actual Result (Pass/Fail) |
|------|----------------------------|--------------------------|---------------------------|
| 1.   | Post a comment reply consisting of keyboard mashing (e.g., `aaaaabbbbbcccccddddd`) on the webhook route | Webhook route short-circuits, posts a PR comment explaining the rejection, and returns status 200 without LLM calling. | |
| 2.   | Submit similar mashing text (`aaaaabbbbbcccccddddd`) to playground evaluate API endpoint | Playground endpoint returns status 200 with payload `{ reason: 'sanitizer_rejection', passed: false, ... }` containing the details. | |

### Test Flow 3: Token Burn Telemetry & Budgeting (AC-ST-302)

* **Description:** Verifying that token spending aggregates correctly and dispatches a Slack webhook alert when limits are exceeded.

| Step | Action (Terminal/UI Input) | Expected System Response | Actual Result (Pass/Fail) |
|------|----------------------------|--------------------------|---------------------------|
| 1.   | Configure `SLACK_WEBHOOK_URL` and set `TELEMETRY_BUDGET_LIMIT` to `$0.01` (very low) | First LLM validation call aggregates token costs in Redis, exceeds limit, and dispatches a warning message to the Slack webhook channel. | |
| 2.   | Execute another LLM call immediately after the breach alert is dispatched | Cost increments in Redis, but Slack alert is debounced (not sent) due to active `alert_sent` Redis TTL lock key. | |

### Test Flow 4: Async Task Queue Graceful Fallback (AC-ST-602)

* **Description:** Verifying that background tasks continue running asynchronously on standard containers and drain cleanly on shutdown.

| Step | Action (Terminal/UI Input) | Expected System Response | Actual Result (Pass/Fail) |
|------|----------------------------|--------------------------|---------------------------|
| 1.   | Run webhook routes under Node.js runtime environments where Next.js `waitUntil` is unavailable | Background promises are registered in-memory and continue running asynchronously to completion without blocking responses. | |
| 2.   | Send `SIGTERM` or `SIGINT` signal to the active Node.js server process | Server intercepts signal, awaits and drains all active background tasks in-flight, logs completion, and gracefully shuts down. | |

### Test Flow 5: Declarative Onboarding & Cohort Configuration (AC-ST-301)

* **Description:** Verifying that pilot onboarding cohort override rules are applied dynamically based on the PR author login.

| Step | Action (Terminal/UI Input) | Expected System Response | Actual Result (Pass/Fail) |
|------|----------------------------|--------------------------|---------------------------|
| 1.   | Submit PR from developer login unregistered in `config/cohorts.yaml` | Webhook uses default configuration parameters (e.g., complexity score 5). | |
| 2.   | Submit PR from developer login registered under frontend-team (e.g., `frontend-dev-1`) | Webhook dynamically merges overrides: complexity score threshold shifts to 3, and front-end test/doc path filters are applied. | |

---

## ⏪ Rollback Strategy

* **Trigger:** Outages or configuration issues across any of the Sprint 6 components.
* **Action:** Revert to previous release build tags. Cleanly remove `config/cohorts.yaml` to reset cohort behaviors.
