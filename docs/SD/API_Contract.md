# API Contracts & Schemas

**Last Updated:** 2026-07-08

## 🔌 Endpoints

### `POST /api/webhook`

* **Purpose:** Webhook endpoint called by GitHub when Pull Request events (`opened`, `synchronize`) or Issue Comment events (`created`) occur.
* **Auth Required:** Yes - GitHub Webhook HMAC SHA256 signature passed in the `x-hub-signature-256` header.

**Request Header:**
```http
x-github-event: pull_request
x-hub-signature-256: sha256=2f9b88cf...
content-type: application/json
```

**Request Payload (Example pull_request event):**
```json
{
  "action": "opened",
  "pull_request": {
    "number": 101,
    "head": {
      "sha": "abcdef1234567890"
    },
    "created_at": "2026-07-08T00:10:00Z",
    "user": {
      "login": "junior-dev"
    }
  },
  "repository": {
    "name": "archi-check",
    "owner": {
      "login": "tinhct"
    }
  },
  "installation": {
    "id": 123
  }
}
```

**Response (202 Accepted):**
```json
{
  "message": "Pull request event accepted and queued for analysis",
  "pr": 101,
  "sha": "abcdef1234567890"
}
```

**Response (200 OK - Ignored/Bypass/Warn Comment):**
```json
{
  "message": "Warning comment posted to non-author commenter"
}
```

**Response (200 OK - Emergency Bypass):**
```json
{
  "message": "Emergency bypass executed successfully"
}
```

**Error Handling:**
* **401 Unauthorized (Missing signature):**
  ```json
  {
    "error": "Missing signature header"
  }
  ```
* **401 Unauthorized (Invalid signature):**
  ```json
  {
    "error": "Invalid HMAC signature"
  }
  ```
