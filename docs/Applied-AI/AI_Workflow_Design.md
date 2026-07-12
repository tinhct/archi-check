# AI & Agentic Workflow Design

**Last Updated:** 2026-07-12

## 🤖 System Logic & Agent Loops

```mermaid
flowchart TD
    A[PR Webhook Trigger] --> B{Gating Heuristics}
    B -->|Bypass| C[SUCCESS Check]
    B -->|Gate Locked| D[Retrieve PR Code Diff]
    
    subgraph Quiz Generation Flow
        D --> E[Sanitize Diff & Call Gemini 2.5 Flash Quiz Generator]
        E -->|Output| F{Validate JSON Output Schema}
        F -->|Fail / Parse Error| G[Circuit Breaker: Fail-Open Default Quiz]
        F -->|Pass| H[Cache QuizState in Redis]
    end

    H --> I[Post Markdown Quiz Comment to GitHub]
    
    subgraph Answer Validation Flow
        J[Author Response Comment] --> K[Strip Blockquotes & Sanitize Inputs]
        K --> L[Retrieve Original Code Diff]
        L --> M[Sanitize Inputs & Call Gemini 2.5 Flash Validator]
        M -->|Output| N{Validate JSON Output Schema}
        N -->|Fail / Parse Error| O[Circuit Breaker: Fail-Open Success State]
        N -->|Pass| P{LLM Score >= 7 / passed: true?}
        P -->|Yes| Q[Set SUCCESS Check & Post Approval Comment]
        P -->|No| R[Keep PENDING Lock & Post Nudge Comment]
    end

    I -.->|Human-in-the-Loop Interrogates| J
```

## ⚙️ Core Components

* **Primary AI Paradigm:** Gated Cognitive Loop (Synchronous blocking + Asynchronous background LLM generation and evaluation checks).
* **Knowledge Sources:** Raw Git unified diff payload fetched from GitHub REST API.
* **State Management:** Cached key-value `QuizState` objects stored in Upstash Redis database, mapping `prId` to the active quiz structure, author username, and verification states.

---

## 🧪 Local AI Playground — Phase 2 Evaluation Loop (AC-ST-501-P2)

**Added:** 2026-07-12

```mermaid
flowchart TD
    PasteIn[Developer pastes diff] --> Gen[POST /api/playground Generate Quiz]
    Gen --> QuizReady[quiz_ready state: Quiz displayed]
    QuizReady --> Reply[Developer types reply]
    Reply --> Sanitize[scrubSecrets on reply]
    Sanitize -- Scrubbed --> SanitizeFail[reason: sanitizer_rejection - 200 OK]
    Sanitize -- Clean --> Eval[POST /api/playground/evaluate]
    Eval --> LLMCall[validateAnswers pure function]
    LLMCall --> ScoreCheck{Score 0-10 int?}
    ScoreCheck -- No --> FormatFail[reason: llm_format_error - 200 OK]
    ScoreCheck -- Yes --> Success[reason: success - 200 OK]
    Success --> Render[Render: passed badge + score + receipt]
    SanitizeFail --> RenderBlock[Render: Sanitizer Blocked badge]
    FormatFail --> RenderErr[Render: LLM Format Error inline block]
```

**Key Design Principles:**
- **Strict Parity:** Playground calls production `validateAnswers` directly. No sandbox prompt variant.
- **Stateless Evaluate Endpoint:** Full context (`diff`, `quizJson`, `reply`) travels in each POST body. No session storage.
- **Sanitizer as First Gatekeeper:** `scrubSecrets` runs on `reply` before any LLM call. Rejections return shaped 200 OK (not HTTP 400) to provide developer-friendly feedback during injection testing.
- **Passing Threshold:** Score ≥ 7 / 10 is treated as a passing result. Threshold is hardcoded as a system constant (`passingThreshold: 7`) returned in all responses.
