import { BasePage } from './BasePage';
import { expect } from '../fixtures/index';
import { Locator } from '@playwright/test';

export class AccountsPage extends BasePage {
  private get accountRows(): Locator {
    return this.page.locator('table#accountTable tbody tr');
  }
  
  async expectAccountList(): Promise<void> {
    await this.expectHeading('Accounts Overview');
    await this.accountRows.first().waitFor({ state: 'visible' });

    const accounts: Locator[] = await this.accountRows.all();
    expect(accounts.length).toBeGreaterThanOrEqual(1);
  }

  async openNewAccount(type: string, fromId: number): Promise<void> {
    await this.page.selectOption('#type', type);
    await this.page.selectOption('#fromAccountId', String(fromId));
    await this.page.getByRole('button', { name: 'Open New Account' }).click();
  }

  async clickAccount(id: number): Promise<void> {
    await this.page.locator(`table#accountTable a`, { hasText: String(id) }).click();
  }
}
