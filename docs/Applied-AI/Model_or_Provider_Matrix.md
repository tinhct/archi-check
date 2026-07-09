# LLM Provider & Model Matrix

**Last Updated:** 2026-07-08

## 🧠 Active Models in Production

| Capability | Primary Model | Provider | Context Window | Max Output Tokens | Justification |
|------------|---------------|----------|----------------|-------------------|---------------|
| **Heavy Reasoning & Diff Parsing** | `gemini-2.5-flash` | Google / Vertex AI | 1M Tokens | 8k | High-speed code pattern analysis, large context limits (ideal for Git diffs), native JSON schemas, fully compatible with newest AQ. keys. |

## 💸 Cost & QuQuota Constraints

* **Monthly Budget Cap:** $200.00 (gated via telemetry audits and alert threshold triggers).
* **Rate Limits:**
  * Developer Tier: 360 RPM (Requests Per Minute) / 2M TPM (Tokens Per Minute).
  * Vertex AI Tier: 120 RPM (Standard service quotas, can scale as needed).
