# Logging & Monitoring Plan

**Last Updated:** 2026-07-08

## 📊 Telemetry & Audit Trails

| Log Type | Data Captured | Retention Period | Storage Location |
|----------|---------------|------------------|------------------|
| **Access Logs** | IP, User ID, HTTP Method, Endpoint, Status | 1 Year | Vercel Router Logs |
| **Error Logs** | Stack trace, Failed service component, PR ID | 30 Days | Vercel Serverless Logs |
| **Secret Redacted Logs** | JSON: `{"event":"secret_scrubbed","pr_id":"...","file_path":"...","rule_name":"..."}` | 30 Days | Vercel Serverless Logs |
| **Bypass Override Logs** | JSON: `{"event":"bypass_executed","pr_id":"...","user":"...","role":"..."}` | 30 Days | Vercel Serverless Logs |
| **Token Burn Logs** | JSON: `{"event":"llm_tokens_consumed","prompt_tokens":x,"completion_tokens":y}` | 30 Days | Vercel Serverless Logs |

*Note: Raw secret matches and raw diff contents are strictly excluded from console logs to prevent secondary leakage.*

## 🚨 Alerting Thresholds

* **Critical Alert Trigger (Signature Spoofing):**
  * *Condition:* > 10 `Invalid HMAC signature` webhook failures in a 5-minute window.
  * *Incident Response Routing:* Slack notification to the DevSecOps on-call channel (indicates webhook manipulation attempts).
* **Critical Alert Trigger (Redis State Outage):**
  * *Condition:* > 5 `redis_write_failure` or `redis_read_failure` events in a 5-minute window.
  * *Incident Response Routing:* PagerDuty route to DevOps SRE (indicates Upstash Redis cache is unreachable).
* **High Alert Trigger (Budget Ceiling):**
  * *Condition:* Cumulative token consumption exceeds 90% of the $200 sprint limit.
  * *Incident Response Routing:* Email alert to Product Owner & Agile PM to halt active cohort integrations.
