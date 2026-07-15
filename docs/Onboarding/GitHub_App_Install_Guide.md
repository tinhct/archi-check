# GitHub App Installation Guide (Self-Hosted)

**Last Updated:** 2026-07-16

This guide walks you through registering your own GitHub App, connecting it to your locally running (or Vercel-deployed) ArchiCheck server, and installing it on the repositories you want to gate.

> [!TIP]
> **New to ArchiCheck?** Start with the [README Quick Start](../../README.md#️-quick-start) first, then return here to connect your GitHub App.

> [!IMPORTANT]
> This guide covers **self-hosting only** — you register your own GitHub App under your own GitHub account or organization. This gives you full control over permissions, webhook secrets, and private key rotation.

---

## 📋 Prerequisites

Before you start, ensure you have:

- [x] Cloned the repository and completed the [Quick Start](../../README.md#️-quick-start) steps.
- [x] A running ArchiCheck server — either locally via `npm run dev` (with a tunnel, e.g. [ngrok](https://ngrok.com)) or deployed to [Vercel](https://vercel.com).
- [x] A GitHub account (personal or organization).
- [x] An [Upstash Redis](https://upstash.com) database (free tier works). Get your REST URL and token from the Upstash console.

---

## 🌐 Step 1 — Get Your Public Webhook URL

ArchiCheck must be reachable by GitHub's webhook delivery system. Depending on your setup:

### Option A: Local Development (via ngrok)

1. Start your local server:
   ```bash
   npm run dev
   ```
2. In a separate terminal, expose port 3000 publicly:
   ```bash
   ngrok http 3000
   ```
3. Copy the generated `https` URL (e.g. `https://abc123.ngrok-free.app`).
4. Your webhook URL will be:
   ```
   https://abc123.ngrok-free.app/api/webhook
   ```

> [!NOTE]
> Free ngrok URLs change every time you restart. For persistent local testing, use a [static ngrok domain](https://ngrok.com/docs/getting-started/#step-3-put-it-online) or switch to Vercel.

### Option B: Vercel Deployment

After deploying to Vercel, your webhook URL will be:
```
https://<your-project-name>.vercel.app/api/webhook
```

---

## ⚙️ Step 2 — Register a New GitHub App

1. Go to **GitHub → Settings → Developer settings → GitHub Apps** → **New GitHub App**:
   - [Personal Account](https://github.com/settings/apps/new)
   - [Organization](https://github.com/organizations/YOUR_ORG/settings/apps/new) *(replace `YOUR_ORG`)*

2. Fill in the following fields:

   | Field | Value |
   |-------|-------|
   | **GitHub App name** | `ArchiCheck` (or any unique name) |
   | **Homepage URL** | Your repo URL (e.g. `https://github.com/tinhct/archi-check`) |
   | **Webhook URL** | Your URL from Step 1 (e.g. `https://abc123.ngrok-free.app/api/webhook`) |
   | **Webhook secret** | A strong random string — save this, it becomes `GITHUB_WEBHOOK_SECRET` |

   Generate a random webhook secret with:
   ```bash
   openssl rand -hex 20
   ```

3. Under **Repository permissions**, set the following:

   | Permission | Access Level |
   |------------|-------------|
   | **Commit statuses** | Read & write |
   | **Contents** | Read-only |
   | **Issues** | Read & write |
   | **Pull requests** | Read & write |
   | **Metadata** | Read-only *(auto-selected)* |

4. Under **Subscribe to events**, check:
   - [x] **Pull request**
   - [x] **Issue comment**

5. Under **Where can this GitHub App be installed?**, select **Only on this account** for private use, or **Any account** if you plan to share it.

6. Click **Create GitHub App**.

---

## 🔑 Step 3 — Get Your App Credentials

After creating the app, you need three values for your `.env.local`:

### 3a. App ID
On your App's settings page, note the **App ID** shown near the top (e.g. `123456`).

### 3b. Private Key
Scroll down to **Private keys** → click **Generate a private key**.

GitHub downloads a `.pem` file. Convert it to a single-line format for `.env.local`:

```bash
# Run this in your terminal (replace the filename with your downloaded file)
awk 'NF {sub(/\r/, ""); printf "%s\\n", $0}' ~/Downloads/your-app-name.YYYY-MM-DD.private-key.pem
```

Copy the entire output — it will look like:
```
-----BEGIN RSA PRIVATE KEY-----\nMIIEpAI...\n-----END RSA PRIVATE KEY-----\n
```

### 3c. Webhook Secret
This is the random string you generated and entered in Step 2.

---

## 📝 Step 4 — Configure `.env.local`

Open `.env.local` in your project root (created automatically by `npm install` from `.env.example`) and fill in:

```bash
# ─── GitHub App Configurations ────────────────────────────────────────────────
GITHUB_APP_ID=123456
# Wrap the private key in double-quotes and keep it as a single line with \n escapes:
GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nMIIEpAI...\n-----END RSA PRIVATE KEY-----\n"
GITHUB_WEBHOOK_SECRET=your-random-webhook-secret

# ─── Upstash Redis ─────────────────────────────────────────────────────────────
UPSTASH_REDIS_REST_URL=https://your-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-upstash-token

# ─── LLM Provider ──────────────────────────────────────────────────────────────
# Start with mock to test locally without API costs:
LLM_PROVIDER_TYPE=mock
# Switch to gemini-developer for live-fire testing (requires a free Gemini API key):
# LLM_PROVIDER_TYPE=gemini-developer
# LLM_API_KEY=your-gemini-api-key
```

> [!IMPORTANT]
> The `GITHUB_PRIVATE_KEY` must be wrapped in **double quotes** and use `\n` (backslash-n) as line separators — **not** actual newlines. The application automatically converts `\n` to real newlines at boot time.

---

## 📦 Step 5 — Install the App on Your Target Repository

1. On your GitHub App settings page, click **Install App** in the left sidebar.
2. Click **Install** next to your account or organization.
3. Select **Only select repositories** and choose the repositories you want ArchiCheck to gate.
4. Click **Install**.

GitHub will now send webhook events for pull request activity on those repositories to your ArchiCheck server.

---

## 🧪 Step 6 — Test the Connection

1. Restart your dev server to pick up the new environment variables:
   ```bash
   npm run dev
   ```

2. Open a pull request (or synchronize an existing one) in one of the installed repositories.

3. Watch your terminal for incoming webhook events:
   ```
   POST /api/webhook 202 in 800ms
   [ArchiCheck] Processing PR #12 in your-org/your-repo
   ```

4. If you see `POST /api/webhook 401`, your `GITHUB_WEBHOOK_SECRET` does not match the one configured in your GitHub App. Double-check both values.

5. If you see `POST /api/webhook 200 in 7ms` (fast response with no processing logs), the PR diff did not meet the complexity threshold — this is expected for small changes. Refer to the [FAQ](../FAQ.md#scoring--metrics) for how scoring works.

---

## 🗂️ Step 7 — Add `.archicheck.yml` to Your Target Repository

To activate custom gating thresholds on a repository, commit a `.archicheck.yml` file to the **feature branch** of your pull request:

```yaml
# .archicheck.yml
algorithmic_complexity_score: 5      # Gate PRs scoring 5 or higher (1–10)
ai_reliance_ratio: 0.7              # Gate if AI reliance is >= 70% (0.0–1.0)
lines_added_threshold: 300          # Min code additions to trigger Velocity Gate
excluded_paths:
  - "**/node_modules/**"
  - "package-lock.json"
  - "yarn.lock"
```

> [!IMPORTANT]
> **The `.archicheck.yml` must be on your PR's feature branch**, not just on `main`. ArchiCheck loads configuration from the head commit SHA of the incoming pull request.

---

## 🔗 Related Resources

- [Connectivity Troubleshooting Runbook](../Integration/Connectivity_Runbook.md) — diagnose webhook signature errors, Redis timeouts, and ngrok issues.
- [FAQ Guide](../FAQ.md) — explains scoring, bypass commands, data privacy, and the Local AI Playground.
- [`.env.example`](../../.env.example) — full annotated reference for all supported environment variables.
