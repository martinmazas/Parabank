import { test } from './fixtures/index';

test.describe('Loans', () => {
  test('Request loan with sufficient income > Approved status in response', async ({
    loginPage,
    loanPage,
    registeredUser,
  }) => {
    await loginPage.ensureLoggedIn(registeredUser.username, registeredUser.password, 'requestloan.htm');
    await loanPage.applyForLoan('1000', '100');
    await loanPage.expectApproved();
  });

  test('Request loan with 0 down payment and high amount > Denied status and error message shown', async ({
    loginPage,
    loanPage,
    registeredUser,
  }) => {
    await loginPage.ensureLoggedIn(registeredUser.username, registeredUser.password, 'requestloan.htm');
    await loanPage.applyForLoan('1000000', '0');
    await loanPage.expectDenied();
  });
});
