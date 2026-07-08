# Alpha Release: Manual End-to-End Test Plan

**Target Version:** [v1.0.0-alpha] | **Execution Date:** 2026-07-08

**Tester / Developer:** Tech Lead / QA Engineer

## 🎯 Testing Objective

To manually validate the "Golden Path" (the primary user journey) and ensure all core components (UI, API Gateway, Backend Services, and Database) integrate correctly in a local/dev environment prior to automated test execution and staging deployment.

## 🏗️ Test Environment Setup (Local/Dev)

**Pre-requisites for Execution:**

- [ ] Local Next.js server is running on `localhost:3000` (`npm run dev`)
- [ ] Environment variables configured inside `.env.local` (e.g. `LLM_API_KEY`, `UPSTASH_REDIS_REST_URL`)
- [ ] Timing-safe verify signature is bypassed or mock headers are supplied for HTTP calls
- [ ] Developer console/network tab is open for monitoring

## 📦 Test Data Requirements

| Data Entity | Required State | Credentials / Mock Values |
|-------------|----------------|---------------------------|
| PR Author | Tracked Developer login | `junior-dev` |
| Bypass Admin | Tracked Repository Admin login | `techlead-admin` (role: `admin` / `maintain`) |
| Target Data | Baseline repo unified diff | Unified diff patch with complexity keywords |

---

## 🛤️ Step-by-Step E2E Execution Scripts

### E2E Flow 1: Synchronous PR Gating & Status Check Initialization

* **Description:** Verify that opening a pull request with complex changes synchronously locks the PR status checks to Pending and posts the architectural quiz comment thread.

| Step | Action (User Input) | Expected System Response | Dev/Network Validation | Actual Result (Pass/Fail) |
|------|---------------------|--------------------------|------------------------|---------------------------|
| 1.   | Start dev server via terminal: `npm run dev` | Server starts on `localhost:3000`. API route bound. | 200 OK on Vercel Edge dev route logs. | |
| 2.   | POST a mock `pull_request.opened` event to `/api/webhook` | Receives HTTP `202 Accepted` response. | Headers TimingSafe HMAC verification passes. | |
| 3.   | Check commit status checks | Commit status check `archicheck/verification` is locked to `pending`. | POST to `/repos/.../statuses` returns 201 Created. | |
| 4.   | Inspect PR comment thread | Markdown quiz comment containing files, snippet, and rationales is posted. | POST to `/repos/.../comments` returns 201 Created. | |

---

### E2E Flow 2: PR Author Quiz Response & Gate Unblocking

* **Description:** Verify that the PR author can reply with answers in technical slang (English, Vietnamese, or German) and unblock the status gate checks.

| Step | Action (User Input) | Expected System Response | Dev/Network Validation | Actual Result (Pass/Fail) |
|------|---------------------|--------------------------|------------------------|---------------------------|
| 1.   | POST an `issue_comment.created` event from `junior-dev` | Receives HTTP `202 Accepted` response. | Event verified timing-safely. | |
| 2.   | Parse commenter body text justification | Email blockquotes (`>`) are stripped from comment body. | String cleaner output extracts pure developer answer. | |
| 3.   | Run LLM validation analysis | Answer is scored by Gemini 1.5 Pro. If score >= 7, pass state triggers. | Vertex/Gemini returns schema-compliant JSON. | |
| 4.   | Verify commit check status | Gating check is unlocked and set to `success` in repository. | POST to `/repos/.../statuses` returns 201 with `success`. | |
| 5.   | Check PR comment feedback | Approved access confirmation comment is posted. | POST to `/repos/.../comments` returns 201 Created. | |

---

### E2E Flow 3: Admin Emergency Slash Command Bypass Override

* **Description:** Verify that repository maintainers can bypass the gating lock check during outages or emergencies.

| Step | Action (User Input) | Expected System Response | Dev/Network Validation | Actual Result (Pass/Fail) |
|------|---------------------|--------------------------|------------------------|---------------------------|
| 1.   | POST an `issue_comment.created` event containing `/archicheck bypass` from `techlead-admin` | Receives HTTP `202 Accepted` response. | Webhook accepts command timing-safely. | |
| 2.   | Validate commenter repository permissions | System checks if commenter role is `admin` or `maintain`. | GET `/repos/.../collaborators/.../permission` returns 200. | |
| 3.   | Mutate gate checks status | Status check context `archicheck/verification` is updated to `success`. | POST `/repos/.../statuses` sets description to "⚠️ Emergency bypass...". | |
| 4.   | Inspect PR comments logs | Bypass audit comment is injected into PR comment thread. | POST to `/repos/.../comments` returns 201. | |

---

## 🚨 Alpha Defect Reporting

*If any step above fails, log it immediately in the Sprint Defect Log.*

**Quick Log (For Local Reference):**

* **Failed Step:** [Step Number]
* **Observed Behavior:** [What actually happened?]
* **Console/Network Error:** [Paste stack trace or HTTP status code]
* **Next Action:** [E.g., Investigating auth middleware, adjusting DB schema]
