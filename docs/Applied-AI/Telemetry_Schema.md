# AI Telemetry & Observability Schema

**Last Updated:** 2026-07-14

## 📡 Core Logging Events

*Note: This directly feeds the Sprint Report "Burned Tokens" metric.*

**Event Payload: `ai_generation_completed`**

```json
{
  "timestamp": "ISO-8601",
  "trace_id": "uuid",
  "model_used": "string",
  "prompt_tokens": 0,
  "completion_tokens": 0,
  "total_cost_usd": 0.00,
  "latency_ms": 0,
  "successful_parse": true
}
```

**Event Payload: `user_feedback_submitted`**

```json
{
  "trace_id": "uuid",
  "rating": 1 | -1,
  "user_comment": "string"
}
```

---

## 🎮 Playground Client API Observability Schema

### Playground Phase 1 (Generate Quiz) Output Schema
In Sprint 5, the legacy `tokenCost` string estimation was replaced with strict, API-sourced token count metadata in the JSON response payload.

```json
{
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
    "input": "number",
    "output": "number",
    "total": "number"
  }
}
```

### Playground Phase 2 (Evaluate Answers) Response Schema
The `POST /api/playground/evaluate` endpoint returns a Zod-validated discriminated union keyed on the `reason` field:

#### 1. success
Returned when the justification is processed and scored by the LLM:
```json
{
  "reason": "success",
  "passed": "boolean",
  "score": "number (0-10)",
  "reasoning": "string",
  "passingThreshold": 7,
  "tokens": {
    "input": "number",
    "output": "number",
    "total": "number"
  }
}
```

#### 2. sanitizer_rejection
Returned when the developer justification fails input sanitization (credentials/leak/prompt injection scans):
```json
{
  "reason": "sanitizer_rejection",
  "passed": false,
  "score": null,
  "reasoning": "string",
  "passingThreshold": 7,
  "tokens": {
    "input": 0,
    "output": 0,
    "total": 0
  }
}
```

#### 3. llm_format_error
Returned when the LLM returns an invalid payload or non-numeric score, resulting in a parsing fallback:
```json
{
  "reason": "llm_format_error",
  "passed": false,
  "score": null,
  "reasoning": "string",
  "passingThreshold": 7,
  "tokens": {
    "input": "number",
    "output": "number",
    "total": "number"
  }
}
```

