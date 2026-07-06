# Contributing to ArchiCheck

Welcome! We are excited to have you help build the cognitive control plane for agentic software workflows.

## Development Setup

1. **Prerequisites**: Ensure you have Node.js (v18+) and npm installed.
2. **Install Dependencies**:
   ```bash
   npm install
   ```
3. **Local Webhook Testing**: Use a tool like [smee.io](https://smee.io) or `ngrok` to forward GitHub webhooks to `http://localhost:3000/api/webhook`.

## Branch Naming Conventions

Use the following prefixes for all branch names:
- `feat/` for new features
- `fix/` for bug fixes
- `chore/` for maintenance or tool updates
- `docs/` for documentation changes

## Coding Standards

- Code style is enforced via Prettier and ESLint. Run the linter before submitting code:
  ```bash
  npm run lint
  ```
- Ensure TypeScript types are sound.

## Testing Expectations

- We aim for 100% test coverage for the core diff-parsing and heuristics logic under [src/lib/analyzer/](file:///Users/tinhct/Documents/AI%20Projects/ArchiCheck%20Project/archi-check/src/lib/analyzer).
- Run tests via Vitest:
  ```bash
  npm run test
  ```

## Pull Request Process

1. Fork the repository and create your branch from `main`.
2. Make your changes and add tests where appropriate.
3. Ensure linting and tests pass.
4. Submit a Pull Request. Maintainers aim to review pull requests within 48 hours during the work week.
