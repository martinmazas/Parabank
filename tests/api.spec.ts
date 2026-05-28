import { test, expect } from './fixtures/index';
import { PAYEE } from './helpers/testData';

test.describe('API calls', () => {
    test('Login via API > customer id is received', async ({
        api,
        registeredUser,
    }) => {
        const customerId: number = await api.login(registeredUser.username, registeredUser.password);
        expect(customerId).toBe(registeredUser.customerId);
    })

    test('Get Accounts > accounts list is returned with correct customer id', async ({
        api,
        registeredUser,
    }) => {
        const accounts = await api.getAccounts(registeredUser.customerId);
        expect(accounts.length).toBeGreaterThan(0);
        for (const account of accounts) {
            expect(account.customerId).toBe(registeredUser.customerId);
        }
    });

    test.skip('Open New Account > new account is created with correct type and initial balance', async ({
        api,
        registeredUser,
    }) => {
        const accountsBefore = await api.getAccounts(registeredUser.customerId);
        const fromAccountId = accountsBefore[0].id;

        const newAccount = await api.openNewAccount(registeredUser.customerId, '0', fromAccountId);
        expect(newAccount.id).toBeTruthy();
        expect(newAccount.customerId).toBe(registeredUser.customerId);
        expect(newAccount.type).toBe('CHECKING');
        expect(newAccount.balance).toBeCloseTo(100, 2); // Parabank seeds new accounts with ~$100

        const accountsAfter = await api.getAccounts(registeredUser.customerId);
        expect(accountsAfter.length).toBe(accountsBefore.length + 1);
        const createdAccount = accountsAfter.find((a) => a.id === newAccount.id);
        expect(createdAccount).toBeTruthy();
    });

    test('Get Transactions > transactions list is returned for account', async ({
        api,
        registeredUser,
    }) => {
        console.log(registeredUser);
        const accounts = await api.getAccounts(registeredUser.customerId);
        const accountId = accounts[0].id;

        const transactions = await api.getTransactions(accountId);
        expect(transactions.length).toBeGreaterThanOrEqual(0);
        for (const tx of transactions) {
            expect(tx.accountId).toBe(accountId);
            expect(tx.amount).toBeDefined();
            expect(tx.date).toBeDefined();
            expect(tx.type).toBeDefined();
        }
    });

    test('Transfer > Transfer from account to another with amount > Transfer result', async ({
        api,
        registeredUser,
    }) => {
        const accounts = await api.getAccounts(registeredUser.customerId);
        const fromAccountId = accounts[0].id;

        const transferResult = await api.transfer(fromAccountId, fromAccountId, 100);
        console.log(transferResult);
        const response: string = `Successfully transferred $100 from account #${fromAccountId} to account #${fromAccountId}`;
        expect(transferResult).toBe(response);
    });

    test('Bill Pay > Pay bill from account to another with amount and payee body > Bill pay result', async ({
        api,
        registeredUser,
    }) => {
        const accounts = await api.getAccounts(registeredUser.customerId);
        const fromAccountId = accounts[0].id;

        const billPayResult = await api.billPay(fromAccountId, PAYEE, 50);
        expect(billPayResult['accountId']).toBe(fromAccountId);
        expect(billPayResult['amount']).toBe(50);
        expect(billPayResult['payeeName']).toBe(PAYEE.name);
    });
});