# Secrets Management Plan

**Last Updated:** 2026-07-08

## 🔑 Secret Storage & Injection

* **Local Development:** Configurations loaded from a local `.env.local` file. **The `.env.local` filename is strictly added to `.gitignore` and is NEVER committed to version control.**
* **CI/CD Pipeline:** Hardcoded keys are prohibited in GitHub Actions workflows. Environment variables and third-party tokens (e.g. `GITGUARDIAN_API_KEY`) are injected securely via GitHub Repository Secrets.
* **Production Environment:** Injected at Vercel deployment runtime. Vertex AI service account keys are stored as a string variable (`GOOGLE_CREDS_JSON`).

## 📜 Active Credentials Catalog (No Raw Values)

| Secret Name / Key | Purpose | Rotation Frequency | Access Scope |
|-------------------|---------|--------------------|--------------|
| `GITHUB_WEBHOOK_SECRET` | Validates HMAC signature headers on incoming webhooks | 90 Days | Webhook Route Handler |
| `GITHUB_APP_PRIVATE_KEY` | Signs JWT certificates to authenticate the GitHub App client | 180 Days | Auth Service |
| `UPSTASH_REDIS_REST_TOKEN` | Authorizes REST operations on the serverless Redis cache | 90 Days | Redis Client |
| `LLM_API_KEY` | Authorizes developer-tier Gemini model inference queries (configured via BYOK setup wizard) | 90 Days | LLM Provider Factory |
| `GOOGLE_CREDS_JSON` | GCP Service Account credentials JSON string for Vertex AI | 180 Days | LLM Provider Factory |
