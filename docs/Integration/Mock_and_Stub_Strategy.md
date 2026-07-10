# Mocking & Stubbing Strategy

**Last Updated:** 2026-07-08

## 🧪 Development & CI Environments

* **Service Virtualization Tool:** Vitest framework standard mocking hooks (`vi.mock`, `vi.spyOn`).
* **Mock Data Generation:** Dummy unified diff strings containing blocklisted files/secrets and mock JSON payload templates initialized within the test specs.

## 🛑 Stub Definitions

| External Service | Mock Endpoint / Strategy | Handled Scenarios (Success/Timeout/Error) |
|------------------|--------------------------|-------------------------------------------|
| **GitHub REST (Octokit)** | Mocked client interface mapping pulls, checks, comments, and permissions. | Returns valid diffs (Success), triggers timeouts (Timeout/Circuit Breaker), and asserts signature invalid keys (Error). |
| **Upstash Redis Cache** | In-memory key-value dictionary stub simulating DB states. In Shadow Mode, instantiates an `InMemoryCache` using a JS Map to operate without credentials. | Valid state caching (Success), `Promise.race()` timeout triggers (Timeout), and client errors (Error). |
| **Gemini AI API** | GoogleGenerativeAI client mock intercepting `generateContent`. CLI validator calls `countTokens` to verify key connectivity, and local playground routes model requests dynamically. | Generates schema-compliant JSON (Success) and throws 429/5xx exceptions to verify retries (Error). |
