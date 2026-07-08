# Non-Functional Requirements (NFR)

**Last Updated:** 2026-07-08

## 📏 System Constraints & SLAs

| Category | Requirement | Target Metric / SLA | Verification Method | Status |
|----------|-------------|---------------------|---------------------|--------|
| **Performance** | Webhook Response | 95th percentile < 1,000ms | Webhook endpoint load simulation. | Active |
| **Performance** | Redis State Operations | 1,000ms strict timeout limit | `Promise.race()` timeout wrapper in `client.ts`. | Active |
| **Performance** | LLM API timeout | 15 seconds strict execution limit | `AbortController` timer in `provider.ts`. | Active |
| **Security** | Webhook Integrity | HMAC SHA256 Signature verification | Node `crypto.timingSafeEqual` signature checks. | Active |
| **Security** | Secret Scrubbing | Zero raw leakages of credentials | LOOKBEHIND regex sanitization in `sanitizer.ts`. | Active |
| **Security** | AI Training Compliance | Enterprise-tier compliance | Google Cloud Vertex AI enterprise APIs (zero data logs). | Active |
| **Robustness** | RegExp Execution Protection | Safeguard Event Loop against ReDoS | 500-character line truncation & 500ms CPU watchers. | Active |
| **Reliability** | Fail-Open Availability | Outages must not block PR merges | Catch blocks post warnings and unblock checks. | Active |
