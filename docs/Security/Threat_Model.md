# System Threat Model (STRIDE)

**Last Updated:** 2026-07-08

## 🎯 Threat Landscape Visualization

```mermaid
flowchart TD
    %% Define Boundaries
    subgraph Trust Boundary: Public Internet
        GitHub[GitHub Webhook Service]
    end
    
    subgraph Trust Boundary: Edge Serverless (Vercel)
        App[ArchiCheck Webhook App]
    end
    
    subgraph Trust Boundary: Secure Private Networks
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

| Component / Flow | Spoofing | Tampering | Repudiation | Information Disclosure | Denial of Service | Elevation of Privilege | Mitigation |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| **GitHub Webhook Ingestion** | Yes | Yes | No | No | Yes | No | **HMAC Verification**: Validate `x-hub-signature-256` signature using timing-safe comparisons (`crypto.timingSafeEqual`). |
| **Justification Validation** | No | Yes | Yes | No | No | Yes | **PR Author Restricting**: Reject replies from users other than the PR author login username. |
| **Emergency Bypass Control** | Yes | No | Yes | No | No | Yes | **Collaborator Role Check**: Verify commenter permission level (`admin`/`maintain`) before releasing gate locks. |
| **Secret Sanitizer Engine** | No | No | No | Yes | Yes | No | **Lookbehind Scrubber & watchdogs**: Use ECMAScript lookbehinds to redact values; truncate lines >500 chars and halt regex after 500ms. |
| **State Caching** | Yes | Yes | No | Yes | Yes | No | **Upstash TLS**: Use secure REST endpoints with a 1,000ms timeout circuit breaker, failing open to prevent build hangs. |
| **LLM Inference** | Yes | No | No | Yes | Yes | No | **Enterprise Compliance**: Call GCP Vertex AI endpoints (zero data retention policy) with 15s timeouts. |
