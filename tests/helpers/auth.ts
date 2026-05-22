import { BaseAPI } from '../api/BaseAPI';

export default async function login(
  api: BaseAPI,
  username: string,
  password: string,
): Promise<number> {
  return api.login(username, password);
}
 