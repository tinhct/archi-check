# ArchiCheck: Frequently Asked Questions (FAQ)

**Last Updated:** 2026-07-14

**Target Audience:** End-Users, Stakeholders, and Onboarding Developers

## 📑 Table of Contents

1. [General Overview](#general-overview)
2. [Scoring & Metrics (Algorithmic Complexity)](#scoring--metrics)
3. [Security & Data Privacy](#security--data-privacy)
4. [Integrations & AI](#integrations--ai)
5. [Local AI Playground](#local-ai-playground)
6. [Reliability, Scaling & Governance (Sprint 6)](#reliability-scaling--governance-sprint-6)

---

## 🌍 General Overview

### Q: What is the primary purpose of ArchiCheck?

**A:** ArchiCheck is an automated governance and architectural compliance engine. It acts as an autonomous Solution Architect, ensuring that codebases adhere to predefined architectural boundaries, security standards, and non-functional requirements.

---

## 📊 Scoring & Metrics

### Q: How do you calculate the architectural complexity scores? Describe the Algorithmic Complexity Scoring Engine.

**A:** ArchiCheck calculates a **Baseline Complexity Score (0 to 10)** for each pull request. This score is derived by scanning the added lines of the Git unified diff (excluding blocklisted assets, documentation, or lockfiles) and checking the ratio of structural syntax keywords against total additions:

1. **Keyword Analysis**: The engine counts structural syntax indicators (keywords like `class`, `interface`, `async`, `useState`, `useEffect`, `if`, `for`, `switch`, `try`, etc.).
2. **Scoring Formula**:
   $$\text{Score} = \min\left(10, \left\lceil \frac{\text{complexityIndicators}}{\text{linesAdded}} \times 10 + \frac{\text{totalLinesModified}}{100} \right\rceil\right)$$

This baseline score is then fed into the **Heuristics Gating Engine** which decides whether to lock the PR:
* **Standard Gate**: Locks the gate if the complexity score is $\ge 5$ (configurable via `COMPLEXITY_THRESHOLD`) **AND** the estimated AI-reliance ratio is $\ge 0.7$ (configurable via `AGENT_RELIANCE_THRESHOLD`).
* **Velocity ("Spray & Pray") Gate**: Overrides standard thresholds to immediately lock the PR if development was suspiciously fast (the First Commit Proxy time delta between first commit and PR is $< 15\text{ minutes}$) **AND** the changes are substantial ($> 300\text{ lines added}$).

---

## 🛡️ Security & Data Privacy

### Q: How does ArchiCheck prevent proprietary API keys or developer credentials from leaking to external AI APIs?

**A:** Prior to transmitting any code diff payload to external LLMs (Gemini/Vertex AI), the system executes a strict, regex-based sanitization pass via `scrubSecrets` in `sanitizer.ts`. This sanitization process leverages ECMAScript lookbehind assertions to detect and redact credential values (e.g. AWS keys, Google API keys, Stripe tokens) inside variable assignments while leaving the variable declarations intact. This ensures that raw credentials are never sent over outbound networks, while keeping code diff syntax compileable.

### Q: How does ArchiCheck protect the webhook endpoints against signature spoofing or timing-channel attacks?

**A:** All incoming webhook payloads targeting the `/api/webhook` HTTP endpoint are validated using HMAC SHA-256 signatures passed in the `x-hub-signature-256` header. To prevent timing side-channel attacks (where an attacker deduces the secret by measuring string character equivalence match delays), the validation uses Node's native `crypto.timingSafeEqual` comparison utility.

---

## 🤖 Integrations & AI

### Q: What happens if the Upstash Redis database or Vertex AI endpoints suffer an outage? Will our CI pipeline hang?

**A:** No. ArchiCheck is designed with a resilient **Fail-Open Default Policy**. Heavy dependencies are wrapped inside strict promise-race timeout limits (1,000ms limit for Upstash Redis, 15 seconds limit for LLM calls). If an API times out or throws connection errors, the exception is caught, a telemetry warning comment is posted to the PR thread, and the commit status check is set to `Success`. This guarantees that ArchiCheck outages never block developer merge flows.

### Q: Can anyone answer the architectural quiz to unblock a PR, or can it be bypassed during an outage?

**A:** Quiz answer validation is restricted strictly to the pull request author (`pull_request.user.login`) to ensure that co-authors or reviewers do not absorb their cognitive debt. Submissions from other logins are rejected with a warning comment. However, if a production outage occurs, repository administrators or maintainers can issue the `/archicheck bypass` slash command inside the thread. This queries collaborator permissions and immediately sets the status check to `Success` with an emergency bypass audit trail.

---

## 🧪 Local AI Playground

### Q: What is the "Two-Stage Evaluation Pipeline" in the Local AI Playground?

**A:** The Playground now supports a complete two-stage flow that mirrors the full GitHub PR comment/evaluation cycle locally:

1. **Phase 1 — Quiz Generation:** Paste a raw git diff into the left pane and click **Generate Quiz**. The system runs the diff through the sanitizer and sends it to the configured LLM provider (mock or real Gemini), which returns a set of architectural comprehension questions. Token counts (`input / output / total`) are displayed in a compact badge next to each phase.

2. **Phase 2 — Evaluation:** Each question has its own dedicated reply textarea directly below it (the "Pipeline Thread" layout). Type your architectural justification in each box. Once all boxes contain at least 20 characters, click **Evaluate All Replies**. The system concatenates your answers into a structured `Q1: ... A1: ...` format and passes them to the same `validateAnswers` function used in production. The result — a PASS/FAIL verdict, score out of 10, and reasoning — is displayed immediately.

This enables prompt engineers and developers to iterate on both AI pipeline phases locally without any GitHub webhooks, live PRs, or API budget exposure.

---

### Q: Why does the Playground use per-question reply boxes instead of a single text area?

**A:** The original design had a single large textarea on the left side of the screen while questions were listed on the right. This created two friction points:

1. **Cross-screen eye travel:** On a wide monitor, developers had to visually ping-pong between the question list (right) and their answer area (left), which was mentally exhausting.
2. **Format ambiguity:** When the AI generates 3 distinct questions, it was unclear whether to write a single essay or number the answers `1... 2... 3...`.

The "Pipeline Thread" redesign (AC-ST-505) places a dedicated reply textarea directly below each question, following the same visual pattern as GitHub PR review comments. Answers are automatically structured and concatenated before evaluation, so the API contract is preserved without any developer effort.

---

### Q: What are the Playground fixtures, and are they included in the production app?

**A:** Fixtures are pre-built test scenarios stored in `src/lib/mocks/fixtures/playground-fixtures.json`. They allow developers to instantly load well-known diff scenarios (clean code, code containing AWS keys, prompt injection attempts, ReDoS bombs) without having to construct test diffs from scratch.

**Production safety:** The fixture file is completely excluded from the production Next.js client bundle via a webpack NullLoader alias in `next.config.ts`. Additionally, the playground page and API routes are already blocked by middleware (HTTP 404) in production environments. The fixture file therefore never ships to end users.

**Fixture seeding for Phase 2:** Fixtures that include a `phase2` block (marked with a ⚡ prefix in the dropdown) will automatically pre-populate the quiz in `quiz_ready` state when selected — no API call is made. Reply boxes are always left empty, respecting the developer's intent to write their own answers.

---

### Q: How does ArchiCheck check or enforce the `NODE_ENV` environment variable, and how can I control it?

**A:** `NODE_ENV` is a standard environment variable that controls whether the application runs in development or production. Next.js manages it automatically based on the command you run:
* **`npm run dev`** (starts the local dev server) dynamically sets `process.env.NODE_ENV = 'development'`.
* **`npm run build`** and **`npm run start`** (compiles and starts the production server) sets `process.env.NODE_ENV = 'production'`.

ArchiCheck uses this variable to enforce environment boundaries:
1. **Middleware Gate (`middleware.ts`):** If a request targets a playground route (e.g. `/playground` or `/api/playground`) and `NODE_ENV === 'production'`, the middleware intercepts it and returns an immediate 404.
2. **API Gating:** The evaluate API route (`/api/playground/evaluate/route.ts`) checks `process.env.NODE_ENV === 'production'` and calls Next's `notFound()` helper as a second line of defense.
3. **Zod Env Quarantine (`src/config/env.ts`):** Startup validation fails if mock LLM credentials or configuration elements (`LLM_PROVIDER_TYPE=mock`) are set in a production environment.

**How to verify:**
* To verify the development code path, run `npm run dev` and navigate to `/playground`.
* To verify the production block, run `npm run build && npm run start` and confirm `/playground` returns a 404.
* If you want to check the current value in your shell terminal, run `echo $NODE_ENV`. If empty, it means the variable is only set in-memory during script execution.

---

### Q: Why does the Next.js development server sometimes show a hydration mismatch error overlay, and how does ArchiCheck mitigate it?

**A:** React hydration mismatches under Next.js development mode frequently occur when third-party browser extensions (such as *Scite* or ad-blockers) inject arbitrary HTML tags (e.g. `<div id="shadowLL">`) or custom `<link>` stylesheets into the page's metadata before React finishes mounting. This results in structural differences between server-rendered HTML and client-side DOM.

ArchiCheck mitigates this by injecting a client-side hook in `src/instrumentation-client.ts` that executes before hydration. This hook monkey-patches the global `window.reportError` handler. If a hydration error is thrown, it inspects the error message and the DOM for extension markers (like Scite's `#shadowLL` or `chrome-extension://` stylesheet links). If detected, it suppresses the dev overlay while preserving and passing through real application-level errors.

**Recommendation:** For the cleanest developer experience, always test the Next.js application in an **Incognito/Private Window** with all extensions disabled to ensure external scripts do not interfere with the client application state.

---

## 📈 Reliability, Scaling & Governance (Sprint 6)

### Q: What is the "Deterministic validation guardrail" in Sprint 6, and why is it useful?

**A:** Deterministic validation guardrails are O(1) checks run locally on the server before invoking external LLM models:
* **Keyboard-Mashing / Gibberish Detection:** Excludes text containing repeated character chains (e.g. `aaaa`, `1111`) or long, continuous words ($>15$ characters without path delimiters or camelCase word transitions).
* **Information Density Verification:** Excludes responses that lack sufficient unique character variety ($\ge 6$ unique letters for replies $\ge 20$ chars) or word spacing ($< 3$ words).

By filtering out spam, key mashing, or junk text instantly, the system avoids executing expensive AI queries, protecting API quotas and lowering application latency.

---

### Q: How does the Token Burn Telemetry Alerting engine protect our AI monthly budget?

**A:** The alerting engine dynamically aggregates Gemini token costs inside a persistent Redis key store. 
* **Pricing Model:** It tracks input and output tokens consumed across both quiz generation and validation phases. Cumulative expense is computed using current pricing metrics ($0.075 per 1M input tokens, $0.30 per 1M output tokens).
* **Alert Thresholds:** If the total computed cost breaches the safety limit (configured via `TELEMETRY_BUDGET_LIMIT`, default `$200.00`), the engine dispatches a rich JSON payload to the `SLACK_WEBHOOK_URL`.
* **Spam Prevention:** Once an alert is dispatched, an `alert_sent` key with a 24-hour expiration (TTL) is locked in Redis, preventing redundant webhook spamming.

---

### Q: How does the Request Context Async Task Queue fallback ensure task durability?

**A:** Vercel Edge functions support Next.js `waitUntil` to schedule background promise executions. However, standard Node.js Docker containers or Kubernetes environments do not have a native request lifecycle hook.

The `asyncTracker` utility detects runtime features:
* On platforms with `waitUntil`, it delegates background tasks to it.
* On standard Node.js containers, it stores active background promises in an in-memory queue. It hooks into Node.js `SIGTERM` and `SIGINT` signals to await and drain all active background tasks before allowing the container process to exit.

---

### Q: How do we configure Pilot Cohort overrides, and how are they matched?

**A:** Administrative users can configure team-based rules in `config/cohorts.yaml`.
* **Cohort Definition:** Each cohort defines a list of member logins (e.g. GitHub usernames) and custom parameters (such as `algorithmic_complexity_score` and `excluded_paths` overrides).
* **Matching Logic:** When a webhook event is received, the engine parses the PR author's login, checks it against cohort lists case-insensitively, and merges matching overrides dynamically over base repository configurations. Unregistered users default to the standard repository-level rules.

---

### Q: How does ArchiCheck load the `.archicheck.yml` configuration overrides, and why must they be committed to my PR branch?

**A:** ArchiCheck parses the incoming GitHub Webhook pull request payload and fetches the `.archicheck.yml` (or `.archicheck.yaml`) file directly from the head commit SHA (`pull_request.head.sha`) of your specific PR branch. 

*   **PR Branch Requirement:** Because configuration is loaded dynamically from the head commit, any custom rules or threshold overrides you wish to apply must be committed and pushed directly to your feature branch (the branch you are opening the PR from) for the system to register them.
*   **Default Fallback:** If the file is missing from your PR branch, the system logs a fallback warning and defaults to global configuration limits (complexity score $\ge 5$, AI reliance $\ge 70\%$).


