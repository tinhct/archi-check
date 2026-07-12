# Scoping: Interactive Sanitization Pipeline Sandbox

**Target Epic:** Epic 4: Repository Customization & Developer DX (Phase 2)
**Status:** Under Review

---

## 1. 🎯 Problem
Open-source contributors and security auditors cannot locally verify or interactively step through ArchiCheck's core security pipelines—specifically lookbehind secret scrubbing, prompt injection shielding, and ReDoS watchdog circuit breakers. Without a dynamic sandbox visualization mechanism, developers have no clear visibility into how raw diff payloads are mutated, flagged, or aborted before reaching the LLM gating loop.

---

## 2. 🛡️ Constraints
* **Production Isolation**: All simulation triggers, custom log events, and sandbox execution blocks must be entirely inactive when `NODE_ENV === 'production'`.
* **Zero Dependency Cost**: The sandbox pipeline must leverage existing sanitizers and circuit breakers without introducing new third-party utility libs.
* **Stateless Flow Integrity**: Exposing intermediate pipeline stages (Raw Diff -> Sanitize -> Mock LLM) must not affect the stateless design of Next.js endpoint routes.

---

## 3. 🏁 Success Criteria
* **Definitive Scenarios**: `.archicheck.mock.json` contains four test scenarios: "Leaky Diff", "Prompt Injection", "ReDoS Bomb", and "Perfect Loop".
* **Pipeline Visualization**: The mock engine logs and outputs state transitions matching the security pipelines.
* **Observed Security Actions**: 
  * AWS keys trigger `secret_scrubbed` events and get redacted in the quiz payload.
  * Injection keywords fail validation with the warning: *"Security anomaly detected in response..."*.
  * ReDoS payloads abort execution and fail-open with: *"⚠️ Custom secret sanitizer timed out. Gate bypassed."*.

---

## 4. 🛠️ Candidate Approaches

* **Approach A: Config-Driven Sandbox Router (Extend `.archicheck.mock.json`)**
  * *Trade-off:* Centralizes the test scenarios in the existing mock configuration format, but requires adding logic to mock input sanitizers and mock timer triggers inside `mock_llm.ts`.
* **Approach B: Dedicated Sanitizer Middleware Wrapper**
  * *Trade-off:* Isolates sandbox simulation states in a wrapper around `sanitizer.ts`, keeping `mock_llm.ts` clean but adding overhead to the webhook routing logic.
* **Approach C: Environment-Driven Simulator Payload Flags**
  * *Trade-off:* Avoids modifying config schemas by passing flags in webhook request headers, but limits test coverage control from within config profiles.

---

## 5. ❓ Open Questions
* How should we simulate the 500ms ReDoS timeout in Scenario 3 without running an actual CPU-intensive loop (e.g., using a mock timeout promise injection)?
* Should the sandbox trigger warnings for other common API key patterns (e.g. Slack tokens, GCP credentials) or only default to the AWS key pattern?
