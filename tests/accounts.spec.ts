import { test, expect } from './fixtures/index';
import { Account, BaseAPI } from './api/BaseAPI';

async function setupTransferPair(
  api: BaseAPI,
  customerId: number,
): Promise<{ fromId: number; toId: number }> {
  const accounts = await api.getAccounts(customerId);
  // Open two fresh accounts funded from accounts[0] so each test gets an
  // isolated pair that no other concurrent worker can touch.
  const fromAccount = await api.openNewAccount(customerId, '0', accounts[0].id);
  const toAccount = await api.openNewAccount(customerId, '0', accounts[0].id);
  return { fromId: fromAccount.id, toId: toAccount.id };
}

test.describe('Accounts', () => {
  test('Overview > authenticated user sees account list', async ({
    accountsPage,
    loginPage,
    registeredUser,
  }) => {
    await loginPage.ensureLoggedIn(registeredUser.username, registeredUser.password, 'overview.htm');
    await accountsPage.expectAccountList();
  });

  for (const { typeValue, expectedType } of [
    { typeValue: '0', expectedType: 'CHECKING' },
    { typeValue: '1', expectedType: 'SAVINGS' },
  ]) {
    test(`Open Account > ${expectedType} type is confirmed and appears in list`, async ({
      loginPage,
      accountsPage,
      registeredUser,
      api,
    }) => {
      await loginPage.ensureLoggedIn(registeredUser.username, registeredUser.password, 'openaccount.htm');
      await accountsPage.expectHeading('Open New Account');

      const fromIdAccount: number = Number(
        await accountsPage.locator('#fromAccountId option').first().getAttribute('value'),
      );
      await accountsPage.openNewAccount(typeValue, fromIdAccount);

      await expect(accountsPage.getByRole('heading', { name: 'Account Opened!' })).toBeVisible();

      const newAccountId: number = Number(await accountsPage.locator('a#newAccountId').textContent());

      const customerAccounts: Account[] = await api.getAccounts(registeredUser.customerId);
      const newAccount = customerAccounts.find((a) => a.id === newAccountId);
      expect(customerAccounts.map((a) => a.id)).toContain(newAccountId);
      expect(newAccount!.type).toBe(expectedType);
    });
  }

  test('Transfer > funds between own accounts reflect on both balances', async ({
    loginPage,
    transferPage,
    registeredUser,
    api,
  }) => {
    const amount = 100;

    const { fromId, toId } = await setupTransferPair(api, registeredUser.customerId);

    await loginPage.ensureLoggedIn(registeredUser.username, registeredUser.password, 'transfer.htm');

    // Snapshot balances right before the UI transfer so the values are fully
    // settled (openNewAccount's internal opening-deposit debit is committed).
    const fromBalance = await api.getBalance(fromId);
    const toBalance = await api.getBalance(toId);

    await transferPage.transfer(String(fromId), String(toId), String(amount));
    await transferPage.expectSuccess();

    const round = (n: number) => Math.round(n * 100) / 100;

    await expect.poll(() => api.getBalance(fromId)).toBe(round(fromBalance - amount));
    await expect.poll(() => api.getBalance(toId)).toBe(round(toBalance + amount));
  });

  test.skip('Transfer > amount exceeding balance > error response and balances unchanged', async ({
    registeredUser,
    api,
    request,
  }) => {
    const { fromId, toId } = await setupTransferPair(api, registeredUser.customerId);
    const fromBalance = await api.getBalance(fromId);
    const toBalance = await api.getBalance(toId);

    const res = await request.post(`${process.env.API_BASE_URL}/services/bank/transfer`, {
      params: { fromAccountId: fromId, toAccountId: toId, amount: fromBalance * 2 },
      headers: { Accept: 'application/json' },
    });

    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(await api.getBalance(fromId)).toBe(fromBalance);
    expect(await api.getBalance(toId)).toBe(toBalance);
  });

  test.skip('Transfer > negative amount > API returns 4xx and no transaction created', async ({
    registeredUser,
    api,
    request,
  }) => {
    const { fromId, toId } = await setupTransferPair(api, registeredUser.customerId);
    const fromBalance = await api.getBalance(fromId);
    const txBefore = await api.getTransactions(fromId);

    const res = await request.post(`${process.env.API_BASE_URL}/services/bank/transfer`, {
      params: { fromAccountId: fromId, toAccountId: toId, amount: -100 },
      headers: { Accept: 'application/json' },
    });

    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(await api.getBalance(fromId)).toBe(fromBalance);
    const txAfter = await api.getTransactions(fromId);
    expect(txAfter).toHaveLength(txBefore.length);
  });

  test('Open Savings account > New account appears in GET /accounts with correct type', async ({
    registeredUser,
    api,
  }) => {
    // Pure API test — no UI session needed (Parabank REST API is unauthenticated)
    const accounts = await api.getAccounts(registeredUser.customerId);
    const fromAccountId = accounts[0].id;
    const newAccount = await api.openNewAccount(registeredUser.customerId, '1', fromAccountId);

    const updatedAccounts = await api.getAccounts(registeredUser.customerId);
    const savedAccount = updatedAccounts.find((a) => a.id === newAccount.id);
    expect(savedAccount?.type).toBe('SAVINGS');
  });
});
