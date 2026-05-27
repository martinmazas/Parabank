import { test, expect } from './fixtures/index';

test.describe.configure({ mode: 'serial' });

// Auth tests need a fresh, unauthenticated context to exercise the login flow.
// This overrides the per-worker storageState set by workerUser so each test
// starts without any session cookies.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Authentication', () => {
  test('Login > valid credentials land on account overview', async ({
    loginPage,
    registeredUser,
  }) => {
    await loginPage.login(registeredUser.username, registeredUser.password);
    await loginPage.expectOverview();
  });

  test('Login > invalid credentials show error message', async ({
    loginPage,
  }) => {
    await loginPage.login('invalid_user', 'wrong_password');
    await loginPage.expectError();
  });

  test('Access Control > unauthenticated user is blocked with error', async ({ loginPage }) => {
    await loginPage.navigateTo('overview.htm');
    await expect(loginPage.getByRole('heading', { name: 'Error!' })).toBeVisible();
  });

  test('Login via API > customer id is received', async ({
    api,
    registeredUser,
  }) => {
    const customerId: number = await api.login(registeredUser.username, registeredUser.password);
    expect(customerId === registeredUser.customerId);
  })
});
