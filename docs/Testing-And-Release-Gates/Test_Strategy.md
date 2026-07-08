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

## 🧪 Testing Methodologies & Strategy

### 1. Smoke Testing
*   **Objective**: Verify system sanity and critical API pathways upon every commit/deployment.
*   **Strategy**: Run light sanity suites confirming that:
    1. The Edge API route initializes without compile errors.
    2. Webhook signature HMAC timers execute.
    3. Basic state storage connections ping successfully.
*   **Automation**: Triggered on every pull request push to staging or production.

### 2. Functional Testing
*   **Objective**: Validate that every User Story matches its defined Acceptance Criteria (AC).
*   **Strategy**: Create targeted unit and integration test specs matching:
    1. Heuristics gating scores (e.g. AC-ST-101).
    2. Payload scrubbing and looksbehinds (e.g. AC-ST-102).
    3. User comment reply parsing and PR author validation rules (e.g. AC-ST-202).
*   **Tooling**: Vitest assertion suites mapping story expectations.

### 3. Regression Testing
*   **Objective**: Ensure that new features or bug fixes do not break existing code.
*   **Strategy**: Run the entire workspace test suite before any merge. Focus on historical bugs (e.g., `waitUntil` mocks and Octokit stubs). Enforce a minimum **90% code coverage** limit in CI checks.
*   **Tooling**: Vitest code coverage reports (`c8`/`istanbul` providers).

### 4. End-to-End (E2E) Testing
*   **Objective**: Validate chronological, stateful multi-system workflows and data transitions.
*   **Strategy**: Simulate the complete user journey in a stateful mock pipeline (PR opened -> locked -> reviewer reject -> author validation -> bypass override -> fail-opens).
*   **Co-execution Policy**: MUST execute concurrently and alongside functional and regression testing under `npm run test:run` in all CI/CD pipelines. Any E2E failure blocks the merge release gate.
*   **Tooling**: E2E simulation runner (`simulation.test.ts`).

### 5. Performance Testing
*   **Objective**: Ensure Edge execution latencies remain below SLA targets.
*   **Strategy**: Measure response latency for:
    1. Signature checks (Target SLA: <200ms).
    2. Redis database reads/writes (Target SLA: <1000ms).
    3. Webhook entry response (Target SLA: <1000ms).
*   **Tooling**: Console timing log analysis and serverless execution traces.

### 5. Stress Testing
*   **Objective**: Validate gateway stability under high concurrent loads and rate limits.
*   **Strategy**: Simulate concurrent webhook loads (up to 500 requests/sec). Ensure that rate limits (Gemini 429) and timeouts trigger the fail-open circuit breakers gracefully, unblocking status gates.
*   **Tooling**: Mock API stress simulation scripts.

### 6. Penetration & Security Testing
*   **Objective**: Audit the system for injection, bypass, and authentication vulnerabilities.
*   **Strategy**:
    1. Webhook Signature Spoofing: Attempt POST requests without valid timing-safe HMACs.
    2. Privilege Escalation: Issue `/archicheck bypass` from unauthorized write/read roles.
    3. Prompt Injection: Submit XML tag-escaping inputs (`</answers>`) to hijack evaluations.
*   **Tooling**: Custom red-team test specs and GitGuardian scanning.

### 7. Install / Upgrade / Rollback Testing
*   **Objective**: Ensure seamless deployment migrations and safety rollbacks.
*   **Strategy**:
    1. Install: Verify clean repository setup and package locks.
    2. Upgrade: Ensure new Edge build function deployments auto-migrate old Redis caches.
    3. Rollback: Confirm git checkouts to older SHAs revert checks safely.

---

## 🛑 Production Release Gates (Go/No-Go Criteria)

To cut a release, the following conditions MUST be met:
1. [ ] 100% of high-priority User Stories (Backlog Epics 01 & 02) are marked 'Done'.
2. [ ] Zero 'Critical' or 'High' items in the Master Vulnerability Register.
3. [ ] Zero 'Open' defects in the Defect Log.
4. [ ] All E2E Integration flows (`simulation.test.ts` steps) pass successfully.
5. [ ] Performance SLA metrics validated (Vercel Edge entry <500ms, Redis operations <1,000ms, LLM timeout <15s).
