# Integration Contracts & Webhooks

**Last Updated:** 2026-07-08

*Note: Core API definitions live in `/docs/Architecture/API_Contract.md`. This document tracks third-party integrations, webhooks, and asynchronous event contracts.*

## 📜 Event / Webhook Definitions

### `pull_request.opened` / `pull_request.synchronize`

* **Source:** GitHub App Integration
* **Destination:** ArchiCheck Webhook Listener `/api/webhook`
* **Expected Payload:**
```json
{
  "action": "opened",
  "number": 101,
  "pull_request": {
    "number": 101,
    "head": {
      "sha": "abcdef1234567890"
    },
    "created_at": "2026-07-08T00:00:00Z",
    "user": {
      "login": "junior-dev"
    }
  },
  "repository": {
    "name": "archi-check",
    "owner": {
      "login": "tinhct"
    }
  }
}
```
* **Failure Handling:** Gating check is synchronously locked to `pending` on entry. Analysis failures inside Next.js `waitUntil` catch block trigger fail-open success checkpoints (unblocking the PR) to prevent deadlocks.

---

### `issue_comment.created`

* **Source:** GitHub App Integration
* **Destination:** ArchiCheck Webhook Listener `/api/webhook`
* **Expected Payload:**
```json
{
  "action": "created",
  "issue": {
    "number": 101,
    "pull_request": {
      "url": "https://api.github.com/repos/tinhct/archi-check/pulls/101"
    }
  },
  "comment": {
    "body": "My quiz answers justification text string",
    "user": {
      "login": "junior-dev"
    },
    "id": 999999
  },
  "repository": {
    "name": "archi-check",
    "owner": {
      "login": "tinhct"
    }
  }
}
```
* **Failure Handling:** If the LLM justification check fails or Redis connection times out, the route defaults to a fail-open auto-approve success state to avoid locking the PR merge check.
