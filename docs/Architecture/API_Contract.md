# API Contracts & Schemas

**Last Updated:** 2026-07-12

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

---

### `POST /api/playground` *(Dev-only — blocked in production)*

* **Purpose:** Phase 1 of the Local AI Playground. Accepts a raw git diff, sanitizes it, and calls the configured LLM to generate architectural comprehension quiz questions.
* **Auth Required:** No (local dev only — middleware returns 404 in production)
* **Runtime:** Edge (Next.js default)

**Request Body:**
```json
{
  "diff": "string (raw unified git diff, max 50,000 chars)",
  "provider": "mock | gemini-developer"
}
```

**Response (200 OK):**
```json
{
  "sanitizedDiff": "string",
  "quiz": {
    "questions": [
      {
        "id": "string",
        "question": "string",
        "targetFile": "string",
        "codeSnippet": "string",
        "rationale": "string"
      }
    ]
  },
  "tokens": {
    "input": 1234,
    "output": 567,
    "total": 1801
  }
}
```

**Response (400 Bad Request):**
```json
{ "error": "Human-readable validation error message." }
```

---

### `POST /api/playground/evaluate` *(Dev-only — blocked in production)*

* **Purpose:** Phase 2 of the Local AI Playground. Accepts the diff, generated quiz, and developer replies, then calls `validateAnswers` to grade the responses.
* **Auth Required:** No (local dev only — middleware + `notFound()` return 404 in production)
* **Runtime:** Node.js (explicit `export const runtime = 'nodejs'`)

**Request Body:**
```json
{
  "diff": "string (max 50,000 chars)",
  "quizJson": "Quiz[] (max 20 items, validated against QuizSchema)",
  "reply": "string (min 20, max 10,000 chars — structured Q/A format from UI)"
}
```

**Response (400 Bad Request)** — Structural validation failures only:
```json
{ "error": "Human-readable validation error message." }
```

**Response (200 OK)** — Discriminated union, three variants:

```json
// Variant 1: success
{
  "reason": "success",
  "passed": true,
  "score": 8,
  "reasoning": "Detailed LLM reasoning string",
  "passingThreshold": 7,
  "tokens": { "input": 800, "output": 200, "total": 1000 }
}

// Variant 2: sanitizer_rejection
{
  "reason": "sanitizer_rejection",
  "passed": false,
  "score": null,
  "reasoning": "Rejected by input sanitizer: sensitive or malicious content detected in reply.",
  "passingThreshold": 7,
  "tokens": { "input": 0, "output": 0, "total": 0 }
}

// Variant 3: llm_format_error
{
  "reason": "llm_format_error",
  "passed": false,
  "score": null,
  "reasoning": "LLM formatting error: Score out of bounds or unparseable.",
  "passingThreshold": 7,
  "tokens": { "input": 500, "output": 50, "total": 550 }
}
```

> [!NOTE]
> All three variants return **HTTP 200 OK**. The discriminated union on `reason` is the mechanism for distinguishing application-level outcomes. HTTP 400 is reserved exclusively for structural validation failures that prevent the pipeline from running at all (see ADR-011).


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
