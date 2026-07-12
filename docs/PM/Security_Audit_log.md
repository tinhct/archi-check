# Security Audit Log

**Last Updated:** 2026-07-12

## 🛡️ Vulnerability Tracker (Simulated SAST)

| ID | Date Found | Vulnerability & Description | Severity (C/H/M/L) | Location (File/Line) | Recommended Remediation | Status (Open/Resolved/Risk Accepted) |
|----|------------|-----------------------------|--------------------|----------------------|-------------------------|--------------------------------------|
| V1 | 2026-07-06 | Regular Expression Denial of Service (ReDoS) on custom patterns | H | `src/lib/security/sanitizer.ts#L60-95` | Implement 500-char line truncation and a 500ms execution timer to abort catastrophic backtracking. | Resolved |
| V2 | 2026-07-06 | Webhook signature timing side-channel attack | H | `src/lib/security/hmac.ts#L10` | Use Node's `crypto.timingSafeEqual` instead of string equivalence operators to validate HMACs. | Resolved |
| V3 | 2026-07-07 | Hardcoded credential exposure during Git commit | C | Codebase / Commits | Configure GitGuardian scanning (GGShield) as an automated CI gating step. | Resolved |
| V4 | 2026-07-07 | Unauthorized Gate Bypass via issue comments | H | `src/app/api/webhook/route.ts#L225` | Restrict bypass slash command evaluations strictly to collaborators with `admin` or `maintain` roles. | Resolved |
| V5 | 2026-07-08 | Prompt-Injection & XML tag-escape vulnerability in developer validation replies | H | `src/lib/llm/provider.ts#L84` | Escape XML tag bounds (<diff>, <questions>, <answers>) and inject [SECURITY INSTRUCTION] blocks in system prompts. | Resolved |
| V6 | 2026-07-09 | Accidental mock provider activation in live production environments | H | `src/config/env.ts` | Implement production schema validation using discriminated union checking `NODE_ENV`. | Resolved |
| V7 | 2026-07-10 | E2E QA Bot credentials leakage in public build/PR logs | H | `tests/e2e/` | Store session states and credentials exclusively in repository secrets, and mask logs during execution. | Resolved |
| V8 | 2026-07-12 | **New evaluate endpoint attack surface** — `POST /api/playground/evaluate` accepts arbitrary `diff`, `quizJson`, and `reply` fields. Without strict size limits, oversized payloads could exhaust LLM context window or create ReDoS via `parseDiff()`. | H | `src/app/api/playground/evaluate/route.ts` | Zod validation with size caps runs BEFORE `parseDiff()`: diff max 50,000 chars, quizJson max 20 items, reply max 10,000 chars. Endpoint is also production-blocked via middleware + `notFound()`. | Resolved |
| V9 | 2026-07-12 | **Fixture file contains adversarial payloads** (`playground-fixtures.json` includes prompt injection strings and ReDoS trigger keywords). If inadvertently included in production bundle, it could serve as an attack reference guide for end users. | M | `src/lib/mocks/fixtures/playground-fixtures.json` | webpack NullLoader alias excludes `src/lib/mocks/` from production build. Defense-in-depth: playground routes are also 404'd in production by middleware. | Resolved |
| V10 | 2026-07-12 | **API minimum reply length gap** — Original `reply` Zod validation used implicit `min(1)` allowing trivially short inputs to reach the LLM evaluator, potentially wasting quota or producing meaningless scores. | L | `src/app/api/playground/evaluate/route.ts` | Raised to `z.string().min(20)` mirroring mock LLM's `minimum_answer_length: 20` constraint. UI disables Evaluate button below threshold. | Resolved |

## 📦 Dependency Risks (Simulated SCA)

| ID | Date Found | Library / Package | Identified Risk / CVE | Severity | Required Action / Target Version | Status |
|----|------------|-------------------|-----------------------|----------|----------------------------------|--------|
| D1 | 2026-07-07 | GitHub Actions Runners | Node 20 environment deprecation | L | Set ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION=true or upgrade Action Runner to Node 24. | Resolved |
| D2 | 2026-07-07 | Node.js Runtime | Deprecated `punycode` runtime module warning | L | Upgrade underlying packages to use modern userland punycode equivalents. | Resolved |
