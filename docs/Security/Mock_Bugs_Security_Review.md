# Mock Environment Security & Defect Review  
**Last Updated:** 2026-07-15  
**Target Phase/Sprint:** Sprint 6

## 🎯 Objective  
Review local mock/sandbox testing failures to identify configuration drifts, architectural gaps, and hidden vulnerabilities before they propagate to Staging or Production.

## 🐛 Defect & Configuration Analysis  
| Defect ID / Issue | Environment | Root Cause (Config, Code, Architecture) | Potential Staging/Prod Impact | Engineering Solution / Mitigation | Status |  
|-------------------|-------------|-----------------------------------------|-------------------------------|-----------------------------------|--------|  
| **Env Key Truncation** | Local Mock | Config (copy-pasting multiline GITHUB_PRIVATE_KEY without enclosing quotes) | JWT private key parsing fails, completely blocking all outgoing webhook signatures | Enforce startup Zod validation check in `src/config/env.ts` to ensure key contains newlines and headers, crashing the boot process early | Closed |  
| **ReDoS event-loop blockage** | Local Mock | Code (catastrophic backtracking in regex scanner) | Events lock the single-threaded Node event loop, causing a complete denial of service (DoS) | Implement 500-char line truncation limits and a 500ms CPU execution threshold timer inside `sanitizer.ts` | Closed |  
| **BUG-505-1: Evasive Short Replies** | Local Mock | Code (loose Zod schema on reply body set to `min(1)`) | Developers bypass gates using 5-character nonsense replies (e.g., `'ddddd'`) | Enforce `min(20)` length check in Zod request schemas at both API and UI layers | Closed |  
| **BUG-505-3: Rubber-Stamp Mock Bypass** | Local Mock | Architecture (simplistic mock LLM provider verifying length only) | Developers bypass gates using 20-character repetitive/random strings (e.g., `'gfgffffff...'`) | Implement semantic structures check (repetitive sequence, word density, unique letter counts) in Mock LLM and queue stories for production API gates | Closed |  
| **BUG-505-5: Bot Comment Loop** | Live Staging / Local Mock | Code (webhook issue_comment event handler reacted to bot-authored comments recursively) | Generates infinite warning-comment loops, spamming PR threads and risking API rate limit locks | Filter out comments authored by bot accounts (`comment.user.type === 'Bot' \|\| comment.user.login.endsWith('[bot]')`) at webhook entry | Closed |
| **BUG-505-6: Webhook API TypeError Crash** | Live Staging | Configuration (App constructor failed to pass REST-enabled Octokit class config) | Completely crashes live webhook processing, falling back to fail-open | Pass custom REST-enabled `Octokit` class to the App constructor options | Closed |  
| **BUG-601-1: Mock Redis incrby** | Local Mock | Code (mock client lacks `incrby` method) | Crashing token budget logging and disabling E2E shadow mode simulations | Implement `incrby` simulate counter logic using read-evaluate-write sequence | Closed |  
| **BUG-601-2: Graceful Shutdown hanging** | Node Container | Code (missing process.exit() and timeout bounds on SIGTERM listener) | Zombie containers hanging indefinitely in orchestration platforms | Implement a 5-second race timeout and call process.exit() to release event loops | Closed |  


## 🛡️ Architectural & Mock Gaps Identified  
* **Mock Data Limitations:** Yes. Mock diff files in the test harness did not initially exceed the complexity thresholds (300 lines added), requiring manual padding to trigger gates. Additionally, the Mock LLM lacked character entropy checks and spacing validations, failing to accurately represent the semantic scrutiny performed by the real LLM in production.
* **Boundary Leaks:** None. We verified that no external calls were made to real Upstash Redis databases or real GitHub endpoints when running offline mock profiles (the local `InMemoryCache` successfully intercepted all caching calls).
* **Security Guardrail Failures:** Yes. The mock LLM allowed bypass validations with random keyboard mashing because it lacked real semantic parsing, highlighting a need for pre-LLM deterministic API validation guardrails.
