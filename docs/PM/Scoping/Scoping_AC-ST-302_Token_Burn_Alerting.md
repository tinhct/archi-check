# Scoping Document: Token Burn Telemetry Alerting

**Reference:** AC-ST-302 (Sprint 6)

**Status:** Approved (Approach A)

**Last Updated:** 2026-07-14

## 1. Problem

Currently, ArchiCheck tracks LLM token usage telemetry dynamically. However, there is no active monitoring or alert system to notify project owners or system administrators when token consumption approaches monthly budget limits. A malfunctioning webhook, infinite bot reply loops, or a high volume of large PRs can deplete staging/production token budgets rapidly without warning, incurring high cloud costs.

## 2. Constraints

* **Architecture/Code:** Alerting thresholds must be configurable, and telemetry aggregation must not impact webhook execution latencies.
* **Dependencies:** Must utilize the existing Upstash Redis database structure to track token aggregates, avoiding external analytics databases.
* **Security/Performance:** Sending alerts (via Slack or email) must be non-blocking and execution-isolated to prevent latency overhead on webhook responses.
* **Team Conventions:** Webhook responses must remain timing-safe, and alerts must be debounced to prevent spamming notification channels.

## 3. Success Criteria

* **Automatic Alert Trigger:** An alert is successfully sent to the configured endpoint (Slack Webhook or email) when cumulative token consumption exceeds configured thresholds (e.g. $200 budget limit).
* **Non-Blocking Telemetry:** Alerting actions are processed asynchronously in background tasks, keeping webhook response times under 200ms.
* **Alert Debouncing:** The system ensures that only one alert is sent per threshold breach, preventing message storms during concurrent PR runs.

## 4. Candidate Approaches

* **Approach A: Mid-Route Real-Time Aggregator** — Aggregate token counts in Redis at the end of each evaluation. If the new sum exceeds the warning threshold, trigger a background task to push a Slack webhook payload asynchronously.
  * *Trade-off:* Real-time, instant notifications when a threshold is breached, but adds minor write/check overhead to Redis on each evaluation.
* **Approach B: Scheduled Cron Evaluator** — Set up a Vercel cron job (or next-cron task) that runs once per day/hour. It queries the cumulative Redis tokens, performs budget math, and sends an alert if needed.
  * *Trade-off:* Zero impact on live webhook execution routes, but alerts are delayed (not real-time) and requires configuring cron triggers.
* **Approach C: External Logs Monitoring** — Stream Next.js application logs to a third-party observability platform (like Axiom or Datadog) and configure metric alarms there.
  * *Trade-off:* Offloads all alerting logic from the codebase, but increases infrastructure dependencies and requires third-party accounts/configs.

## 5. Open Questions & Assumptions

* **Assumption:** The target team uses Slack or Discord webhooks for developer operations alerting.
* **Question:** Should we implement hard gating (e.g. automatically setting commit status to Fail-Open and skipping LLM calls) if the budget cap is breached? (Recommended: Staged alerts — warning alert at 80% budget, hard gate bypass at 100% budget to protect token wallets).
