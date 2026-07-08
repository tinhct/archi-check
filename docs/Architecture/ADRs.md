# Architecture Decision Records (ADRs)

**Last Updated:** 2026-07-08

*Note: Add new decisions at the top.*

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
