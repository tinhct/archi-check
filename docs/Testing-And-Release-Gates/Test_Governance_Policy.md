# ArchiCheck Test Governance & Coverage Policy

**Last Updated:** 2026-07-12

**Owner:** Senior QA Automation Engineer

To ensure enterprise-grade reliability, all code generated for ArchiCheck must adhere to the following mandatory test governance rules before being submitted for manual validation or deployment.

## 1. Boundary & Regex Test Governance

*(Applies to data sanitizers, string parsing, and regular expressions)*

* **Format Variations:** Test `camelCase`, `snake_case`, `UPPERCASE`, and hyphenated variations.
* **Delimiter Variations:** Test assignments using different operators (`=`, `:`), space layouts, and tab indents.
* **Explicit Negative Exclusions:** Assert non-sensitive strings embedding target keywords (e.g., test `monkey` vs `key`, `isAuthorized` vs `auth`) to prevent false-positive regressions.
* **Coverage Gate:** 100% branch and line coverage required for modified regex/parsing files.

## 2. Algorithmic & Scoring Test Governance

*(Applies to the Algorithmic Complexity Scoring Engine)*

* **Deterministic Output:** Assert that processing identical ASTs or codebases yields the exact same complexity score repeatedly.
* **Zero & Null States:** Assert graceful baselines (e.g., returning 0) when scanning empty repositories or zero-line files. Prevent `NaN` or `DivideByZero` exceptions.
* **Threshold Overflows:** Intentionally push metric inputs (like Coupling Weights) to maximum limits to ensure the final calculated score caps correctly at 100.

## 3. API & Payload Contract Governance

*(Applies to webhooks, external integrations, and API endpoints)*

* **Malformed Schemas:** Test endpoints against missing required keys, unexpected `null` values, and nested anomalies.
* **Type Coercion Defense:** Assert `400 Bad Request` rejections for type-mismatches (e.g., rejecting a string `"100"` when the schema requires an integer).
* **Payload Limits:** Verify the system safely rejects payloads exceeding size limits without crashing the process or leaking memory.

## 4. Concurrency & Timeout Governance

*(Applies to asynchronous operations and large file scans)*

* **Timeout Assertions:** Mock delayed responses on external calls. Assert the system times out gracefully based on the SLA (e.g., 5s) and returns a formatted error object.
* **Race Conditions:** Simulate parallel triggers (e.g., simultaneous webhook payloads) to verify database locks and prevent duplicate record creation.

## 5. RBAC & Negative Access Governance

*(Applies to security, permissions, and manual release gates)*

* **Explicit Denial:** Assert that unauthorized roles attempting restricted actions receive a clean `403 Forbidden` rather than a generic `500 Internal Server Error`.
* **Privilege Escalation:** Intentionally alter JWT payloads or tokens in mock environments to assert backend signature invalidation.

## 6. Artifact & Render Governance

*(Applies to AI-generated Markdown and Mermaid.js diagrams)*

* **Parser Safety:** Inject reserved characters (quotes, brackets, ampersands) into UI data/graph nodes to assert the parser sanitizes inputs and renders without crashing.
* **Template Hydration:** Assert that all template placeholders (e.g., `[YYYY-MM-DD]`) are fully replaced during report generation.
