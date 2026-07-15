# Architecture Decision Records (ADRs)

**Last Updated:** 2026-07-10

*Note: Add new decisions at the top.*

## ADR-010: Playwright Staging E2E Sandbox Integration
* **Date:** 2026-07-10
* **Status:** Accepted

### Context
We need to test the entire end-to-end developer experience (PR locks, markdown quiz comments, validation triggers, and bypasses) in staging. Running live LLM queries in staging previews burns budget and is non-deterministic, while local unit tests do not validate real browser-level UI changes on GitHub.

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

---

## ADR-011 — Discriminated Union Response Schema for Playground Phase 2 Evaluate Endpoint

**Status:** Accepted
**Date:** 2026-07-12
**Story:** AC-ST-501-P2

### Context
The `POST /api/playground/evaluate` endpoint can produce three semantically distinct outcomes: a successful LLM evaluation, a sanitizer-blocked reply, or an LLM format error. A flat response schema (e.g., `passed: boolean | null, score: number | null, reason: string`) would permit logically impossible combinations (`passed: true, score: null`) that TypeScript cannot prevent at compile time, creating a maintenance burden and potential for silent data corruption in the UI.

### Decision
Adopt a Zod discriminated union keyed on `reason` with three variants: `success`, `sanitizer_rejection`, `llm_format_error`. TypeScript infers the correct type in each branch. All three variants always return HTTP 200 OK. HTTP 400 is reserved strictly for structural validation failures (`{ error: string }`). This ensures the UI can safely switch on `reason` without null-guards on every field.

### Consequences
* **Positive:** Impossible states are unrepresentable at compile time. UI `switch (reason)` is exhaustive and type-safe. HTTP 400 semantics are clean (client error, not application result).
* **Negative:** Three schema definitions to maintain. Zod discriminated unions have slightly more boilerplate than flat schemas.

---

## ADR-012 — Pipeline Thread UI State Machine for Playground Phase 2

**Status:** Accepted
**Date:** 2026-07-12
**Story:** AC-ST-505

### Context
The original Playground UI used a single reply textarea in the left pane while questions were displayed in the right pane. This created cross-pane eye travel and format ambiguity. A redesign was needed that (a) mirrors the GitHub PR comment thread UX, (b) prevents contextual mismatch (quiz from Diff A evaluated against answer to Diff B), and (c) does not require API contract changes.

### Decision
Implement a three-phase React state machine (`idle → quiz_ready → evaluated`) with the following invariants:
1. **Strict Downstream Invalidation:** Any change to the diff textarea or fixture load instantly resets all Phase 1 and Phase 2 state with a 0.2s CSS opacity fade. There is no debounce window — the reset is synchronous.
2. **Per-Question Inline Reply Boxes:** Replace `reply: string` state with `perQuestionReplies: Record<question.id, string>`. Each question block renders its own `<textarea>` directly below the question text.
3. **All-or-Nothing Submission:** The Evaluate button is only enabled when every per-question box contains ≥ 20 characters. Partial submissions are blocked at the UI level before any API call.
4. **Structured Concatenation:** Answers are assembled as `Q{n}: {question}\nA{n}: {answer}` joined by `\n\n` before POST to the evaluate endpoint. The API contract (a single `reply: string`) is unchanged.
5. **Retry Preserves Drafts:** `handleRetryEval()` clears the error and reverts to `quiz_ready` without clearing `perQuestionReplies`.

### Consequences
* **Positive:** No cross-pane eye travel. Format ambiguity eliminated. API contract unchanged (zero backend impact). State invalidation prevents evaluation of stale quiz/diff combinations.
* **Negative:** `perQuestionReplies` is a `Record<string, string>` instead of a plain string — slightly more complex state shape. Fixture `phase2.reply` string cannot be split across N question boxes without a parse utility (deferred to future sprint).

---

## ADR-013 — Strict Boot-Time Environment Normalization and Key Struct Verification

**Status:** Accepted
**Date:** 2026-07-15
**Story:** AC-ST-601

### Context
Improperly formatted PEM key blocks (such as single-line configurations or incorrect delimiter bounds) cause JWT sign operations to fail silently at runtime, resulting in confusing application behavior on live staging/production servers.

### Decision
Perform key format validation at startup via `src/config/env.ts`. Validate the GITHUB_PRIVATE_KEY string layout, checking for multiline headers and footers in production. In addition, normalize any literal `\n` characters to support container orchestrators that escape newlines. Halt process boot with `process.exit(1)` immediately on failure.

### Consequences
* **Positive:** Key syntax bugs are flagged on server start rather than in-flight on webhook triggers. Normalization eliminates common copy-paste container configuration bugs.
* **Negative:** Development environment setups require valid key variables or fallback configuration mocks to start dev tasks.

---

## ADR-014 — Edge Runtime Fallback Background Queues for Standalone Node Contexts

**Status:** Accepted
**Date:** 2026-07-15
**Story:** AC-ST-602

### Context
When running on standard Node.js containers rather than serverless Edge runtimes (Vercel Edge), Next's `waitUntil` is unavailable, risking early thread termination and uncompleted AI scoring operations on asynchronous webhook routes.

### Decision
Build an in-memory active tasks registry (`asyncTracker.ts`) to track background promises on Node.js containers. Add process hooks for `SIGTERM` and `SIGINT` that wait for active promises to complete before exiting, bounded by a 5-second safety timeout to avoid zombie states in orchestrators.

### Consequences
* **Positive:** Ensures background task reliability across Serverless, Edge, and standard Node.js container environments.
* **Negative:** Restarts can delay up to 5 seconds during container terminations if background AI validations are in-flight.


