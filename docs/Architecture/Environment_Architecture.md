# Environment & Infrastructure Architecture

**Last Updated:** 2026-07-10

## 🏗️ Deployment Topology

| Environment | URL / Endpoint | Infrastructure | Purpose & Access |
|-------------|----------------|----------------|------------------|
| **Local/Dev** | `http://localhost:3000` | Local Node.js / Vitest / Playwright | Developer sandbox testing. Skip guards run offline if credentials are omitted. |
| **Preview / Staging** | `https://staging-app.archicheck.com` (and dynamic Vercel PR previews) | Vercel Edge Serverless / Upstash Redis / Vertex AI Staging | QA & UAT integration testing. Previews run with `LLM_PROVIDER_TYPE=mock` to bypass live costs. |
| **Production** | `https://app.archicheck.com` | Vercel Edge Serverless / Upstash Redis / Vertex AI Enterprise | Live client PR traffic verification. Strict model validation enabled. |

## 🚀 CI/CD Pipeline Flow

* **Source Control:** Git repository hosted on GitHub. Development branches merge to `main` using PR gates.
* **Build Triggers:** Pull request updates targeting the `main` branch, or direct commits to the `main` branch.
* **Quality Gates:**
  1. ESLint Static Analysis (`npm run lint`).
  2. GitGuardian ggshield credentials leak scans (fail-open warnings in CI).
  3. Vitest test runner validation suite executions (`npm run test:run` checking parser, ReDoS, webhook states, and E2E simulation).
  4. Playwright E2E GitHub Simulation suite (`npm run test:e2e`) runs automatically on Preview deployment success, testing Scenario 3 & 4.
* **Webhook Routing Dynamic Update:** During CI preview deployment steps, a GitHub Actions task invokes the GitHub API to dynamically update the webhook URL of the QA GitHub App to match the newly generated Vercel preview domain.
* **Deployment Automation:** GitHub Actions workflows build, bundle, test, and automatically trigger deployments to Vercel staging and production environments.

## 🔐 Configuration Map (No Secrets)

| Variable Key | Description | Environment Scope |
|--------------|-------------|-------------------|
| `LLM_PROVIDER_TYPE` | Selected model provider: `gemini` (Gemini API), `vertex` (Vertex AI), or `mock` (Sandbox golden fixtures) | All Environments |
| `MOCK_GITHUB` | Intercepts GitHub Octokit requests to run offline. Set to `true` for local dev, `false` for staging/prod. | All Environments |
| `UPSTASH_REDIS_REST_URL` | REST endpoint for the serverless Redis persistence database | All Environments |
| `GITHUB_APP_ID` | Numeric identifier for the registered GitHub App integration | All Environments |
| `PLAYWRIGHT_BASE_URL` | Target domain for Playwright E2E tests (defaults to Vercel Preview URL in CI) | Staging / CI |
| `GITHUB_TOKEN` | Personal Access Token (PAT) for E2E QA Bot to open/close PRs and delete branch references | Staging / CI |
| `GITHUB_STORAGE_STATE_JSON` | Serialized session cookie state used by Playwright auth setup to bypass UI logins | Staging / CI |
| `GITHUB_USER` | QA Bot username used in authentication fallback | Staging / CI |
| `GITHUB_PASSWORD` | QA Bot password used in authentication fallback | Staging / CI |
| `GITHUB_TOTP_SECRET` | QA Bot TOTP 2FA secret used in programmatic OTP code generation | Staging / CI |

