# Connectivity Troubleshooting Runbook

**Last Updated:** 2026-07-14

## 🔌 Network & Access Architecture

* **VPC / IP Whitelisting Requirements:** Vercel Edge functions execute on dynamic global serverless nodes. If whitelisting is required by corporate database proxies, configure outgoing routes to accept requests to Upstash REST domains (`*.upstash.io`) and Google Cloud Vertex AI regions (`*.googleapis.com`).
* **Proxy/Gateway Configuration:** GitHub Webhook delivery endpoints route directly to `/api/webhook` without intermediate proxies. Timing-safe verification is enforced inside the route controller.

## 🚑 Incident Resolution Steps

| Symptom / Error Code | Potential Root Cause | Immediate Diagnostic Steps | Resolution Action |
|----------------------|----------------------|----------------------------|-------------------|
| **HTTP 401: Invalid signature** | Mismatch between repository webhook config and Vercel secrets. | Check Vercel serverless logs for timing-safe mismatch reports. | Re-configure and redeploy `GITHUB_WEBHOOK_SECRET` environment variable in Vercel. |
| **Error: redis_write_failure** | Upstash Redis connection timeout (>1,000ms) or database is offline. | Check Upstash console metrics panel and REST connection statuses. | Fail-open logic auto-approves the status check. If persistent, rotate `UPSTASH_REDIS_REST_TOKEN` credentials. |
| **Error: generateContent failed** | Vertex AI service account JSON parsing error or API keys expired. | Verify that the Vercel environment variable `GOOGLE_CREDS_JSON` is valid JSON. | Re-generate and rotate GCP service account key files and redeploy. |
| **HTTP 429: Rate Limit** | standard Developer key token consumption has exceeded quota thresholds. | Check rate limit headers returned by Gemini developer APIs. | Standard exponential backoffs handle 2 retries. If persistent, switch to enterprise Vertex AI endpoint. |
| **HTTP 404: Endpoint Not Found** | GitHub Webhook URL path is misconfigured (missing `/api/webhook` suffix). | Check ngrok logs or GitHub App Recent Deliveries. If response is HTML, path is missing. | Update Webhook URL in GitHub App Settings to include `/api/webhook`. |
| **HTTP 502: Bad Gateway** | ngrok tunnel is active but local dev server is offline or running on a different port. | Verify Next.js dev server status and port in console (e.g. port 3000 occupied, fell back to 3001). | Run `npm run dev` to start dev server, or restart ngrok using the correct port: `ngrok http 3001`. |
| **TypeError: Cannot read properties... (issues)** | `@octokit/app` initialized without custom REST-enabled Octokit class. | Inspect error stack trace in dev server terminal. | Pass custom `Octokit` class as constructor options to the `new App(...)` instantiation. |

