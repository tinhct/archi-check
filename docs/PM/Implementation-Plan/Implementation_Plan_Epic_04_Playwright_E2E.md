# Implementation Plan: Epic 4 (Playwright E2E Sandbox Integration)

**Target Story/Epic:** Epic-04 / AC-ST-405 (Playwright E2E GitHub Simulation)

**Status:** Approved

**Approved By:** tinhct/User | **Approval Date:** 2026-07-10

## 🎯 Execution Scope

* **Objective:** Enable headless, automated Playwright UI-driven E2E staging validation in CI/CD without live LLM costs, driving test branches, PR gates, quiz markdown interactions, and API teardowns.
* **Prerequisites:**
  * Interactive Sanitization Pipeline Sandbox (`AC-ST-404`) must be completed.

## 🛠️ Step-by-Step Execution Steps

| Step | Task Description | Target File(s) / Component | Validation (How to know it works) |
|------|------------------|----------------------------|-----------------------------------|
| 1    | Configure Vercel staging environments | Vercel Env Settings | Bind `LLM_PROVIDER_TYPE=mock` strictly to Vercel's `Preview` environment. |
| 2    | Add GitHub App URL update step in CI | `.github/workflows/e2e.yml` | Add step using Octokit REST API to dynamically update the webhook URL of the QA GitHub App to match the newly deployed Vercel preview domain. |
| 3    | Install `otplib` dependency for TOTP fallback | `package.json` | Add `otplib` to project dev dependencies for programmatic 2FA generation. |
| 4    | Configure Playwright storage state | `playwright.config.ts`, `tests/e2e/auth.setup.ts` | Load session storage JSON cookies from CI secrets. Implement login fallback generating OTP codes via `otplib` using the bot's TOTP secret. |
| 5    | Build programmatic E2E cleanup teardown | `tests/e2e/utils/api-teardown.ts` | Create an API teardown function using `@octokit/rest` that runs unconditionally in Playwright's `globalTeardown` to close the opened PR and force-delete the test branch. |
| 6    | Write Scenario 4 (Happy Path) Playwright E2E script | `tests/e2e/scenario4.test.ts` | Playwright triggers PR, asserts status locks, validates quiz markdown, inputs compliant response, comments, and asserts success status check unlock. |
| 7    | Write Scenario 3 (ReDoS Bomb) Playwright E2E script | `tests/e2e/scenario3.test.ts` | Playwright triggers PR with `TRIGGER_REDOS_TIMEOUT`, asserts status checks immediately bypass to success and renders the fail-open PR warning comment. |
