import { test, expect } from './fixtures/index';
import { PayeeData } from './pages/BillPayPage';

const PAYEE: PayeeData = {
  name: 'Electric Company',
  street: '100 Power Lane',
  city: 'Springfield',
  state: 'IL',
  zipCode: '62701',
  phone: '5559876543',
  accountNumber: '12345',
};

test.describe('Bills', () => {
  test('Payment > Pay a bill with valid payee and amount > Success confirmation visible and transaction in history', async ({
    loginPage,
    billPayPage,
    registeredUser,
    api,
  }) => {
    const accounts = await api.getAccounts(registeredUser.customerId);
    // Create a dedicated account with a fresh opening deposit so this test is
    // not affected by balance changes made by other tests on the same worker.
    // Parabank always seeds the new account with ~$100, which is reliably > $50.
    const paymentAccount = await api.openNewAccount(registeredUser.customerId, '0', accounts[0].id);

    await loginPage.ensureLoggedIn(registeredUser.username, registeredUser.password, 'billpay.htm');
    await billPayPage.expectHeading('Bill Payment Service');

    await billPayPage.pay(PAYEE, '50', String(paymentAccount.id));
    await billPayPage.expectSuccess();

    await billPayPage.goto(`activity.htm?id=${paymentAccount.id}`);
    await expect(billPayPage.locator('table#transactionTable')).toBeVisible();
    await expect(billPayPage.locator('table#transactionTable tbody tr')).not.toHaveCount(0);
  });

  test('Payment > missing payee name > validation error shown and no transaction created', async ({
    loginPage,
    billPayPage,
    registeredUser,
    api,
  }) => {
    // Open a dedicated account so concurrent tests can't add transactions to it
    // and pollute the before/after count comparison.
    // No balance check needed on accounts[0]: validation fires (payee name is
    // empty) before Parabank ever checks the account balance.
    const accounts = await api.getAccounts(registeredUser.customerId);
    const isolatedAccount = await api.openNewAccount(
      registeredUser.customerId,
      '0',
      accounts[0].id,
    );

    const txBefore = await api.getTransactions(isolatedAccount.id);

    await loginPage.ensureLoggedIn(registeredUser.username, registeredUser.password, 'billpay.htm');
    await billPayPage.expectHeading('Bill Payment Service');

    await billPayPage.pay({ ...PAYEE, name: '' }, '50', String(isolatedAccount.id));
    await billPayPage.expectValidationError('Payee name is required.');

    const txAfter = await api.getTransactions(isolatedAccount.id);
    expect(txAfter).toHaveLength(txBefore.length);
  });
});
