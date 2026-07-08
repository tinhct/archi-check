# End-to-End (E2E) Integration Plan

**Last Updated:** 2026-07-08

## 🛤️ Critical Integration Paths

```mermaid
sequenceDiagram
    participant Developer as PR Developer
    participant GitHub as GitHub App Webhook
    participant Edge as ArchiCheck Webhook Router
    participant Redis as Upstash Redis Cache
    participant LLM as Vertex / Gemini AI

    Developer->>GitHub: Pushes code update
    GitHub->>Edge: POST /api/webhook (pull_request.opened)
    Edge->>GitHub: Set Status to PENDING
    
    Edge->>LLM: Generate Quiz questions from Diff
    LLM-->>Edge: Quiz questions array
    Edge->>Redis: Cache QuizState (pending)
    Edge->>GitHub: Post Quiz markdown comment
    
    Developer->>GitHub: Replies to Quiz comment
    GitHub->>Edge: POST /api/webhook (issue_comment.created)
    Edge->>Redis: Fetch QuizState (validate commenter is author)
    Redis-->>Edge: QuizState details
    Edge->>LLM: Validate justification correctness
    LLM-->>Edge: Passed validation result
    Edge->>GitHub: Set Status to SUCCESS (unlock merge)
```

## 🚥 E2E Test Scenarios

| Scenario ID | Flow Description | Required Test Data | Expected Outcome |
| :---- | :---- | :---- | :---- |
| **E2E-01** | PR opened with gated diff triggers quiz comments and Pending commit status. | HMAC signature headers, pull_request.opened JSON payload. | Commit status set to Pending, comment posted. |
| **E2E-02** | Developer responds with valid justification to unlock CI status gate check. | issue_comment.created JSON payload, author matching username. | Commit status set to Success, comment posted. |
| **E2E-03** | Admin user executes `/archicheck bypass` emergency command override. | issue_comment.created JSON payload containing bypass instruction command. | Commit status set to Success, bypass comment posted. |
| **E2E-04** | Redis timeout or unreachable exception handles gate unblocking. | Mock database connection timeout (>1,000ms). | Fail-open Success status unblocks, warning posted. |
