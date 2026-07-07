# Security Audit Log

**Last Updated:** 2026-07-07

## 🛡️ Vulnerability Tracker (Simulated SAST)

| ID | Date Found | Vulnerability & Description | Severity (C/H/M/L) | Location (File/Line) | Recommended Remediation | Status (Open/Resolved/Risk Accepted) |
|----|------------|-----------------------------|--------------------|----------------------|-------------------------|--------------------------------------|
| V1 | 2026-07-06 | Regular Expression Denial of Service (ReDoS) on custom patterns | H | `src/lib/security/sanitizer.ts#L60-95` | Implement 500-char line truncation and a 500ms execution timer to abort catastrophic backtracking. | Resolved |
| V2 | 2026-07-06 | Webhook signature timing side-channel attack | H | `src/lib/security/hmac.ts#L10` | Use Node's `crypto.timingSafeEqual` instead of string equivalence operators to validate HMACs. | Resolved |
| V3 | 2026-07-07 | Hardcoded credential exposure during Git commit | C | Codebase / Commits | Configure GitGuardian scanning (GGShield) as an automated CI gating step. | Resolved |
| V4 | 2026-07-07 | Unauthorized Gate Bypass via issue comments | H | `src/app/api/webhook/route.ts#L225` | Restrict bypass slash command evaluations strictly to collaborators with `admin` or `maintain` roles. | Resolved |

## 📦 Dependency Risks (Simulated SCA)

| ID | Date Found | Library / Package | Identified Risk / CVE | Severity | Required Action / Target Version | Status |
|----|------------|-------------------|-----------------------|----------|----------------------------------|--------|
| D1 | 2026-07-07 | GitHub Actions Runners | Node 20 environment deprecation | L | Set ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION=true or upgrade Action Runner to Node 24. | Resolved |
| D2 | 2026-07-07 | Node.js Runtime | Deprecated `punycode` runtime module warning | L | Upgrade underlying packages to use modern userland punycode equivalents. | Resolved |
