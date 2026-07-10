# Architecture Decision Records (ADRs)

**Last Updated:** 2026-07-10

*Note: Add new decisions at the top.*

## ADR-010: Playwright Staging E2E Sandbox Integration
* **Date:** 2026-07-10
* **Status:** Accepted

### Context
We need to test the entire end-to-end developer experience (PR locks, markdown quiz comments, validation triggers, and bypasses) in staging. Running live LLM queries in staging previews burns budget ($3,500 token budget) and is non-deterministic, while local unit tests do not validate real browser-level UI changes on GitHub.

### Decision
1. **Model Mocking**: Deploy Vercel Staging/Preview environments with `LLM_PROVIDER_TYPE=mock` to utilize `.archicheck.mock.json` golden fixtures deterministically without token cost.
2. **Session Caching & TOTP Fallback**: Configure Playwright to load GitHub authenticated states from `storageState` JSON cookies, falling back to programmatic TOTP code generation using `otplib` if the session expires.
3. **Dynamic Webhook Routing**: Have the CI pipeline dynamically update the webhook URL of a dedicated QA GitHub App to target the current Vercel preview domain before executing the tests.
4. **Programmatic Teardown**: Build an API teardown script using `@octokit/rest` that runs unconditionally in Playwright `afterEach`/`globalTeardown` to close testing PRs and force-delete temporary branches (`archicheck-qa-test-[timestamp]`).

### Consequences
* **Positive:** Fast, deterministic, and zero-cost browser-level integration testing. Eliminates staging repository pollution and bypasses GitHub 2FA challenges.
* **Negative:** Requires managing credentials and TOTP secrets for a dedicated QA GitHub Machine User account in CI.

---

## ADR-009: Environment-Driven Provider Factory & Production Discriminated Union
* **Date:** 2026-07-09
* **Status:** Accepted

### Context
To support offline local testing without API costs (Developer Experience), we need a Mock LLM provider. However, running mock services in a live production environment poses a critical security risk (accidental auto-approval of gates). We need to decouple LLM provider instantiation while structurally preventing mock activations in production.

### Decision
1. **Provider Factory**: Decouple the LLM layer using a factory pattern (`provider.ts`) supporting `gemini-developer`, `vertex`, and `mock` provider types.
2. **Discriminated Union Validation**: Implement a Zod schema in `src/config/env.ts` that validates production configurations based on `LLM_PROVIDER_TYPE` using a discriminated union:
   * **`gemini-developer`**: Requires `LLM_API_KEY`.
   * **`vertex`**: Requires `GOOGLE_CREDS_JSON`.
   * **`mock`**: Instantly fails validation if `NODE_ENV === 'production'` with a critical error message.

### Consequences
* **Positive:** Allows contributors to test gating rules and UI comments offline instantly with zero API cost. Guarantees that mock mode can never boot or bypass checks in production.
* **Negative:** Slightly increases environment configuration complexity by enforcing conditional variable validation.

---

## ADR-008: Prompt-Injection Tag Sanitization & Defensive Prompting
* **Date:** 2026-07-08
* **Status:** Accepted

### Context
Developers or PR code comments could inject malicious prompt strings (Indirect Prompt Injection/Jailbreaks) inside diff contents or validation response comments. Since the system places these inputs within XML wrapper blocks (`<diff>`, `<answers>`), attackers could input fake closing tags (e.g. `</answers>`) to escape these blocks and inject instructions (e.g. forcing `passed: true`).

### Decision
Apply a two-layered defense strategy:
1. **Input Sanitization**: Use a regex replacing helper (`sanitizePromptInput`) in `provider.ts` to substitute user-submitted XML tags matching system prompt boundaries with safe bracket versions (e.g., `[/answers]`).
2. **Defensive Instructions**: Append a dedicated `[SECURITY INSTRUCTION]` block inside the system prompts explicitly directing the LLM to ignore hijack attempts or instruction escapes inside these tag blocks.

### Consequences
* **Positive:** Effectively mitigates indirect prompt injections and tag escaping without affecting code operator symbols (`<`, `>`).
* **Negative:** Slightly increases prompt size by a few dozen tokens due to system instructions overhead.

---

## ADR-007: Overwrite status check description on bypass
* **Date:** 2026-07-07
* **Status:** Accepted

### Context
When an emergency bypass is executed, we must unblock the merge button. In GitHub, a status check is uniquely keyed by its `context` string (e.g. `archicheck/verification`). If we change the context string to `archicheck/bypassed` during an override, GitHub creates a *new* status check. The original check remains permanently stuck in `Pending` state, leaving the PR blocked.

### Decision
Keep the status context string strictly identical to `archicheck/verification` to overwrite the existing status check block, but mutate the status check payload to `state: "success"` and modify the description to `"⚠️ Emergency bypass executed by Tech Lead."`.

### Consequences
* **Positive:** Unblocks the merge button instantly, keeping developers within native workflows. Leaves a permanent audit trail indicating that automated validation was overridden.
* **Negative:** None.

---

## ADR-006: Strict PR Author Validation
* **Date:** 2026-07-07
* **Status:** Accepted

### Context
If reviewers or co-authors are allowed to answer the ArchiCheck comprehension quizzes, the PR creator retains their "comprehension debt." This defeats the core cognitive safeguard value proposition. 

### Decision
Strictly restrict quiz answer evaluations to the PR Author username (`pull_request.user.login`). Comments from other logins are dropped with a warning reply. If team leads need to unblock it offline, they must run `/archicheck bypass` explicitly.

### Consequences
* **Positive:** Prevents developer cognitive offloading. Protects the LLM API budget by avoiding calls on unauthorized reviewer replies.
* **Negative:** Increases friction slightly if co-authors are pair-programming.

---

## ADR-005: Lock Early, Unlock Fast
* **Date:** 2026-07-07
* **Status:** Accepted

### Context
GitHub enforces a strict ~10-second timeout on webhook responses. If ArchiCheck waits to calculate complexity metrics and call the LLM before returning a status check, an auto-merge bot or rapid click by a developer could merge the PR before the gate blocks it.

### Decision
Synchronously set the commit status to `Pending` as the absolute first action of the webhook handler (immediately after signature verification), and then return a `202 Accepted` response. Offload all heavy analysis (diff parsing, heuristics, LLM, Redis state caching) to background worker threads using Next.js `waitUntil()`.

### Consequences
* **Positive:** Completely eliminates PR merge race conditions. Delivers immediate visual feedback to the developer.
* **Negative:** Context execution must remain active in the background.

---

## ADR-004: Lookbehind Secret Value Redaction
* **Date:** 2026-07-07
* **Status:** Accepted

### Context
Standard regex replacements of sensitive matches (like redacting `const key = 'AIzaSy...'` to `[REDACTED]`) deletes variable assignments. This corrupts syntax, breaking lint checks and compiler tools when CI tests run on sanitized branches.

### Decision
Utilize ECMAScript lookbehind assertions (`(?<=\bkey\s*[:=]\s*["'])`) to target and redact *only the value* of string variables, leaving syntax declarations and quote marks intact.

### Consequences
* **Positive:** Diff syntax remains compileable and clean.
* **Negative:** Complex regex patterns are more vulnerable to catastrophic backtracking (ReDoS). Mitigated by adding line length truncation and CPU watchdogs.

---

## ADR-003: First Commit Proxy Gating
* **Date:** 2026-07-07
* **Status:** Accepted

### Context
Detecting developer velocity (branch age) usually requires querying Git ref-logs. This adds multiple REST API hops to GitHub, increasing latency and hitting rate limits.

### Decision
Use the "First Commit Proxy" shortcut. Compute velocity timings as the difference between `PR created_at` and the author date of the first commit in the PR.

### Consequences
* **Positive:** Extremely fast; shaves off 50-200ms of execution time.
* **Negative:** If a developer rebases or rewrites commit history, the first commit author date might not represent the actual branch start.

---

## ADR-002: Choice of Test Framework (Vitest)
* **Date:** 2026-07-06
* **Status:** Accepted

### Context
Need a test runner with native ES Modules support, fast execution speeds, and clean integrations for Next.js projects.

### Decision
Use Vitest instead of Jest.

### Consequences
* **Positive:** Speed, zero configuration, clean TS module resolution.
* **Negative:** None.

---

## ADR-001: Fail-Open Default Policy
* **Date:** 2026-07-06
* **Status:** Accepted

### Context
If internal services (Upstash Redis, Vertex AI endpoints) fail, we must not lock the developer's pipelines and block critical code updates.

### Decision
Adopt a strict fail-open policy. If Redis timeouts (1,000ms limit), LLM timeouts (15s limit), or credential errors are thrown, log the incident, post a warning comment in the PR thread, and set the commit status check to `Success`.

### Consequences
* **Positive:** Guarantees that ArchiCheck outages never halt development operations.
* **Negative:** A minor decrease in security enforcement during system outages.
