# Environment & Infrastructure Architecture

**Last Updated:** 2026-07-08

## 🏗️ Deployment Topology

| Environment | URL / Endpoint | Infrastructure | Purpose & Access |
|-------------|----------------|----------------|------------------|
| **Local/Dev** | `http://localhost:3000` | Local Node.js / Vitest / Ngrok Static Tunnel | Developer sandbox testing. |
| **Staging** | `https://staging-app.archicheck.com` | Vercel Edge Serverless / Upstash Redis / Vertex AI Staging | QA & UAT integration testing. |
| **Production** | `https://app.archicheck.com` | Vercel Edge Serverless / Upstash Redis / Vertex AI Enterprise | Live client PR traffic verification. |

## 🚀 CI/CD Pipeline Flow

* **Source Control:** Git repository hosted on GitHub. Development branches merge to `main` using PR gates.
* **Build Triggers:** Pull request updates targeting the `main` branch, or direct commits to the `main` branch.
* **Quality Gates:**
  1. ESLint Static Analysis (`npm run lint`).
  2. GitGuardian ggshield credentials leak scans (fail-open warnings in CI).
  3. Vitest test runner validation suite executions (`npm run test:run` checking parser, ReDoS, webhook states, and E2E simulation).
* **Deployment Automation:** GitHub Actions workflows build, bundle, test, and automatically trigger deployments to Vercel staging and production environments.

## 🔐 Configuration Map (No Secrets)

| Variable Key | Description | Environment Scope |
|--------------|-------------|-------------------|
| `LLM_PROVIDER_TYPE` | Selected model provider: `gemini-developer` or `vertex` | All Environments |
| `UPSTASH_REDIS_REST_URL` | REST endpoint for the serverless Redis persistence database | All Environments |
| `GITHUB_APP_ID` | Numeric identifier for the registered GitHub App integration | All Environments |
