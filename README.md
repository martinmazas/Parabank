# Parabank Test Suite

End-to-end and API test suite for [Parabank](https://github.com/parasoft/parabank), built with [Playwright](https://playwright.dev).

## Prerequisites

- [Node.js](https://nodejs.org) v18 or higher
- npm v9 or higher
- Parabank running locally: `docker run -p 8080:8080 parasoft/parabank`

## Quick Start

**1. Install dependencies**

```bash
npm install
```

**2. Install Playwright browsers**

```bash
npx playwright install
```

**3. Configure environment**

```bash
cp .env.example .env
```

Edit `.env` and fill in the values for your target environment:

| Variable | Description |
|---|---|
| `BASE_URL` | Base URL of the Parabank UI (e.g. `http://localhost:8080/parabank`) |
| `API_BASE_URL` | Base URL of the Parabank API (usually the same as `BASE_URL`) |

## User Management

Tests share a single persistent user stored in `.auth/persistent-user.json`. On the first run a new user is registered automatically and saved to that file. Subsequent runs reuse the same user. If the user is no longer valid (e.g. the database was reset), a new one is registered and the file is overwritten.

The `.auth/` directory is git-ignored.

## Running Tests

| Command | Description |
|---|---|
| `npm test` | Run all tests headlessly |
| `npm run test:headed` | Run tests with a visible browser |
| `npm run test:ui` | Open Playwright UI mode |

## Code Quality

| Command | Description |
|---|---|
| `npm run lint` | Check for linting errors |
| `npm run lint:fix` | Auto-fix linting errors |
| `npm run format` | Format all files with Prettier |
| `npm run format:check` | Check formatting without writing |

## Project Structure

```
├── tests/
│   ├── api/                 # API client (BaseAPI)
│   ├── fixtures/            # Playwright fixtures (shared user, page objects)
│   ├── helpers/             # Reusable test helpers (auth, accounts, transfers, testData)
│   ├── pages/               # Page object models
│   ├── *.spec.ts            # Test files
│   └── global-setup.ts      # Global setup (runs once before all workers)
├── .auth/                   # Persistent user + per-worker session files (git-ignored)
├── playwright.config.ts     # Playwright configuration
├── eslint.config.mjs        # ESLint configuration
├── tsconfig.json            # TypeScript configuration
├── .env                     # Local environment variables (git-ignored)
└── .env.example             # Environment variable template
```
