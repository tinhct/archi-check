# LLM Provider & Model Matrix

**Last Updated:** 2026-07-08

## 🧠 Active Models in Production

| Capability | Primary Model | Provider | Context Window | Max Output Tokens | Justification |
|------------|---------------|----------|----------------|-------------------|---------------|
| **Heavy Reasoning & Diff Parsing** | `gemini-1.5-pro` | Google / Vertex AI | 2M Tokens | 8k | Complex code pattern analysis, massive context limits (ideal for Git diffs), native JSON schemas. |

## 💸 Cost & QuQuota Constraints

* **Monthly Budget Cap:** $200.00 (gated via telemetry audits and alert threshold triggers).
* **Rate Limits:**
  * Developer Tier: 360 RPM (Requests Per Minute) / 2M TPM (Tokens Per Minute).
  * Vertex AI Tier: 120 RPM (Standard service quotas, can scale as needed).
