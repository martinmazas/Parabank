import { test as base, request as playwrightRequest } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { LoginPage } from '../pages/LoginPage';
import { AccountsPage } from '../pages/AccountsPage';
import { TransferPage } from '../pages/TransferPage';
import { BillPayPage } from '../pages/BillPayPage';
import { LoanPage } from '../pages/LoanPage';
import { BaseAPI } from '../api/BaseAPI';
import { buildRegistrationData } from '../helpers/testData';
import login from '../helpers/auth';

export type RegisteredUser = {
  customerId: number;
  username: string;
  password: string;
};

type WorkerUser = RegisteredUser & { storageStatePath: string };

type MyFixtures = {
  loginPage: LoginPage;
  accountsPage: AccountsPage;
  transferPage: TransferPage;
  billPayPage: BillPayPage;
  loanPage: LoanPage;
  api: BaseAPI;
};

type WorkerFixtures = {
  registeredUser: RegisteredUser;
  workerUser: WorkerUser;
};

export const test = base.extend<MyFixtures, WorkerFixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  accountsPage: async ({ page }, use) => {
    await use(new AccountsPage(page));
  },
  transferPage: async ({ page }, use) => {
    await use(new TransferPage(page));
  },
  billPayPage: async ({ page }, use) => {
    await use(new BillPayPage(page));
  },
  loanPage: async ({ page }, use) => {
    await use(new LoanPage(page));
  },
  api: async ({ request }, use) => {
    await use(new BaseAPI(request));
  },

  // ── Persistent shared user ────────────────────────────────────────────────────
  // All workers share one user, persisted in .auth/persistent-user.json between
  // runs. On startup, the fixture validates the saved credentials via API login;
  // if they are no longer valid it registers a new user and overwrites the file.
  // Each worker still gets its own browser session file for isolation.
  //
  // Specs that explicitly clear the session with
  //   test.use({ storageState: { cookies: [], origins: [] } })
  // bypass the storageState fixture below entirely, so this fixture is never
  // instantiated on those workers — no wasted registration.
  workerUser: [
    async ({ browser }, use, workerInfo) => {
      const AUTH_DIR = path.resolve(process.cwd(), '.auth');
      fs.mkdirSync(AUTH_DIR, { recursive: true });
      const storageStatePath = path.join(AUTH_DIR, `worker-${workerInfo.workerIndex}.json`);
      const PERSISTENT_USER_FILE = path.join(AUTH_DIR, 'persistent-user.json');

      type SavedUser = { username: string; password: string; customerId: number };

      // Try to load and validate the persisted user via API.
      let persistedUser: SavedUser | null = null;
      if (fs.existsSync(PERSISTENT_USER_FILE)) {
        try {
          const raw = JSON.parse(fs.readFileSync(PERSISTENT_USER_FILE, 'utf-8')) as SavedUser;
          const apiCtx = await playwrightRequest.newContext();
          const api = new BaseAPI(apiCtx);
          const customerId = await login(api, raw.username, raw.password);
          await apiCtx.dispose();
          persistedUser = { username: raw.username, password: raw.password, customerId };
        } catch {
          persistedUser = null;
        }
      }

      let username: string;
      let password: string;
      let customerId: number;

      if (persistedUser) {
        // Reuse saved user — just create a fresh browser session via login.
        username = persistedUser.username;
        password = persistedUser.password;
        customerId = persistedUser.customerId;

        const ctx = await browser.newContext({ baseURL: process.env.BASE_URL });
        const pg = await ctx.newPage();
        await pg.goto('index.htm');
        await pg.locator('input[name="username"]').fill(username);
        await pg.locator('input[name="password"]').fill(password);
        await pg.getByRole('button', { name: 'Log In' }).click();
        await pg.waitForLoadState('networkidle');
        await ctx.storageState({ path: storageStatePath });
        await ctx.close();
      } else {
        // No valid saved user — register a new one and persist it.
        let data = buildRegistrationData();
        let resolvedCustomerId: number | undefined;

        for (let attempt = 1; attempt <= 3; attempt++) {
          const ctx = await browser.newContext({ baseURL: process.env.BASE_URL });
          const pg = await ctx.newPage();
          await pg.goto('register.htm');
          await pg.locator('[id="customer.firstName"]').fill(data.firstName);
          await pg.locator('[id="customer.lastName"]').fill(data.lastName);
          await pg.locator('[id="customer.address.street"]').fill(data.address);
          await pg.locator('[id="customer.address.city"]').fill(data.city);
          await pg.locator('[id="customer.address.state"]').fill(data.state);
          await pg.locator('[id="customer.address.zipCode"]').fill(data.zipCode);
          await pg.locator('[id="customer.phoneNumber"]').fill(data.phoneNumber);
          await pg.locator('[id="customer.ssn"]').fill(data.ssn);
          await pg.locator('[id="customer.username"]').fill(data.username);
          await pg.locator('[id="customer.password"]').fill(data.password);
          await pg.locator('[id="repeatedPassword"]').fill(data.password);
          await pg.getByRole('button', { name: 'Register' }).click();
          await pg.waitForLoadState('networkidle');

          // If the username field is still visible, registration failed — retry with fresh credentials.
          const registrationFailed = await pg.locator('[id="customer.username"]').isVisible();
          if (registrationFailed) {
            await ctx.close();
            data = buildRegistrationData();
            continue;
          }

          // Parabank auto-logs-in after registration — capture the live session now.
          await ctx.storageState({ path: storageStatePath });
          await ctx.close();

          // Resolve customerId via API. Wrap in try/catch: in rare cases the DB
          // write may not have fully committed yet, causing a 400 on immediate login.
          try {
            const apiCtx = await playwrightRequest.newContext();
            const api = new BaseAPI(apiCtx);
            resolvedCustomerId = await login(api, data.username, data.password);
            await apiCtx.dispose();
            break;
          } catch {
            data = buildRegistrationData();
          }
        }

        if (resolvedCustomerId === undefined) {
          throw new Error(`Worker ${workerInfo.workerIndex}: registration failed after 3 attempts`);
        }

        username = data.username;
        password = data.password;
        customerId = resolvedCustomerId;

        // Persist the new user so future runs can reuse it.
        fs.writeFileSync(PERSISTENT_USER_FILE, JSON.stringify({ username, password, customerId }, null, 2));
      }

      await use({ username, password, customerId, storageStatePath });

      // Remove the per-worker session file once all tests on this worker have finished.
      try { fs.unlinkSync(storageStatePath); } catch { /* ignore */ }
    },
    { scope: 'worker' },
  ],

  // Inject the worker's saved session into every test's browser context so
  // tests start already logged in. Specs that need an unauthenticated start
  // override this with test.use({ storageState: { cookies:[], origins:[] } }),
  // which replaces this fixture entirely — workerUser is never called.
  storageState: ({ workerUser }, use) => use(workerUser.storageStatePath),

  // Backward-compatible alias — existing spec files need zero changes.
  registeredUser: [
    async ({ workerUser }, use) => {
      await use({
        username: workerUser.username,
        password: workerUser.password,
        customerId: workerUser.customerId,
      });
    },
    { scope: 'worker' },
  ],
});

export { expect } from '@playwright/test';
