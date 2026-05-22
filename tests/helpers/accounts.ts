import { Account, BaseAPI } from '../api/BaseAPI';

export const getAccounts = async (api: BaseAPI, customerId: number): Promise<Account[]> => {
  return api.getAccounts(customerId);
};

export const openAccount = async (
  api: BaseAPI,
  customerId: number,
  type: string,
  fromId: number,
): Promise<Account> => {
  return api.openNewAccount(customerId, type, fromId);
};

export const getBalance = async (api: BaseAPI, accountId: number): Promise<number> => {
  return api.getBalance(accountId);
};
