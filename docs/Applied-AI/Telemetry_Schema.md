# AI Telemetry & Observability Schema

**Last Updated:** 2026-07-08

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
