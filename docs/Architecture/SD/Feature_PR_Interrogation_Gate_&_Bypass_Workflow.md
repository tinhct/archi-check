# Feature Name
Interactive Interrogation Gate & Emergency Bypass (Sprint 3)

# Business Context & Value
Once a pull request is locked behind a Pending status check, the developer must justify their architectural decisions directly in the PR thread. ArchiCheck ingests these responses, strips out email/web quoted lines, validates reasoning against the LLM, and unblocks the PR if successful. To ensure production hotfixes are never delayed during outages, the system provides a slash command (`/archicheck bypass`) that allows authorized team members (Admins/Maintainers) to execute an immediate audit-logged bypass.

# Architecture Diagram
```mermaid
sequenceDiagram
  autonumber
  participant GH as GitHub Webhook
  participant W as Webhook Handler (route.ts)
  participant DB as Upstash Redis (client.ts)
  participant CP as Comment Parser (comment-parser.ts)
  participant LLM as LLM Provider (provider.ts)

  GH->>W: POST /api/webhook (issue_comment.created)
  W->>DB: getPRState(prNumber)
  DB-->>W: QuizState (status, prAuthor, commitSha)
  
  Note over W: Validate Tracked PR & Pending status

  alt Commenter is NOT PR Author
    Note over W: Compare comment.user.login != prAuthor
    W->>GH: Post Non-Author Warning Comment (Reject answer)
  else Commenter IS PR Author
    W->>CP: parseDeveloperReply(comment.body)
    CP-->>W: Isolated Justification (no quotes)
    W->>GH: fetchPRDiff(octokit)
    GH-->>W: Raw Diff
    W->>LLM: validateAnswers(diff, quizPayload, answers)
    LLM-->>W: EvaluationResult (passed, reasoning)
    
    alt passed is True
      W->>GH: Set Commit Status check to SUCCESS
      W->>DB: setPRState(prNumber, status: 'success')
      W->>GH: Post "Verification complete!" Comment
    else passed is False
      W->>GH: Update Commit Status check description (nudge)
      W->>GH: Post "Please elaborate further" Comment
    end
  end

  alt Comment body is exactly "/archicheck bypass"
    W->>GH: Query getCollaboratorPermissionLevel(comment.user)
    GH-->>W: User role (admin | maintain | write | read)
    alt role is admin or maintain
      W->>GH: Overwrite Commit Status check to SUCCESS
      W->>DB: setPRState(prNumber, status: 'bypassed')
      W->>GH: Post "Emergency bypass executed" Comment
    else role is write or read
      W->>GH: Post "Unauthorized" Warning Comment
    end
  end
```

# Architecture & Components
* **Webhook Router** ([route.ts]../../../src/app/api/webhook/route.ts): Orchestrates event parsing, role authorizations, state checks, and routes comments to validation/bypass workflows.
* **Comment UI Generator** ([comments.ts]../../../src/lib/github/comments.ts): Formats feedback and warning Markdown comment blocks posted to GitHub issues.
* **Reply Parser** ([comment-parser.ts]../../../src/lib/github/comment-parser.ts): Filters lines starting with `>` to remove quotes and isolate new reply text.
* **LLM Validator** ([provider.ts]../../../src/lib/llm/provider.ts): Sends the isolated reply, original diff, and generated questions to the LLM for evaluation.

# Data Model Changes
* Updated `QuizState` type definition in [archicheck.d.ts]../../../src/types/archicheck.d.ts) to store author info and bypass reasons:
  ```typescript
  export interface QuizState {
    prId: number;
    commitSha: string;
    prAuthor: string; // The username of the PR author
    status: QuizStatus; // 'pending' | 'success' | 'failed' | 'bypassed'
    quizPayload: QuizPayload;
    userAnswers?: string[];
    validatedAt?: string;
    bypassReason?: string;
  }
  ```

# Agent Implementation Steps
* **Phase 1:** Add `prAuthor` field to `QuizState` interface and save it during PR opened event caching.
* **Phase 2:** Implement reply parser blockquote stripper and test via Vitest unit tests.
* **Phase 3:** Update prompts and webhook routers to handle comment replies, authorize bypass roles, overwrite commit statuses, and verify via integration test suites.

# Security & Performance Risks
* **Unauthorized Gating Overrides**: Malicious actors trying to force-approve status checks. Mitigated by verifying commenter usernames against the saved `prAuthor` for quiz answers, and querying the GitHub Collaborators API to restrict `/archicheck bypass` strictly to `admin` or `maintain` roles.
* **API Rate Limits during Outages**: Permission checks execute a GET request. Mitigated by restricting permission queries only when a command starting with `/archicheck bypass` is parsed, avoiding calls on standard discussion comments.

# Acceptance Criteria
* Rejects quiz responses from commenters who are not the pull request author, posting a canned warning reply.
* Parses responses to strip out markdown blockquotes, isolating the new text.
* Sends parsed responses to the LLM under language-agnostic intent rules (evaluating technical accuracy only).
* Intercepts `/archicheck bypass` case-insensitive commands.
* Approves the gate and overwrites status description to `"⚠️ Emergency bypass executed by Tech Lead."` if the commenter is an Admin or Maintainer on the repo.
* Rejects bypass requests with warning replies if the commenter does not have administrative permissions.
