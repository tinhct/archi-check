# AI Fallback & Degradation Strategy

**Last Updated:** 2026-07-08

## 🛡️ Failure Modes & Routing

| Trigger Condition | Primary Action | Secondary Action (Fallback) | User Experience |
|-------------------|----------------|-----------------------------|-----------------|
| **API Timeout (>15s)** | Trigger `AbortController` cancellation. | Switch to Fail-Open (default fallback questions or release commit status). | "Bypassed: System degraded (LLM timeout)." / Posts fallback questions. |
| **429 Rate Limit** | Retry x2 with exponential backoff (500ms, then 1,500ms). | Fail-open to unblock check. | "Bypassed: System degraded (Rate Limit)." / Unblocks merge. |
| **Output Parse Fail** | Catch parse exception inside SDK call. | Switch to default quiz template. | "Bypassed: System degraded (Parse Error)." / Posts default quiz. |

## 🔌 Circuit Breakers

* **Kill Switch Location:** Managed via the `LLM_PROVIDER_TYPE` environment variable scope (setting it to an invalid type or disabling it triggers fail-open by default).
* **Conditions for manual override:**
  1. Excessive Google Cloud Vertex AI endpoint outages or latency (>15s).
  2. Rate limit exhausts blocking all developer PR merges.
  3. API key compromised or credential load failure.
