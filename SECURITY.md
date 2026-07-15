# Security Policy (SECURITY.md)

We take the security of ArchiCheck and its integrations seriously. As a gatekeeper for code merging, maintaining a bulletproof security profile is central to our mission. 

---

## 🛡️ Vulnerability Reporting Protocols

If you discover a security vulnerability in ArchiCheck, please report it to us using the following responsible disclosure steps. Do **not** open a public issue on the GitHub tracker for security disclosures.

### Reporting Channels
*   **Responsible Disclosure Email:** `[NEEDS CONTEXT: Security contact email address, e.g. security@archicheck.org]`
*   **PGP Key:** `[NEEDS CONTEXT: Optional PGP Key fingerprint for encrypted communication]`
*   **Response Timeline:** We will acknowledge receipt of your report within 48 hours and provide a tracking update. We aim to triage and resolve all high-severity vulnerabilities within 7 days.

### What to Include
When reporting, please provide:
*   A clear description of the vulnerability and its potential impact (e.g. bypass validation, remote execution, credential leak).
*   A proof of concept (PoC) or step-by-step instructions to reproduce the issue.
*   Any mock payloads, code modifications, or logs illustrating the leak.

---

## 🤖 AI-Assisted Security Governance

To ensure the safety of our automation and AI generation interfaces, ArchiCheck applies a proactive, AI-assisted security governance process:

*   **STRIDE Threat Modeling:** Before any new epic, backend API endpoint, or cache state transition is implemented, we execute a comprehensive STRIDE Threat Model (covering Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, and Elevation of Privilege). The threat landscape is visualized and documented in `docs/Security/Threat_Model.md`.
*   **Static Application Security Testing (SAST):** Code diffs are regularly scanned for credential exposures and ReDoS vulnerability backtracks.
*   **Regex Timeout Guardrails:** Our custom secret sanitizer (`sanitizer.ts`) isolates regular expression matching loops with a 500ms CPU execution circuit breaker to prevent Denial of Service (DoS) attacks via catastrophic backtracking.
*   **XML Tag-Escaping:** LLM prompting payloads are programmatically sanitized to escape XML tag boundaries (such as `</diff>` or `</answers>`) before query transmission, preventing prompt injection bypasses.

---

## ⚙️ Security Best Practices for Users

When configuring ArchiCheck in your organization, please follow these security guidelines:

### 1. Private Key & Credential Protection
*   **Wrap Private Keys:** When configuring `GITHUB_PRIVATE_KEY` in your CI/CD runner or hosting platform (e.g. Vercel, Docker Env), always enclose the key block in double quotes. This preserves multi-line formatting and prevents shell truncations.
*   **Limit Scopes:** Verify that your GitHub App integration installation token holds only the minimum required permissions (`checks:write`, `pull_requests:read`, `issues:write`).

### 2. Edge Middleware Access Controls
*   To prevent unauthorized access to your local developer sandbox, ensure Next.js Edge Middleware rules are configured to block all `/playground` and `/api/playground/*` routes in production environments (yielding standard 404 responses). The playground is designed strictly for offline development.

### 3. Telemetry & Rate Limiting
*   Configure Redis state caches with strict TTLs (Time-To-Live parameters) and enable token budget alert alarms (`AC-ST-302`) to monitor prompt consumption and protect against rate limit exhaustion or billing spike attacks.

---

## 🤝 Acknowledgments

We thank the open-source security researchers and developers who identify vulnerabilities, suggest defensive prompts, and contribute to keeping ArchiCheck a secure gating tool for the global developer community.
