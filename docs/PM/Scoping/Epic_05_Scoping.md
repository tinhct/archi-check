# Scoping & Design Framing: Epic 5 - The "Live-Fire" Developer Toolkit

## 1. Problem
Developers and open-source contributors experience a "friction cliff" when transitioning from the local Mock LLM Sandbox to live model testing. They are forced to either blind-push commits to trigger live GitHub PR webhooks (which is slow, non-deterministic, and pollutes git history) or spend hours setting up complex tunnel routing (like ngrok) to test API integrations.

## 2. Constraints
*   **Production Quarantine**: The Local Playground route (`/playground`) must be active strictly in development (`NODE_ENV === 'development'`) and throw a 404 in production.
*   **Security Restrictions**: "Shadow Mode" webhooks must explicitly disable `/archicheck bypass` slash command parsing to prevent local test triggers from overriding actual production gate status checks.
*   **Token Budget Protection**: No external contributor testing or local runs can route to the corporate Vertex AI API keys. Mocks or personal Bring-Your-Own-Keys (BYOK) must be used.
*   **Workspace Parity**: Webhook handler code in `route.ts` must maintain a single, clean path structure, using simple env-driven flags to toggle comment posting rather than duplicating routing logic.

## 3. Success Criteria
*   Navigating to `http://localhost:3000/playground` in development renders the interactive React Playground, while doing so in production throws a clean Next.js 404 page.
*   Developers can paste a diff, select `gemini`, and get back a structured quiz from the live model using their own API key.
*   Running webhooks with `ARCHICHECK_MODE=shadow` processes incoming payloads completely but intercepts the final comment/status calls, outputting them exclusively to the local server console.
*   Executing `npm run setup:keys` triggers an interactive CLI wizard that successfully validates a developer's free-tier key, appends it to `.env.local` without corrupting existing variables, and enables `LLM_PROVIDER_TYPE=gemini`.

## 4. Candidate Approaches
*   **Approach A: Embedded React Web Page with API Route Handler**
    *   *Trade-off*: Highly interactive and visual playground, but requires maintaining a client-side React UI page and a matching `/api/playground` dev-only endpoint.
*   **Approach B: CLI-Based Interactive Diff Playground**
    *   *Trade-off*: Keeps the codebase 100% terminal-centric without needing a Next.js UI page, but offers a less intuitive UX for visual prompt engineering.
*   **Approach C: Node-RED or Third-Party Local API Visualizer Integration**
    *   *Trade-off*: Leverages pre-built visualizers, but introduces heavy external dependencies and extra configuration steps for the developer.

## 5. Historical Mitigations (Retrospective Scan)
*   **Mitigation (Env Quotes & Corruption)**: The BYOK wizard script (`setup:keys`) must parse and modify `.env.local` using variable-specific regex substitutions. This ensures it updates only `LLM_API_KEY` without corrupting or truncating other double-quoted multiline variables (e.g. `GITHUB_PRIVATE_KEY` from Sprint 1).
*   **Mitigation (VFS Test Isolation)**: Unit tests for the BYOK wizard must fully mock file system reads/writes (using `memfs` or spied functions) to prevent tests from modifying the developer's actual `.env.local` file (from Sprint 4).
*   **Mitigation (WaitUntil Safety)**: API route handlers for the playground must check `typeof waitUntil === 'function'` before executing background tasks to prevent test runners from throwing undefined exceptions (from Sprint 3).
*   **Mitigation (Playwright Extensions)**: Playground E2E UI test files must use `.spec.ts` extensions and be added to Vitest's `exclude` block in `vitest.config.ts` to prevent import collisions (from Sprint 4).

## 6. Approved Design Decisions
*   **Playground Dropdowns**: Expose a "Load Template" dropdown in the UI auto-populating diff input zones with Sprint 4 scenarios (Leaky Diff, Prompt Injection, ReDoS).
*   **Shadow Mode Output**: Format human-readable output by default. Output a single-line minified JSON string only if `ARCHICHECK_SHADOW_FORMAT=json` is active.
*   **BYOK Key Validation**: Perform a lightweight live model ping during setup, allowing developers to skip verification using the `--offline` flag.
*   **Shadow Mode Cache Isolation**: Intercept state database operations in Shadow Mode and route them to an in-memory/local mock cache, removing the necessity of Upstash Redis connection parameters.
*   **Boundary Enforcement**: Defense-in-depth approach. Enforce blocking at the Next.js Middleware edge wrapper level, backed by layout/page-level check gates invoking `notFound()` if `NODE_ENV` is production.
