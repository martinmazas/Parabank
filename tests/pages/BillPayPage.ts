import { expect } from '../fixtures/index';
import { BasePage } from './BasePage';

export interface PayeeData {
  name: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  accountNumber: string;
}

export class BillPayPage extends BasePage {
  async pay(payee: PayeeData, amount: string, fromAccountId: string): Promise<void> {
    await this.page.locator('[name="payee.name"]').fill(payee.name);
    await this.page.locator('[name="payee.address.street"]').fill(payee.street);
    await this.page.locator('[name="payee.address.city"]').fill(payee.city);
    await this.page.locator('[name="payee.address.state"]').fill(payee.state);
    await this.page.locator('[name="payee.address.zipCode"]').fill(payee.zipCode);
    await this.page.locator('[name="payee.phoneNumber"]').fill(payee.phone);
    await this.page.locator('[name="payee.accountNumber"]').fill(payee.accountNumber);
    await this.page.locator('[name="verifyAccount"]').fill(payee.accountNumber);
    await this.page.locator('[name="amount"]').fill(amount);
    await this.page.locator('[name="fromAccountId"]').selectOption(fromAccountId);
    await this.page.getByRole('button', { name: 'Send Payment' }).click();
  }

  async expectSuccess(): Promise<void> {
    await expect(this.page.getByRole('heading', { name: 'Bill Payment Complete' })).toBeVisible();
  }

  async expectValidationError(text: string): Promise<void> {
    await expect(this.page.getByText(text)).toBeVisible();
  }
}
