import { RegistrationData } from '../api/BaseAPI';
export type { RegistrationData };

export interface TransferPayload {
  amount: number;
  fromId: number;
  toId: number;
}

export const uniqueUsername = (): string => {
  return `user_${Date.now()}`;
};

export const uniquePassword = (): string => {
  return `pass_${Date.now()}`;
};

export const buildRegistrationData = (): RegistrationData => {
  const username = uniqueUsername();
  const password = uniquePassword();
  return {
    firstName: 'John',
    lastName: 'Doe',
    address: '123 Main St',
    city: 'Springfield',
    state: 'IL',
    zipCode: '62701',
    phoneNumber: '5551234567',
    ssn: '123456789',
    username,
    password,
  };
};

const TRANSFER_DEFAULTS: TransferPayload = { fromId: 0, toId: 0, amount: 100 };

export function buildTransferPayload(fromId: number, toId: number, amount: number): TransferPayload;
export function buildTransferPayload(fromId: number, toId: number): TransferPayload;
export function buildTransferPayload(overrides: Partial<TransferPayload>): TransferPayload;
export function buildTransferPayload(
  fromIdOrOverrides: number | Partial<TransferPayload>,
  toId?: number,
  amount?: number,
): TransferPayload {
  if (typeof fromIdOrOverrides === 'object') {
    return { ...TRANSFER_DEFAULTS, ...fromIdOrOverrides };
  }
  return { fromId: fromIdOrOverrides, toId: toId!, amount: amount ?? TRANSFER_DEFAULTS.amount };
}
