import { Page } from '@playwright/test';

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export class BasePage {
  protected readonly page: Page;

  constructor(page: Page) {
    this.page = page;

    return new Proxy(this, {
      get(target, prop: string | symbol, receiver) {
        if (prop in target) {
          return Reflect.get(target, prop, receiver);
        }
        const val = Reflect.get(page as object, prop);
        return typeof val === 'function' ? val.bind(page) : val;
      },
    });
  }

  async navigateTo(path: string): Promise<void> {
    await this.page.goto(path);
  }

  async expectHeading(name: string): Promise<void> {
    await this.page.getByRole('heading', { name }).waitFor({ state: 'visible' });
  }
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging, @typescript-eslint/no-empty-object-type
export interface BasePage extends Page {}
