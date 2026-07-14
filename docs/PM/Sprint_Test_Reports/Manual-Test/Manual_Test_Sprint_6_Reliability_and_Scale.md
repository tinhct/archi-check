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
- [ ] Node.js v18+ is installed.
- [ ] A local Upstash Redis instance is running, or the mock Redis adapter is active in `.env.local`.
- [ ] Slack Webhook URL configured in `.env.local` to receive notifications.
- [ ] A terminal window is open at the root of the `archi-check` directory.
- [ ] Next.js development server is compiled or ready for dev execution:
  - Run `npm run build` to verify production environment boundaries and build artifacts.

---

## Track-by-Track Execution Scripts

### Test Flow 1: Strict Boot Validation (AC-ST-601)

* **Description:** Verifying that the application validates critical secrets and normalizes key formatting during startup.

| Step | Action (Terminal/UI Input) | Expected System Response | Actual Result (Pass/Fail) |
|------|----------------------------|--------------------------|---------------------------|
| 1.   | Run in terminal:<br>`NODE_ENV=production GITHUB_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----single-line-payload-----END PRIVATE KEY-----" npm run start` | Application boot halts immediately with message:<br>`❌ [ArchiCheck] Environment validation failed during boot:`<br>`  - GITHUB_PRIVATE_KEY: Invalid RSA private key structure: Must contain multiple lines` | |
| 2.   | Run in terminal:<br>`NODE_ENV=production GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nMIICXAIBAAKBgQ...\n-----END RSA PRIVATE KEY-----" npm run start` | Parser transforms `\n` to real newlines, environment variables compile, and the production server boots successfully. | |

### Test Flow 2: Pre-LLM Deterministic Validation (AC-ST-603)

* **Description:** Verifying that gibberish or spam comments are immediately filtered out before hitting LLM endpoints.

| Step | Action (Terminal/UI Input) | Expected System Response | Actual Result (Pass/Fail) |
|------|----------------------------|--------------------------|---------------------------|
| 1.   | Send a POST request to `/api/webhook` with headers:<br>`x-github-event: issue_comment`<br>Body containing a comment with keyboard mashing:<br>`"body": "aaaaabbbbbcccccdddddeeeee"` | Returns `200 OK` with JSON:<br>`{ "message": "Reply rejected by deterministic validation guardrails" }`<br>No background LLM validation is scheduled. | |
| 2.   | Send a POST request to `/api/playground/evaluate` with body:<br>`{ "diff": "+const x = 1;", "quizJson": [...], "reply": "aaaaabbbbbcccccdddddeeeee" }` | Returns `200 OK` with status payload:<br>`{ "reason": "sanitizer_rejection", "passed": false, "score": null, "reasoning": "Reply rejected by validation guardrails: Repetitive character pattern detected.", "tokens": { "input": 0, "output": 0, "total": 0 } }` | |

### Test Flow 3: Token Burn Telemetry & Budgeting (AC-ST-302)

* **Description:** Verifying that token spending aggregates correctly and dispatches a Slack webhook alert when limits are exceeded.

| Step | Action (Terminal/UI Input) | Expected System Response | Actual Result (Pass/Fail) |
|------|----------------------------|--------------------------|---------------------------|
| 1.   | Configure `.env.local` with:<br>`SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..."`<br>`TELEMETRY_BUDGET_LIMIT="0.01"`<br>Trigger an answers evaluation. | System aggregates token costs in Redis, cost exceeds threshold limit, and dispatches Slack alert warning message. Sets `alert_sent` lock key. | |
| 2.   | Immediately trigger a second evaluation. | Costs increment in Redis under `input_tokens`/`output_tokens`, but Slack webhook call is skipped because the `alert_sent` Redis key is active. | |

### Test Flow 4: Async Task Queue Graceful Fallback (AC-ST-602)

* **Description:** Verifying that background tasks continue running asynchronously on standard containers and drain cleanly on shutdown.

| Step | Action (Terminal/UI Input) | Expected System Response | Actual Result (Pass/Fail) |
|------|----------------------------|--------------------------|---------------------------|
| 1.   | Execute webhook event route (without Edge runtime `waitUntil` context). | Returns HTTP `202` immediately. Validation processing proceeds asynchronously in-memory. | |
| 2.   | Send termination command in another shell:<br>`kill -SIGTERM <node_process_id>` | Server intercepts `SIGTERM` and prints:<br>`[ArchiCheck] Received SIGTERM. Draining background task queue...`<br>Blocks process exit until active promises resolve, then prints:<br>`[ArchiCheck] All background tasks successfully drained.` | |

### Test Flow 5: Declarative Onboarding & Cohort Configuration (AC-ST-301)

* **Description:** Verifying that pilot onboarding cohort override rules are applied dynamically based on the PR author login.

| Step | Action (Terminal/UI Input) | Expected System Response | Actual Result (Pass/Fail) |
|------|----------------------------|--------------------------|---------------------------|
| 1.   | Send PR webhook payload where `pull_request.user.login` is `external-contractor`. | Evaluation proceeds using default configuration limits (`complexity_threshold = 5`). | |
| 2.   | Send PR webhook payload where `pull_request.user.login` is `frontend-dev-1` (registered in `config/cohorts.yaml`). | Overrides merge dynamically: gating checks are run using overridden threshold (`complexity_threshold = 3`) and custom path filters. | |

---

## ⏪ Rollback Strategy

* **Trigger:** Outages or configuration issues across any of the Sprint 6 components.
* **Action:** Revert to previous release build tags. Cleanly remove `config/cohorts.yaml` to reset cohort behaviors.
