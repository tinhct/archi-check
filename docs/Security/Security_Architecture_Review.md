# Security Architecture Review

**Last Updated:** 2026-07-08

## 🏗️ Trust Boundaries & Access Control

* **Authentication Mechanism:**
  * **GitHub Webhooks:** Signed with HMAC SHA-256 using the webhook secret. Checked using timing-safe comparisons (`crypto.timingSafeEqual`).
  * **GitHub App client:** Authenticates using signed JWT JSON Web Tokens (RS256 certificates) to exchange for installation-scoped tokens.
* **Authorization Model:**
  * **Gated PR Answers:** Access restricted strictly to the PR creator (`pull_request.user.login`) to ensure they do not offload cognitive understanding.
  * **Bypass Execution:** Slash command restricted to repository collaborators with `admin` or `maintain` permission levels.
* **Data Encryption (In Transit):** TLS 1.3 / 1.2 on all external REST integrations (GitHub API, Upstash Redis, GCP Vertex AI API).
* **Data Encryption (At Rest):** AES-256 for data at rest (implemented by GCP Vertex and Upstash databases).

## 🛑 Security Guardrails

| Guardrail | Enforcement Mechanism | Status |
|-----------|-----------------------|--------|
| **Webhook Signature Validation** | Synchronous HMAC timing-safe check at Edge entry. | Active |
| **Lookbehind Secret Scrubbing** | Regular expression sanitizer redacting values inside quote assignments. | Active |
| **ReDoS CPU Watchdog** | Truncates lines >500 characters and aborts RegExp matching after 500ms. | Active |
| **GitHub App Token Rotation** | Installation client tokens automatically expire after 1 hour (managed by GitHub). | Active |
| **Leaked Credentials Gating** | GitGuardian ggshield pre-commit/CI pipeline repository scanning checks. | Active |
| **Prompt Injection Gating** | XML tag-escape regex replacements & system level security instructions. | Active |
| **Fail-Open Gating SLA** | 1,000ms Redis timeouts & 15s LLM timeouts unblock PRs to prevent pipeline locks. | Active |
