# AI & Agentic Workflow Design

**Last Updated:** 2026-07-08

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
