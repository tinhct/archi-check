# Master Test Strategy & Release Gates

**Last Updated:** 2026-07-08

## 🎯 Testing Objectives & Scope

Our quality baseline guarantees that ArchiCheck functions autonomously and securely in the PR merge pipelines of enterprise teams. Key objectives include:
*   **Zero Critical Security Flaws**: Absolute block on hardcoded credentials or unauthenticated webhooks.
*   **High Unit Coverage**: Target unit test coverage exceeds 90% across analyzers and sanitizers.
*   **ReDoS Immunity**: Catastrophic backtracking regular expression loops are blocked via line-length limits and CPU watchdog abort timers.
*   **Pipeline Fail-Open Resiliency**: Outages or latency in Redis or LLM APIs must fail-open gracefully, ensuring developers are never blocked.

## 🏗️ Environments & Infrastructure

| Environment | URL / Host | Data Profile | Triggers |
|-------------|------------|--------------|----------|
| **Local/Dev** | `localhost:3000` | Mock Webhooks / Stub Redis | On Save / Git Pre-commit hooks |
| **Staging** | `https://staging-app.archicheck.com` | Sandboxed Diffs & Redis | GitHub PR merge to `main` |
| **Production** | `https://app.archicheck.com` | Live GitHub Webhook streams | Manual Release Tag deployment |

## 🛠️ Testing Pyramid & Tooling

*   **Unit Testing:** Vitest (Target Coverage: >90%) - tests core diff parsers, heuristics algorithms, blocklist file exclusions, and sanitizers.
*   **Integration Testing:** Vitest router simulations - mocks Next.js API requests to test HMAC TimingSafe signature checks and collaborator role gates.
*   **End-to-End (E2E):** Stateful simulation test runner (`simulation.test.ts`) - runs chronologically simulated gated user workflows (PR opened -> locked pending -> reviewer reject -> author justification -> approved success -> admin bypass override).
*   **AI/Security Checks:** GitGuardian scanner (ggshield) pre-commit/CI pipeline repository scanning + LLM-as-a-judge comparison tests.

## 🛑 Production Release Gates (Go/No-Go Criteria)

To cut a release, the following conditions MUST be met:
1. [ ] 100% of high-priority User Stories (Backlog Epics 01 & 02) are marked 'Done'.
2. [ ] Zero 'Critical' or 'High' items in the Master Vulnerability Register.
3. [ ] Zero 'Open' defects in the Sprint Defect Logs.
4. [ ] All E2E Integration flows (`simulation.test.ts` steps) pass successfully.
5. [ ] Performance SLA metrics validated (Vercel Edge entry <500ms, Redis operations <1,000ms, LLM timeout <15s).
