# Cross-System Schema Mappings

**Last Updated:** 2026-07-08

## 🔄 Data Transformation Rules

| Source System | Source Field | Target System | Target Field | Transformation Logic / Format |
|---------------|--------------|---------------|--------------|-------------------------------|
| **GitHub Pull Request** | `pull_request.number` | **Upstash Redis Cache** | `QuizState.prId` | Cast string field to number (key: `pr:{prId}`). |
| **GitHub Pull Request** | `pull_request.head.sha` | **Upstash Redis Cache** | `QuizState.commitSha` | Map target Git commit hash string literal. |
| **GitHub Pull Request** | `pull_request.user.login` | **Upstash Redis Cache** | `QuizState.prAuthor` | Save the author username to restrict quiz replies. |
| **GitHub Issue Comment** | `comment.body` | **LLM prompt** | `{{answers}}` | Strip blocks starting with `>` (blockquote reply cleaning). |
| **GitHub API Diff** | Unified Code Patch | **LLM prompt** | `{{diff}}` | Run lookbehind sanitizations and ReDoS watchdogs. |
