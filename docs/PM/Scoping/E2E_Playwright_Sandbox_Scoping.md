# Scoping & Design Framing: Playwright E2E GitHub Simulation

## 1. Problem
Developers and QA engineers lack a cost-effective, deterministic, and high-fidelity way to validate the entire end-to-end developer experience (PR gating, markdown quiz rendering, status checks, comment replies, and lock/unlock cycles) in staging. Connecting staging to live LLMs is prohibitively expensive ($3,500 token budget) and non-deterministic, while local unit tests do not validate actual browser-level UI interactions on GitHub.

## 2. Constraints
*   **Security Quarantine**: Must strictly prevent `LLM_PROVIDER_TYPE=mock` from executing when `NODE_ENV=production`.
*   **Golden Fixtures**: Must utilize the committed `.archicheck.mock.json` scenarios to ensure parity between local development and staging tests.
*   **Execution Stability**: Playwright tests must run headlessly in CI (GitHub Actions) without triggering GitHub's rate limits, spam filters, or 2FA challenge screens.
*   **Environment Agnosticism**: Webhook endpoint code must not require modifications when toggling between the mock provider and live Vertex AI endpoints.

## 3. Success Criteria
*   The Vercel Staging preview environment is provisioned with `LLM_PROVIDER_TYPE=mock` and successfully parses `.archicheck.mock.json`.
*   Playwright E2E scripts successfully execute Scenario 4 (Perfect Loop), asserting that status checks transition from `Pending` (locking the PR) to `Success` (unlocking the PR) after submitting a valid reply.
*   Playwright E2E scripts successfully execute Scenario 3 (ReDoS Bomb), asserting that status checks fail-open to `Success` with the warning description `⚠️ Custom secret sanitizer timed out. Gate bypassed.` when encountering `TRIGGER_REDOS_TIMEOUT`.
*   Tests execute and report results within standard CI build time limits (< 5 minutes).

## 4. Candidate Approaches
*   **Approach A: UI-Driven Playwright Automation on Live GitHub Staging**
    *   *Trade-off*: Maximum fidelity testing the real GitHub UI, but introduces dependency on GitHub's external network uptime, credentials provisioning, and potential 2FA/bot challenges.
*   **Approach B: Localhost Playwright Integration Tests**
    *   *Trade-off*: Fast, fully offline, and easily bypasses 2FA/auth barriers, but fails to validate Vercel staging deployment parity.
*   **Approach C: Webhook Payload Mocking with Cypress Component Tests**
    *   *Trade-off*: Simulates the webhook responses and status checks in a virtual environment without hitting the actual GitHub UI. Fast and cheap, but doesn't test the actual developer browser interaction.

## 5. Open Questions
*   How will the staging Playwright CI pipeline bypass 2FA challenges for the `archicheck-qa-bot` account (e.g., using personal access tokens, GitHub App installation tokens, or cookies)?
*   Do we have a cleanup script to programmatically close/delete test PRs and comments created during the staging run to prevent repository pollution?
*   Should the staging build environment require a separate `.env.staging` file or use Vercel project environment overrides?
