# Current Phase/Release Test Plan

**Last Updated:** 2026-07-08

**Target Release Version:** v1.0.0-alpha

## 📦 Scope of Testing

*   **In-Scope for this Release:**
    *   **Epic-01: Diff Scorer & Security Sanitizer** (parsing logic, regex lookbehinds, ReDoS watchdogs, LLM provider timeout retries).
    *   **Epic-02: Interrogation Gate & Bypass** (synchronous pending checks, author verification rules, blockquote comment parser, slash command roles).
*   **Out-of-Scope:**
    *   **Epic-03: Staging Polish & Telemetry** (cohort configurations and token usage alert integrations are deferred to subsequent sprints).

## 🔗 Traceability & Execution Matrix

| Story ID | Feature / Component | Test Type | Execution Status | Pass/Fail | Linked Defect ID |
|----------|---------------------|-----------|------------------|-----------|------------------|
| **AC-ST-101** | Diff Complexity Scoring | Unit | Run | Pass | None |
| **AC-ST-102** | Payload Sanitization & ReDoS Shield | Unit | Run | Pass | BUG-01 (ReDoS Regex timeout) |
| **AC-ST-103** | Resilient LLM Connection | Unit | Run | Pass | None |
| **AC-ST-201** | Synchronous Gate Lock & Markdown UI | Integration | Run | Pass | BUG-02 (WaitUntil mock) |
| **AC-ST-202** | Author Answer Validation | Integration | Run | Pass | None |
| **AC-ST-203** | Break-Glass Slash Command | Integration | Run | Pass | BUG-03 (Bypass status check context) |

## 🚨 Risk-Based Testing Priorities

*   **Catastrophic backtracking (ReDoS)**: Encountering malicious inputs containing exponential backslash iterations. Mitigated by truncating lines >500 characters and running RegExp evaluations inside a 500ms CPU watcher wrapper.
*   **Auto-merge bot race conditions**: PRs being merged before the webhook calculations complete. Mitigated by setting status checks to `Pending` synchronously inside the HTTP POST router handler before returning `202 Accepted`.
*   **Environment context hangs**: Next.js `waitUntil` blocks freezing Vitest runs. Mitigated by mocking Edge Promise scopes to await them explicitly in E2E simulations.

## 📝 Release Sign-Off

*   **QA Persona Approval:** Approved
*   **Date of Sign-Off:** 2026-07-08
*   **Release Notes Link:** [Release Notes / Sprint Report 3](../PM/Sprint_Reports/Sprint_3.md)
