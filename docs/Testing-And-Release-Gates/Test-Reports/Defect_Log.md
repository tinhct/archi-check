# Master Defect & Bug Log

**Last Updated:** 2026-07-14

| Defect ID | Date Found | Found In (Env/Version) | Severity (Crit/High/Med/Low) | Description & Steps to Reproduce | Assigned To / Status |
|-----------|------------|------------------------|------------------------------|----------------------------------|----------------------|
| BUG-001 | 2026-07-07 | Local Dev / v1.0.0-alpha | High | `waitUntil` is undefined in Vitest Node runner environments. Triggered during E2E simulation test suite invocations. | QA Automation Agent / **Fixed** |
| BUG-002 | 2026-07-07 | Local Dev / v1.0.0-alpha | Med | Mock Octokit client configuration is missing the `request` property expected inside `diff-parser.ts`. | QA Automation Agent / **Fixed** |
| BUG-003 | 2026-07-07 | Local Dev / v1.0.0-alpha | Med | Mocked `next/server` imports are missing core `NextResponse` exports expected by route handlers. | QA Automation Agent / **Fixed** |
| BUG-505-1 | 2026-07-12 | Local Dev / v1.0.0-alpha | Low | Reply textarea accepted trivially short inputs (`min(1)`) allowing garbage justifications to go to the LLM. | QA Automation Agent / **Fixed** |
| BUG-505-2 | 2026-07-12 | Local Dev / v1.0.0-alpha | Low | Next.js 16 Turbopack warning triggered by webpack alias configs in `next.config.ts`. | QA Automation Agent / **Fixed** |
| BUG-505-3 | 2026-07-12 | Local Dev / v1.0.0-alpha | Med | Mock LLM allowed rubber-stamp bypass via 20-character repetitive/random strings. | QA Automation Agent / **Fixed** |
| BUG-505-4 | 2026-07-13 | Local Dev / v1.0.0-alpha | High | Client-side hydration warning overlays in development caused by browser extensions. | QA Automation Agent / **Fixed** |
| BUG-505-5 | 2026-07-14 | Live Staging / v1.0.0-alpha | Med | Infinite comment loop triggered by bot replies on issue comments. | QA Automation Agent / **Fixed** |
| BUG-505-6 | 2026-07-14 | Live Staging / v1.0.0-alpha | High | `TypeError` on live webhook due to unconfigured `Octokit` in App constructor. | QA Automation Agent / **Fixed** |

