import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

const BASE_URL = (Constants.expoConfig?.extra?.apiUrl as string) || 'http://localhost:4000/api/v1';

const client = axios.create({ baseURL: BASE_URL });

client.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401) {
      await SecureStore.deleteItemAsync('access_token');
      await SecureStore.deleteItemAsync('refresh_token');
    }
    return Promise.reject(err);
  }
);

export default client;

export async function storeTokens(accessToken: string, refreshToken: string) {
  await SecureStore.setItemAsync('access_token', accessToken);
  await SecureStore.setItemAsync('refresh_token', refreshToken);
}

export async function clearTokens() {
  await SecureStore.deleteItemAsync('access_token');
  await SecureStore.deleteItemAsync('refresh_token');
}
