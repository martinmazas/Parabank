import { RegistrationData } from './api/BaseAPI';
import { test, expect } from './fixtures/index';
import { uniqueUsername, uniquePassword } from './helpers/testData';
import login from './helpers/auth';
import { getAccounts, openAccount, getBalance } from './helpers/accounts';
import { transfer, getTransactions } from './helpers/transfers';
import { PayeeData } from './pages/BillPayPage';

const username: string = uniqueUsername();
const password: string = uniquePassword();

const newUser: RegistrationData = {
    firstName: 'newUser',
    lastName: 'testing',
    address: '123 Main St',
    city: 'Springfield',
    state: 'IL',
    zipCode: '62701',
    phoneNumber: '5551234567',
    ssn: '123456789',
    username,
    password,
};

test.use({ storageState: { cookies: [], origins: [] } });

const BILL_PAYEE: PayeeData = {
    name: 'Electric Company',
    street: '100 Power Lane',
    city: 'Springfield',
    state: 'IL',
    zipCode: '62701',
    phone: '5559876543',
    accountNumber: '99001',
};

test.describe.serial('E2E', () => {
    test('Register new user > Login > Open account > Transfer funds > verify both balances updated', async ({
        api,
        page,
    }) => {
        const TRANSFER_AMOUNT = 100;
        const round = (n: number) => Math.round(n * 100) / 100;

        // 1. Register via UI
        await page.goto('register.htm');
        await page.locator('[id="customer.firstName"]').fill(newUser.firstName);
        await page.locator('[id="customer.lastName"]').fill(newUser.lastName);
        await page.locator('[id="customer.address.street"]').fill(newUser.address);
        await page.locator('[id="customer.address.city"]').fill(newUser.city);
        await page.locator('[id="customer.address.state"]').fill(newUser.state);
        await page.locator('[id="customer.address.zipCode"]').fill(newUser.zipCode);
        await page.locator('[id="customer.phoneNumber"]').fill(newUser.phoneNumber);
        await page.locator('[id="customer.ssn"]').fill(newUser.ssn);
        await page.locator('[id="customer.username"]').fill(newUser.username);
        await page.locator('[id="customer.password"]').fill(newUser.password);
        await page.locator('[id="repeatedPassword"]').fill(newUser.password);
        await page.getByRole('button', { name: 'Register' }).click();
        await page.waitForLoadState('networkidle');

        // 2. Login via API to retrieve the new user's customerId
        const customerId: number = await login(api, username, password);

        // 3. Get the default account created on registration
        const accounts = await getAccounts(api, customerId);
        const sourceAccount = accounts[0];

        // 4. Open a new CHECKING account funded from the default account
        const newAccount = await openAccount(api, customerId, '0', sourceAccount.id);

        // 5. Snapshot balances after the opening deposit has settled
        const sourceBalanceBefore: number = await getBalance(api, sourceAccount.id);
        const newBalanceBefore: number = await getBalance(api, newAccount.id);

        // 6. Transfer funds from source to new account
        await transfer(api, sourceAccount.id, newAccount.id, TRANSFER_AMOUNT);

        // 7. Verify both balances were updated
        await expect.poll(() => getBalance(api, sourceAccount.id)).toBe(round(sourceBalanceBefore - TRANSFER_AMOUNT));
        await expect.poll(() => getBalance(api, newAccount.id)).toBe(round(newBalanceBefore + TRANSFER_AMOUNT));
    });

    test('Login > Navigate to bill payment > Pay bill > Verify transaction in history', async ({
        loginPage,
        billPayPage,
        api,
    }) => {
        const BILL_AMOUNT = 50;

        // 1. Login via API to get customerId (user registered in the preceding test)
        const customerId = await login(api, username, password);

        // 2. Find an account with sufficient balance
        const accounts = await getAccounts(api, customerId);
        const payingAccount = accounts.find((a) => a.balance >= BILL_AMOUNT);
        if (!payingAccount) throw new Error('No account with sufficient balance found');

        // 3. Snapshot transaction count before payment
        const txBefore = await getTransactions(api, payingAccount.id);

        // 4. Login via UI and navigate directly to Bill Payment
        await loginPage.ensureLoggedIn(username, password, 'billpay.htm');
        await billPayPage.expectHeading('Bill Payment Service');

        // 5. Submit the bill payment
        await billPayPage.pay(BILL_PAYEE, String(BILL_AMOUNT), String(payingAccount.id));
        await billPayPage.expectSuccess();

        // 6. Navigate to account activity and verify the new transaction appears
        await billPayPage.goto(`activity.htm?id=${payingAccount.id}`);
        await expect(billPayPage.locator('table#transactionTable')).toBeVisible();
        await expect
            .poll(() => getTransactions(api, payingAccount.id))
            .toHaveLength(txBefore.length + 1);
    });

    test('Login > Request loan > Verify new loan account appears in account list', async ({
        loginPage,
        loanPage,
        accountsPage,
        api,
    }) => {
        // 1. Login via API to get customerId (user registered in the first test)
        const customerId = await login(api, username, password);

        // 2. Snapshot account count before the loan
        const accountsBefore = await getAccounts(api, customerId);

        // 3. Login via UI and navigate to the loan request page
        await loginPage.ensureLoggedIn(username, password, 'requestloan.htm');
        await loanPage.expectHeading('Apply for a Loan');

        // 4. Request the loan and verify it is approved
        await loanPage.applyForLoan('1000', '100');
        await loanPage.expectApproved();

        // 5. Capture the new account ID shown on the approval page
        const newAccountId = await loanPage.locator('#newAccountId').textContent();

        // 6. Navigate to accounts overview
        await accountsPage.goto('overview.htm');
        await accountsPage.expectAccountList();

        // 7. Confirm the account count grew by one via the API
        await expect
            .poll(() => getAccounts(api, customerId))
            .toHaveLength(accountsBefore.length + 1);

        // 8. Confirm the new loan account link is visible in the overview table
        await expect(
            accountsPage.locator('table#accountTable a', { hasText: newAccountId! }),
        ).toBeVisible();
    });
});
