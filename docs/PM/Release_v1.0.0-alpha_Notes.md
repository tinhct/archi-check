# Release Notes: ArchiCheck v1.0.0-alpha

**Release Version:** `v1.0.0-alpha` | **Release Date:** `2026-07-15` | **Classification:** Staging Preview / Alpha Dogfooding

We are proud to announce the first major staging preview release of **ArchiCheck (v1.0.0-alpha)**, a cognitive control plane designed to protect engineering teams from systemic deskilling and passive "rubber-stamping" in the age of AI code assistants.

---

## 🚀 Key Capabilities in v1.0.0-alpha

### 1. Active Cognitive Gating (Epic 1 & 2)
ArchiCheck actively analyzes incoming Git diffs for complexity and AI reliance markers. If complexity thresholds are exceeded:
*   It synchronously locks the GitHub status check to `Pending`.
*   It generates interactive, language-agnostic architectural comprehension quizzes directly in the PR comment thread.
*   It blocks code merges until the human author successfully answers the quiz, preserving developer ownership.

### 2. Outbound Secrets Sanitizer (Epic 4)
Prior to transmitting diffs to external LLM providers, ArchiCheck runs a regex-based lookup scrubbing pass (`sanitizer.ts`) using ECMAScript lookbehinds to redact credentials (e.g. AWS keys, Stripe tokens, Slack tokens) while preserving variable declarations.
*   **ReDoS Watchdogs:** Integrates a line truncation boundary (500 chars) and a 500ms CPU execution circuit-breaker to halt regex matching and protect Node.js event loops from catastrophically backtracking diff payloads.

### 3. Local AI Playground Sandbox (Epic 5)
Empowers developers and prompt engineers to test prompt settings and evaluate responses locally without hitting live webhooks or external budgets.
*   **Pipeline Thread UI:** A stateful React dashboard supporting the full two-stage interactive workflow (Generate Quiz $\rightarrow$ justification input textareas $\rightarrow$ grade justification score & explanation).
*   **Token telemetry badging:** Displays detailed input, output, and total token count telemetry splits for both generation and evaluation phases.

### 4. Asynchronous Edge Lifecycles (Epic 3)
Built for serverless Edge runtimes (Vercel) utilizing native `waitUntil` hooks to execute background LLM pings after sending immediate webhook responses to GitHub.
*   **Graceful Standalone Fallbacks:** Includes a fallback promise-tracking queue with SIGTERM container listeners to prevent task loss during orchestration restarts or server terminations.

### 5. Pre-LLM Deterministic Filters (Epic 3)
Deploys pre-LLM checking logic (alphanumeric letter variety, continuous word length boundaries, pattern repetition limits) to drop keyboard mashing or trivially short answer justifications instantly, giving developers immediate visual badge feedback and protecting token budgets.

### 6. Outage Resilience & Fail-Open Defaults (Epic 1 & 2)
Guarantees developer velocity is never impacted by network degraded states or downstream API failures:
*   **Fail-Open Policy:** Limits Redis calls to 1s and LLM validations to 15s. If a connection fails or times out, the PR status check is set to `Success` with logged warnings.
*   **Collaborator Bypass:** Allows repository maintainers and admins to release locks during outages via the `/archicheck bypass` slash command in the PR thread.

---

## 🛠️ Onboarding & Configuration

To enable ArchiCheck on your repositories, refer to the **[Onboarding Guide](../PM/Onboarding_Guide.md)** or standard configuration schema in **[.archicheck.yml](../../.archicheck.yml)**:

```yaml
# Sample .archicheck.yml
algorithmic_complexity_score: 5      # Gate PRs scoring 5 or higher (1 to 10)
ai_reliance_ratio: 0.7              # Gate if AI reliance is >= 70% (0.0 to 1.0)
lines_added_threshold: 300          # Min code additions to trigger Velocity Gate (default: 300)
excluded_paths:                     # Paths ignored during analysis
  - "**/node_modules/**"
  - "package-lock.json"
```

Refer to the **[FAQ Guide](../../docs/FAQ.md)** for developer workarounds, security details, and API limits.
