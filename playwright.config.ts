import { defineConfig, devices } from '@playwright/test';

import 'dotenv/config';

// ── Environment ───────────────────────────────────────────────────────────────
//
// ENVIRONMENT is injected by the CI workflow matrix cell.
// Locally it is not set, so it defaults to 'staging'.

const ENV = (process.env.ENVIRONMENT ?? 'staging') as 'staging' | 'production';
const IS_CI = !!process.env.CI;

export default defineConfig({
  globalSetup: './tests/global-setup.ts',
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: IS_CI,

  // 2 retries on every CI run — same for staging and production.
  retries: IS_CI ? 2 : 0,

  // Production uses 1 worker per shard to run tests strictly sequentially.
  // Banking operations (transfers, loans, bill pay) can interfere when
  // multiple tests hit the same account concurrently, so serialising them
  // eliminates that class of flake on the real environment.
  // Staging keeps 2 workers for a faster feedback loop.
  workers: IS_CI ? (ENV === 'production' ? 1 : 2) : undefined,

  // HTML reporter on CI so each shard's artifact is immediately viewable
  // from the Actions UI without a separate merge step.
  reporter: [
    ['html'],
    ['./src/reporter.ts'],
  ],

  use: {
    baseURL: process.env.BASE_URL,
    // storageState is intentionally absent here — it is set per-worker by the
    // workerUser fixture in tests/fixtures/index.ts, which registers a fresh
    // isolated user for each worker and saves their session to .auth/worker-N.json.
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // staging  → full cross-browser matrix (catches browser-specific regressions)
    // production → Chromium only (fast smoke-check after a deploy)
    // ...(ENV !== 'production'
    //   ? [
    //       {
    //         name: 'firefox',
    //         use: { ...devices['Desktop Firefox'] },
    //       },
    //       {
    //         name: 'webkit',
    //         use: { ...devices['Desktop Safari'] },
    //       },
    //     ]
    //   : []),
  ],
});
