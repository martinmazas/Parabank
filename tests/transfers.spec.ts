import { test, expect } from './fixtures/index';
import { Account, Transaction } from './api/BaseAPI';

const TRANSACTION_KEYS: (keyof Transaction)[] = [
  'id',
  'accountId',
  'type',
  'date',
  'amount',
  'description',
];

function todayMMDDYYYY(): string {
  const d = new Date();
  return [
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
    String(d.getFullYear()),
  ].join('-');
}

test.describe('Transfers', () => {
  test('Find Transactions > date range filter > only transactions within range returned', async ({
    loginPage,
    transferPage,
    registeredUser,
    api,
  }) => {
    const accounts = await api.getAccounts(registeredUser.customerId);
    const accountId = String(accounts[0].id);

    const fromDate = '01-01-2026';
    const toDate = todayMMDDYYYY();

    await loginPage.ensureLoggedIn(registeredUser.username, registeredUser.password, 'findtrans.htm');
    await transferPage.filterByDateRange(accountId, fromDate, toDate);
    await transferPage.expectResultsVisible();

    const rangeStart = new Date('2026-01-01');
    const rangeEnd = new Date(toDate.replace(/(\d{2})-(\d{2})-(\d{4})/, '$3-$1-$2'));

    const dates = await transferPage.getTransactionDates();
    expect(dates.length).toBeGreaterThan(0);

    for (const date of dates) {
      expect(date.getTime()).toBeGreaterThanOrEqual(rangeStart.getTime());
      expect(date.getTime()).toBeLessThanOrEqual(rangeEnd.getTime());
    }
  });

  test('Find Transactions > filter by amount > only transactions with exact amount returned', async ({
    loginPage,
    transferPage,
    registeredUser,
    api,
  }) => {
    const accounts = await api.getAccounts(registeredUser.customerId);
    const fromAccountId = accounts[0].id;
    const newAccount = await api.openNewAccount(registeredUser.customerId, '0', fromAccountId);

    const searchAmount = 37;
    await api.transfer(fromAccountId, newAccount.id, searchAmount);

    await loginPage.ensureLoggedIn(registeredUser.username, registeredUser.password, 'findtrans.htm');
    await transferPage.filterByAmount(String(fromAccountId), String(searchAmount));
    await transferPage.expectResultsVisible();

    const amounts = await transferPage.getTransactionAmounts();
    expect(amounts.length).toBeGreaterThan(0);
    for (const amount of amounts) {
      expect(amount).toBe(searchAmount);
    }
  });

  test('GET /accounts/{id}/transactions > response matches Transaction interface shape', async ({
    registeredUser,
    api,
  }) => {
    const accounts = await api.getAccounts(registeredUser.customerId);
    // Use a freshly opened account instead of accounts[0].
    // Parabank seeds accounts[0] with $515 but records no transaction for it,
    // so getTransactions returns [] when this test runs before any transfer has
    // occurred. Opening a new account guarantees at least one transaction
    // (the opening deposit) regardless of execution order.
    const freshAccount = await api.openNewAccount(registeredUser.customerId, '0', accounts[0].id);

    const transactions = await api.getTransactions(freshAccount.id);
    expect(Array.isArray(transactions)).toBe(true);
    expect(transactions.length).toBeGreaterThan(0);

    for (const tx of transactions) {
      expect(tx).toEqual(
        expect.objectContaining({
          id: expect.any(Number),
          accountId: expect.any(Number),
          type: expect.any(String),
          date: expect.any(Number),
          amount: expect.any(Number),
          description: expect.any(String),
        }),
      );
      expect(Object.keys(tx).sort()).toEqual([...TRANSACTION_KEYS].sort());
    }
  });

  test('Transaction History > table is visible with transactions', async ({
    loginPage,
    transferPage,
    registeredUser,
    api,
  }) => {
    const customerAccounts: Account[] = await api.getAccounts(registeredUser.customerId);
    const defaultAccountId: number = customerAccounts[0].id;
    await api.openNewAccount(registeredUser.customerId, '0', defaultAccountId);

    await loginPage.ensureLoggedIn(
      registeredUser.username,
      registeredUser.password,
      `activity.htm?id=${defaultAccountId}`,
    );
    await expect(transferPage.getByRole('heading', { name: 'Account Activity' })).toBeVisible();

    await expect(transferPage.locator('table#transactionTable')).toBeVisible();
    await expect(transferPage.locator('table#transactionTable tbody tr')).not.toHaveCount(0);
  });
});
