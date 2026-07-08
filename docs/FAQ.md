# ArchiCheck: Frequently Asked Questions (FAQ)

**Last Updated:** 2026-07-08

**Target Audience:** End-Users, Stakeholders, and Onboarding Developers

## 📑 Table of Contents

1. [General Overview](#general-overview)
2. [Scoring & Metrics (Algorithmic Complexity)](#scoring--metrics)
3. [Security & Data Privacy](#security--data-privacy)
4. [Integrations & AI](#integrations--ai)

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
* **Standard Gate**: Locks the gate if the complexity score is $\ge 7$ (configurable via `COMPLEXITY_THRESHOLD`) **AND** the estimated AI-reliance ratio is $\ge 0.5$ (configurable via `AGENT_RELIANCE_THRESHOLD`).
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
