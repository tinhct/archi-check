# System Threat Model (STRIDE)

**Last Updated:** 2026-07-15

## 🎯 Threat Landscape Visualization

```mermaid
flowchart TD
    %% Define Boundaries
    subgraph "Trust Boundary: Public Internet"
        GitHub[GitHub Webhook Service]
    end
    
    subgraph "Trust Boundary: Edge Serverless (Vercel)"
        App[ArchiCheck Webhook App]
    end
    
    subgraph "Trust Boundary: Secure Private Networks"
        Redis[(Upstash Redis Cache)]
        LLM[Vertex AI / Gemini API]
    end

    %% Flows
    GitHub -->|1. POST Event Payload & Signature (HTTPS)| App
    App -->|2. Verify Webhook HMAC TimingSafe| App
    App -->|3. GET Diff & PR Collaborator Roles (HTTPS)| GitHub
    App -->|4. Store & Fetch QuizState (REST)| Redis
    App -->|5. Evaluate Diff & Validate Justification (HTTPS)| LLM
```

## 🛡️ STRIDE Assessment

| Component / Flow | Spoofing | Tampering | Repudiation | Information Disclosure | Denial of Service | Elevation of Privilege | Mitigation | Date Added / Updated |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| **GitHub Webhook Ingestion** | Yes | Yes | No | No | Yes | No | **HMAC Verification**: Validate `x-hub-signature-256` signature using timing-safe comparisons (`crypto.timingSafeEqual`). | 2026-07-06 |
| **Justification Validation** | No | Yes | Yes | No | No | Yes | **PR Author Restricting & Tag Sanitizer**: Reject replies from non-authors. Sanitize user inputs (`sanitizePromptInput`) by escaping XML tag boundaries (`</answers>`, `</diff>`) to block template escapes. | 2026-07-07 |
| **Emergency Bypass Control** | Yes | No | Yes | No | No | Yes | **Collaborator Role Check**: Verify commenter permission level (`admin`/`maintain`) before releasing gate locks. | 2026-07-07 |
| **Secret Sanitizer Engine** | No | No | No | Yes | Yes | No | **Lookbehind Scrubber & watchdogs**: Use ECMAScript lookbehinds to redact values; truncate lines >500 chars and halt regex after 500ms. | 2026-07-07 |
| **State Caching** | Yes | Yes | No | Yes | Yes | No | **Upstash TLS**: Use secure REST endpoints with a 1,000ms timeout circuit breaker, failing open to prevent build hangs. | 2026-07-07 |
| **LLM Inference** | Yes | No | No | Yes | Yes | No | **Defensive System Prompts & Compliance**: Inject strict security instructions directing the model to ignore injected commands inside diff/answers blocks. Call GCP Vertex AI endpoints (zero data retention policy) with 15s timeouts. | 2026-07-08 |
| **Mock LLM Activation** | No | Yes | No | No | No | Yes | **Production Block Constraint**: Zod schema in `env.ts` explicitly rejects `LLM_PROVIDER_TYPE=mock` when `NODE_ENV === 'production'` to prevent mock bypass in production. | 2026-07-09 |
| **YAML Config Parser** | No | Yes | No | No | Yes | No | **Size Limiter & Graceful Fallback**: Enforce 50KB maximum size check on fetched `.archicheck.yml` string. Wrap YAML parsing in `try/catch` and validate schemas via Zod defaults. | 2026-07-09 |
| **Local Mock LLM Sandbox** | No | Yes | No | No | Yes | No | **Fast-Fail & Quarantine**: Throw fatal exceptions on malformed config JSON to prevent phantom bugs; keep loading logic strictly quarantined from production runs. | 2026-07-09 |
| **Local Playground Route Escape** | Yes | No | No | Yes | Yes | Yes | **Edge Middleware Blocking & Page Guards**: Impenetrable Next.js Middleware edge path blocking combined with component-level notFound() checks when `process.env.NODE_ENV === 'production'`. | 2026-07-10 |
| **Shadow Mode Command Leakage** | No | Yes | No | No | No | Yes | **Bypass Disabling**: Hardcode bypass slash command parser execution to immediately abort if `ARCHICHECK_MODE === 'shadow'`. | 2026-07-10 |

