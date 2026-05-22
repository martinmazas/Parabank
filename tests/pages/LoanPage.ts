import { expect } from '../fixtures/index';
import { BasePage } from './BasePage';

export class LoanPage extends BasePage {
  async applyForLoan(amount: string, downPayment: string): Promise<void> {
    await this.page.locator('#amount').fill(amount);
    await this.page.locator('#downPayment').fill(downPayment);
    await this.page.getByRole('button', { name: 'Apply Now' }).click();
  }

  async expectApproved(): Promise<void> {
    await expect(this.page.locator('#loanStatus')).toHaveText('Approved');
    await expect(this.page.locator('#loanRequestApproved')).toBeVisible();
  }

  async expectDenied(): Promise<void> {
    await expect(this.page.getByRole('heading', { name: 'Loan Request Processed' })).toBeVisible();
    await expect(this.page.locator('#loanStatus')).toHaveText('Denied');
    await expect(
      this.page.getByText('We cannot grant a loan in that amount with your available funds'),
    ).toBeVisible();
  }
}
