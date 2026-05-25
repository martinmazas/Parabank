import { APIRequestContext } from '@playwright/test';

export interface Customer {
  id: number;
  firstName: string;
  lastName: string;
}

export interface Account {
  id: number;
  customerId: number;
  type: string;
  balance: number;
}

export interface Transaction {
  id: number;
  accountId: number;
  type: string;
  date: number;
  amount: number;
  description: string;
}

export interface RegistrationData {
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phoneNumber: string;
  ssn: string;
  username: string;
  password: string;
}

export class BaseAPI {
  private readonly request: APIRequestContext;
  private readonly baseUrl: string;

  constructor(request: APIRequestContext) {
    this.request = request;
    this.baseUrl = `${(process.env.API_BASE_URL ?? '').replace(/\/$/, '')}/services/bank`;
  }

  protected async get<T>(path: string): Promise<T> {
    const res = await this.request.get(`${this.baseUrl}${path}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok()) {
      throw new Error(`GET ${path} failed: ${res.status()} ${await res.text()}`);
    }
    return res.json() as Promise<T>;
  }

  protected async post<T>(path: string, params?: Record<string, string | number>): Promise<T> {
    const res = await this.request.post(`${this.baseUrl}${path}`, {
      headers: { Accept: 'application/json' },
      params,
    });
    if (!res.ok()) {
      throw new Error(`POST ${path} failed: ${res.status()} ${await res.text()}`);
    }
    return res.json() as Promise<T>;
  }

  async login(username: string, password: string): Promise<number> {
    const customer = await this.get<Customer>(`/login/${username}/${password}`);
    return customer.id;
  }

  async getAccounts(customerId: number): Promise<Account[]> {
    return this.get<Account[]>(`/customers/${customerId}/accounts`);
  }

  async openNewAccount(customerId: number, type: string, fromId: number): Promise<Account> {
    return this.post<Account>('/createAccount', { customerId, newAccountType: type, fromAccountId: fromId });
  }

  async getBalance(accountId: number): Promise<number> {
    const account = await this.get<Account>(`/accounts/${accountId}`);
    return account.balance;
  }

  async getTransactions(accountId: number): Promise<Transaction[]> {
    return this.get<Transaction[]>(`/accounts/${accountId}/transactions`);
  }

  async transfer(fromId: number, toId: number, amount: number): Promise<void> {
    // The /transfer endpoint returns plain text ("Successfully transferred...") despite
    // advertising Content-Type: application/json — skip res.json() to avoid a parse error.
    const res = await this.request.post(`${this.baseUrl}/transfer`, {
      headers: { Accept: 'application/json' },
      params: { fromAccountId: fromId, toAccountId: toId, amount },
    });
    if (!res.ok()) {
      throw new Error(`POST /transfer failed: ${res.status()} ${await res.text()}`);
    }
  }

}
