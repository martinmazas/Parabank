import { expect } from '../fixtures/index';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  async login(username: string, password: string): Promise<void> {
    await this.navigateTo('index.htm');
    await this.page.locator('input[name="username"]').fill(username);
    await this.page.locator('input[name="password"]').fill(password);
    await this.page.getByRole('button', {name: 'Log In'}).click();
  }

  /**
   * Navigates directly to `targetPath`.  If the session is already active the
   * page loads immediately and no credentials are needed.  If Parabank redirects
   * to the login page (index.htm) or the login form becomes visible, the method
   * logs in with the supplied credentials and then navigates to `targetPath`.
   */
  async ensureLoggedIn(username: string, password: string, targetPath: string): Promise<void> {
    await this.navigateTo(targetPath);

    // Detect redirect to login: URL contains index.htm, or the login form is on the page.
    const redirectedToLogin =
      this.page.url().includes('index.htm') ||
      (await this.page.locator('input[name="username"]').isVisible());

    if (redirectedToLogin) {
      await this.page.locator('input[name="username"]').fill(username);
      await this.page.locator('input[name="password"]').fill(password);
      await this.page.getByRole('button', { name: 'Log In' }).click();
      // After login Parabank lands on overview.htm; navigate to the intended page.
      if (!this.page.url().includes(targetPath.split('?')[0])) {
        await this.navigateTo(targetPath);
      }
    }
  }

  async expectOverview(): Promise<void> {
    await expect(this.page.getByRole('heading', { name: 'Accounts Overview' })).toBeVisible();
    await expect(this.page.getByText('Welcome', { exact: false })).toBeVisible();
  }

  async expectError(): Promise<void> {
    await expect(this.page.getByRole('heading', { name: 'Error!' })).toBeVisible();
  }
}