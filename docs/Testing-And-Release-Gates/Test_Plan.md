# Current Phase/Release Test Plan

**Last Updated:** 2026-07-09

**Target Release Version:** v1.0.0-alpha

## 📦 Scope of Testing

*   **In-Scope for this Release:**
    *   **Epic-01: Diff Scorer & Security Sanitizer** (parsing logic, regex lookbehinds, ReDoS watchdogs, LLM provider timeout retries).
    *   **Epic-02: Interrogation Gate & Bypass** (synchronous pending checks, author verification rules, blockquote comment parser, slash command roles).
    *   **Epic-04: Repository Customization & DX** (local mock LLM service, `.archicheck.yml` configuration parser, file size limiters).
    *   **Defensive Prompt-Injection Controls** (regex XML tag sanitizations and defensive instructions).
*   **Out-of-Scope:**
    *   **Epic-03: Staging Polish & Telemetry** (cohort configurations and token usage alert integrations are deferred to subsequent sprints).

## 🧪 Testing Types Execution Plan

### 1. Smoke Testing Plan
*   **Scope**: Verify that the main API endpoint `/api/webhook` starts and resolves timing-safe checks without runtime errors.
*   **Execution**: Automated run on Vercel preview deployment.

### 2. Functional Testing Plan
*   **Scope**: Validate story behaviors against AC (Heuristics, Secret Scrubber, LLM retries, Author validation, and Admin bypass).
*   **Execution**: Automated Vitest run matching the Traceability Matrix stories below.

### 3. Regression Testing Plan
*   **Scope**: Run the full 32-test suite on all modified paths to ensure zero regression on Edge context configurations or mock handlers.
*   **Execution**: CI pipeline gate check (GitGaurdian + Vitest coverage gates >90%).

### 4. End-to-End (E2E) Testing Plan
*   **Scope**: Simulates the gated developer workflow chronology (PR Opened -> LOCKED -> reviewer reject -> author justification -> approved success -> admin bypass override).
*   **Execution**: Integrated inside `npm run test:run` to co-execute concurrently and block releases on any failure.

### 5. Performance Testing Plan
*   **Scope**: Validate latencies for timing-safe checks (<200ms) and Redis operations (<1000ms).
*   **Execution**: Integration tests trace timing logs.

### 5. Stress Testing Plan
*   **Scope**: Inject simulated Upstash connection failures and Gemini 429 rate limit errors.
*   **Execution**: Verify that LLM and Redis fail-open logic immediately unblocks status gates.

### 6. Penetration Testing Plan
*   **Scope**: Red-team tag escape vectors (injecting `</answers>` into comments) and unauthorized bypasses (write/read role command injections).
*   **Execution**: Run prompt-injection and permission-check unit tests.

### 7. Install / Upgrade / Rollback Plan
*   **Scope**: Clean install audits and SHA checkout rollbacks.
*   **Execution**: Build checks on GitHub Actions runner.

---

## 🔗 Traceability & Execution Matrix

| Story ID | Feature / Component | Test Type | Execution Status | Pass/Fail | Linked Defect ID | Date Logged / Updated |
|----------|---------------------|-----------|------------------|-----------|------------------|-----------------------|
| **AC-ST-101** | Diff Complexity Scoring | Unit | Run | Pass | None | 2026-07-06 |
| **AC-ST-102** | Payload Sanitization & ReDoS Shield | Unit | Run | Pass | BUG-01 (ReDoS Regex timeout) | 2026-07-06 |
| **AC-ST-103** | Resilient LLM Connection | Unit | Run | Pass | None | 2026-07-06 |
| **AC-ST-104** | LLM Contract Testing & Resiliency | Unit / Contract | Run | Pass | None | 2026-07-08 |
| **AC-ST-201** | Synchronous Gate Lock & Markdown UI | Integration | Run | Pass | BUG-02 (WaitUntil mock) | 2026-07-07 |
| **AC-ST-202** | Author Answer Validation | Integration | Run | Pass | None | 2026-07-07 |
| **AC-ST-203** | Break-Glass Slash Command | Integration | Run | Pass | BUG-03 (Bypass status check context) | 2026-07-07 |
| **AC-ST-401** | Local Mock LLM Service | Integration / Unit | Run | Pass | None | 2026-07-09 |
| **AC-ST-402** | Robust .archicheck.yml Parser | Integration / Unit | Run | Pass | None | 2026-07-09 |
| **AC-ST-403** | Local Mock LLM Sandbox | Unit / Integration | Run | Pass | None | 2026-07-09 |

## 🚨 Risk-Based Testing Priorities

*   **Catastrophic backtracking (ReDoS)**: Mitigated by truncating lines >500 characters and running RegExp evaluations inside a 500ms CPU watcher wrapper.
*   **Auto-merge bot race conditions**: Mitigated by setting status checks to `Pending` synchronously inside the HTTP POST router handler before returning `202 Accepted`.
*   **Indirect Prompt Injection**: Mitigated by XML tag-escaping regex substitutions (`sanitizePromptInput`) and defensive instruction configurations.

## 📝 Release Sign-Off

*   **QA Persona Approval:** Approved
*   **Date of Sign-Off:** 2026-07-08
*   **Release Notes Link:** [Release Notes / Sprint Report 3](../PM/Sprint_Reports/Sprint_3.md)
