# Buildonline

End-to-end test suite built with [Playwright](https://playwright.dev).

## Prerequisites

- [Node.js](https://nodejs.org) v18 or higher
- npm v9 or higher

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
| `BASE_URL` | Base URL of the application under test |
| `API_BASE_URL` | Base URL of the API |
| `TEST_USERNAME` | Login username used in tests |
| `TEST_PASSWORD` | Login password used in tests |

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
├── tests/               # Test files (*.spec.ts)
├── playwright.config.ts # Playwright configuration
├── eslint.config.mjs    # ESLint configuration
├── tsconfig.json        # TypeScript configuration
├── .env                 # Local environment variables (git-ignored)
└── .env.example         # Environment variable template
```
