import { BaseAPI, Transaction } from '../api/BaseAPI';

export const transfer = async (
  api: BaseAPI,
  fromId: number,
  toId: number,
  amount: number,
): Promise<void> => {
  return api.transfer(fromId, toId, amount);
};

export const getTransactions = async (api: BaseAPI, accountId: number): Promise<Transaction[]> => {
  return api.getTransactions(accountId);
};
