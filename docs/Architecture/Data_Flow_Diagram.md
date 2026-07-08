# System Data Flow

**Last Updated:** 2026-07-08

## 🗺️ Data Flow Visualization

```mermaid
graph TD
    A[GitHub Webhook Event] -->|1. POST JSON Payload & HMAC Signature| B(API Webhook Route: route.ts)
    B -->|2. Verify HMAC Signature| C{Signature Valid?}
    C -->|No| D[Return 401 Unauthorized]
    C -->|Yes| E{Event Type?}
    
    E -->|pull_request.opened / synchronize| F[Lock Commit Status to Pending synchronously]
    F -->|3. Kick off async task via waitUntil| G{Evaluate Heuristics}
    G -->|No Gate Required| H[Update Commit Status to Success]
    G -->|Gate Required| I[Call Gemini/Vertex AI Quiz Generator]
    I -->|4. Generate Quiz Questions| J[Store QuizState in Upstash Redis]
    J -->|5. Post Quiz Comment to PR Thread| K[Update Commit Status context to Pending with Target URL]
    
    E -->|issue_comment.created| L{Parse Comment Body}
    L -->|Comment is /archicheck bypass| M{Check Commenter Repo Permissions}
    M -->|Admin or Maintainer| N[Overwrite Status to Success, Set Redis to Bypassed, Post Confirm Comment]
    M -->|Write or Read| O[Post Unauthorized Warning Comment, Keep Gate Locked]
    
    L -->|Comment is Quiz Answer| P{Commenter is PR Author?}
    P -->|No| Q[Post Non-Author Warning Comment, Reject Answer]
    P -->|Yes| R[Strip Blockquotes & Call LLM Answer Validator]
    R -->|passed: true| S[Update Status to Success, Set Redis to Success, Post Confirm Comment]
    R -->|passed: false| T[Keep Status Pending, Post Nudge Comment]
```

## 🗄️ Data Entities & Storage

| Entity | Source of Truth | Storage Mechanism | Data Classification (Public/Sensitive) |
| :---- | :---- | :---- | :---- |
| **HMAC Signature** | GitHub App Registration Configuration | Vercel Environment Variables (`GITHUB_WEBHOOK_SECRET`) | Sensitive (Restricted credentials) |
| **API Keys / Service Account** | GCP / Vertex AI Console | Vercel Environment Variables (`GEMINI_API_KEY`, `GOOGLE_CREDS_JSON`) | Sensitive (Restricted credentials) |
| **PR Quiz State** | Webhook Router Execution | Upstash Redis State Cache (`archicheck:pr:{prId}`) | Sensitive (Internal development state logs) |
| **PR Source Diff** | GitHub Pull Request | GitHub REST API (`application/vnd.github.v3.diff` formats) | Sensitive (Proprietary source code) |
| **Evaluation Rules** | Repository Root | Repo Config File (`.archicheck.yml`) | Public / Internal (Dev configs) |
