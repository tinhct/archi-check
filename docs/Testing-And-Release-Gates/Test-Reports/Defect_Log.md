# Master Defect & Bug Log

**Last Updated:** 2026-07-08

| Defect ID | Date Found | Found In (Env/Version) | Severity (Crit/High/Med/Low) | Description & Steps to Reproduce | Assigned To / Status |
|-----------|------------|------------------------|------------------------------|----------------------------------|----------------------|
| BUG-001 | 2026-07-07 | Local Dev / v1.0.0-alpha | High | `waitUntil` is undefined in Vitest Node runner environments. Triggered during E2E simulation test suite invocations. | QA Automation Agent / **Fixed** |
| BUG-002 | 2026-07-07 | Local Dev / v1.0.0-alpha | Med | Mock Octokit client configuration is missing the `request` property expected inside `diff-parser.ts`. | QA Automation Agent / **Fixed** |
| BUG-003 | 2026-07-07 | Local Dev / v1.0.0-alpha | Med | Mocked `next/server` imports are missing core `NextResponse` exports expected by route handlers. | QA Automation Agent / **Fixed** |
