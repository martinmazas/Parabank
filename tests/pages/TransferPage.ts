import { expect } from '../fixtures/index';
import { BasePage } from './BasePage';

export class TransferPage extends BasePage {
  async transfer(fromId: string, toId: string, amount: string): Promise<void> {
    await this.page.locator('#amount').fill(amount);
    await this.page.locator('#fromAccountId').selectOption(fromId);
    await this.page.locator('#toAccountId').selectOption(toId);
    await this.page.getByRole('button', { name: 'Transfer' }).click();
  }

  async expectSuccess(): Promise<void> {
    await expect(this.page.getByRole('heading', { name: 'Transfer Complete!' })).toBeVisible();
  }

  async filterByDateRange(accountId: string, fromDate: string, toDate: string): Promise<void> {
    await this.page.locator('#accountId').selectOption(accountId);
    await this.page.locator('#fromDate').fill(fromDate);
    await this.page.locator('#toDate').fill(toDate);
    await this.page.locator('#findByDateRange').click();
  }

  async expectResultsVisible(): Promise<void> {
    await expect(this.page.getByRole('heading', { name: 'Transaction Results' })).toBeVisible();
    await expect(this.page.locator('#transactionTable')).toBeVisible();
  }

  async getTransactionDates(): Promise<Date[]> {
    const cells = this.page.locator('#transactionBody td:first-child');
    const texts = await cells.allTextContents();
    return texts.map((text) => {
      const [mm, dd, yyyy] = text.trim().split('-').map(Number);
      return new Date(yyyy, mm - 1, dd);
    });
  }

  async filterByAmount(accountId: string, amount: string): Promise<void> {
    await this.page.locator('#accountId').selectOption(accountId);
    await this.page.locator('#amount').fill(amount);
    await this.page.locator('#findByAmount').click();
  }

  async getTransactionAmounts(): Promise<number[]> {
    const rows = this.page.locator('#transactionBody tr');
    const count = await rows.count();
    const amounts: number[] = [];
    for (let i = 0; i < count; i++) {
      const debit = (await rows.nth(i).locator('td').nth(2).textContent() ?? '').trim();
      const credit = (await rows.nth(i).locator('td').nth(3).textContent() ?? '').trim();
      const raw = (debit || credit).replace('$', '').replace(',', '');
      if (raw) amounts.push(parseFloat(raw));
    }
    return amounts;
  }
}
