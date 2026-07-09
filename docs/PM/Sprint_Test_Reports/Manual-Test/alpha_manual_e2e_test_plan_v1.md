# Alpha Release: Manual End-to-End Test Plan (v1)

**Target Version:** [v1.0.0-alpha] | **Draft Date:** 2026-07-09

**Tester / Developer:** tinhct

## 🎯 Testing Objective

To manually validate the core integration webhook flow, emergency bypass slash commands, local Mock LLM provider gating checks, and custom `.archicheck.yml` configuration parsing in the local environment.

## 🏗️ Test Environment Setup (Local/Dev)

**Pre-requisites for Execution:**

- [ ] Local Next.js server is running on `localhost:3000` (`npm run dev`)
- [ ] Environment variables configured inside `.env.local`:
  ```bash
  # Enable Mock Mode for GitHub API interactions
  MOCK_GITHUB=true
  # Set LLM Provider Type to 'mock' to evaluate responses offline without API keys
  LLM_PROVIDER_TYPE=mock
  # Default Upstash REST cache URL and Token (mock endpoint is fine for testing)
  UPSTASH_REDIS_REST_URL=https://mock.upstash.io
  UPSTASH_REDIS_REST_TOKEN=mock-token
  ```
- [ ] Next.js terminal console is visible to monitor mock console outputs (e.g. `[Mock GitHub] createCommitStatus called`)

## 📦 Test Data Requirements

| Data Entity | Required State | Credentials / Mock Values |
|-------------|----------------|---------------------------|
| PR Author | Tracked Developer login | `junior-dev` |
| Bypass Admin | Tracked Repository Admin login | `techlead-admin` (role: `admin` / `maintain`) |
| Custom Config | Repository configuration file | `.archicheck.yml` |

---

## 🛤️ Step-by-Step E2E Execution Scripts

### E2E Flow 1: Synchronous PR Gating & Status Check Initialization
* **Description:** Verify that opening a pull request with complex changes synchronously locks the PR status checks to Pending and posts the architectural quiz comment thread.

| Step | Action (User Input) | Action Details | Expected System Response | Dev/Network Validation | Actual Result (Pass/Fail) |
|------|---------------------|----------------|--------------------------|------------------------|---------------------------|
| 1.   | Start Next.js App | Run `npm run dev` in the root workspace terminal. | Server starts on `localhost:3000`. API route bound. | 200 OK on Vercel Edge dev route logs. | [ ] Pass / [ ] Fail |
| 2.   | POST a mock `pull_request.opened` event | Run `npx vite-node scratch/trigger_webhook.ts opened`. | Receives HTTP `202 Accepted` response. | Headers TimingSafe HMAC verification passes. | [ ] Pass / [ ] Fail |
| 3.   | Check commit status checks | Inspect Next.js dev server terminal logs. | `[Mock GitHub] createCommitStatus called` shows state: `'pending'` and description: `'ArchiCheck is evaluating your pull request changes...'`. | POST to `/repos/.../statuses` returns 201. | [ ] Pass / [ ] Fail |
| 4.   | Inspect PR comment thread | Inspect Next.js dev server terminal logs. | `[Mock GitHub] createComment called` containing the generated quiz questions is printed. | Stored state in Upstash Redis cache namespace. | [ ] Pass / [ ] Fail |

---

### E2E Flow 2: PR Author Quiz Response & Gate Unblocking
* **Description:** Verify that the PR author can reply with answers and unblock the status gate checks.

| Step | Action (User Input) | Action Details | Expected System Response | Dev/Network Validation | Actual Result (Pass/Fail) |
|------|---------------------|----------------|--------------------------|------------------------|---------------------------|
| 1.   | POST an `issue_comment.created` event | Run `npx vite-node scratch/trigger_webhook.ts comment`. | Receives HTTP `202 Accepted` response. | Event verified timing-safely. | [ ] Pass / [ ] Fail |
| 2.   | Parse commenter body text justification | Check the terminal console logs of your running Next.js dev server. | Email blockquotes (`>`) are stripped from comment body. | String cleaner output extracts pure developer answer. | [ ] Pass / [ ] Fail |
| 3.   | Run LLM validation analysis | Check terminal console logs for LLM scoring outputs (score 0-10). | Answer is evaluated. If score >= 7, pass state triggers. | Mock/Gemini returns schema-compliant JSON. | [ ] Pass / [ ] Fail |
| 4.   | Verify commit check status | Inspect dev server terminal. | `[Mock GitHub] createCommitStatus called` showing state: `'success'` and description: `'Verification complete! Approved.'`. | Status check updates state value to `success`. | [ ] Pass / [ ] Fail |

---

### E2E Flow 3: Admin Emergency Slash Command Bypass Override
* **Description:** Verify that repository maintainers can bypass the gating lock check during outages or emergencies.

| Step | Action (User Input) | Action Details | Expected System Response | Dev/Network Validation | Actual Result (Pass/Fail) |
|------|---------------------|----------------|--------------------------|------------------------|---------------------------|
| 1.   | POST an `issue_comment.created` event containing bypass | Run `npx vite-node scratch/trigger_webhook.ts bypass`. | Receives HTTP `202 Accepted` response. | Webhook accepts command timing-safely. | [ ] Pass / [ ] Fail |
| 2.   | Validate commenter repository permissions | Check dev server terminal console logs. | `[Mock GitHub] getCollaboratorPermissionLevel called` verifying commenter role is `admin` or `maintain`. | GET `/repos/.../collaborators/.../permission` returns 200. | [ ] Pass / [ ] Fail |
| 3.   | Mutate gate checks status | Inspect dev server terminal. | `[Mock GitHub] createCommitStatus called` with `state: 'success'` and description `"⚠️ Emergency bypass..."`. | Status check context `archicheck/verification` is updated to `success`. | [ ] Pass / [ ] Fail |

---

### E2E Flow 4: Repository Customization (.archicheck.yml) & Local Mock LLM Gating
* **Description:** Verify that custom thresholds and path exclusions govern PR gating checks, and the mock LLM evaluates developer answers locally based on response length.

| Step | Action (User Input) | Action Details | Expected System Response | Dev/Network Validation | Actual Result (Pass/Fail) |
|------|---------------------|----------------|--------------------------|------------------------|---------------------------|
| 1.   | Create local `.archicheck.yml` configuration | Create `.archicheck.yml` in the root repository directory containing:<br>```yaml<br>lines_added_threshold: 50<br>excluded_paths:<br>  - '**/ignored-dir/**'<br>``` | Custom configuration file is registered. | Parser matches file parameters correctly. | [ ] Pass / [ ] Fail |
| 2.   | Trigger `opened` event inside ignored path | Run `npx vite-node scratch/trigger_webhook.ts opened-ignored`. | Receives HTTP `202 Accepted`. PR is bypassed. | Next.js logs show: `Bypassed: Changes do not meet complexity thresholds.` because `src/ignored-dir/file.ts` is excluded. | [ ] Pass / [ ] Fail |
| 3.   | Trigger `opened` event in gated path | Run `npx vite-node scratch/trigger_webhook.ts opened-gated`. | Receives HTTP `202 Accepted`. PR gets gated. | Next.js logs print `[Mock GitHub] createComment called` with mock questions. | [ ] Pass / [ ] Fail |
| 4.   | Submit brief reply justification | Run `npx vite-node scratch/trigger_webhook.ts comment "Too short"`. | Receives HTTP `202 Accepted`. PR remains gated. | Next.js logs print `[Mock GitHub] createComment called` with nudge warning. | [ ] Pass / [ ] Fail |
| 5.   | Submit detailed reply justification | Run `npx vite-node scratch/trigger_webhook.ts comment "This is a detailed explanation answering the mock quiz questions."`. | Receives HTTP `202 Accepted`. PR check unlocks. | Next.js logs print `[Mock GitHub] createCommitStatus called` with `state: 'success'`. | [ ] Pass / [ ] Fail |

---

## 🚨 Alpha Defect Reporting

*If any step above fails, log it immediately in the Sprint Defect Log.*

**Quick Log (For Local Reference):**

* **Failed Step:** [Step Number]
* **Observed Behavior:** [What actually happened?]
* **Console/Network Error:** [Paste stack trace or HTTP status code]
* **Next Action:** [E.g., Investigating auth middleware, adjusting DB schema]
