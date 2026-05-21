import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import Cookies from 'js-cookie';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
const REQUEST_TIMEOUT_MS = 12000;

const COOKIE_OPTS = { expires: 1, path: '/', sameSite: 'lax' as const };
const REFRESH_COOKIE_OPTS = { expires: 7, path: '/', sameSite: 'lax' as const };

const LS_ACCESS = 'iminds_access_token';
const LS_REFRESH = 'iminds_refresh_token';

let memoryAccessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function setAuthTokens(accessToken: string, refreshToken?: string) {
  memoryAccessToken = accessToken;
  Cookies.set('access_token', accessToken, COOKIE_OPTS);
  localStorage.setItem(LS_ACCESS, accessToken);
  if (refreshToken) {
    Cookies.set('refresh_token', refreshToken, REFRESH_COOKIE_OPTS);
    localStorage.setItem(LS_REFRESH, refreshToken);
  }
}

export function initAuthFromCookies(): boolean {
  const access =
    Cookies.get('access_token') ||
    localStorage.getItem(LS_ACCESS) ||
    null;
  const refresh =
    Cookies.get('refresh_token') ||
    localStorage.getItem(LS_REFRESH) ||
    null;

  if (access) {
    memoryAccessToken = access;
    Cookies.set('access_token', access, COOKIE_OPTS);
    localStorage.setItem(LS_ACCESS, access);
  }
  if (refresh) {
    Cookies.set('refresh_token', refresh, REFRESH_COOKIE_OPTS);
    localStorage.setItem(LS_REFRESH, refresh);
  }
  return !!(access || refresh);
}

export function clearAuthTokens() {
  memoryAccessToken = null;
  Cookies.remove('access_token', { path: '/' });
  Cookies.remove('refresh_token', { path: '/' });
  localStorage.removeItem(LS_ACCESS);
  localStorage.removeItem(LS_REFRESH);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('auth:cleared'));
  }
}

export function getAccessToken(): string | null {
  return (
    memoryAccessToken ||
    Cookies.get('access_token') ||
    localStorage.getItem(LS_ACCESS) ||
    null
  );
}

function getRefreshToken(): string | null {
  return Cookies.get('refresh_token') || localStorage.getItem(LS_REFRESH) || null;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Request timed out')), ms)
    ),
  ]);
}

export async function refreshAccessToken(): Promise<string | null> {
  const refresh = getRefreshToken();
  if (!refresh) return null;

  if (!refreshPromise) {
    refreshPromise = withTimeout(
      axios.post(`${BASE_URL}/auth/refresh`, { refreshToken: refresh }, { timeout: REQUEST_TIMEOUT_MS }),
      REQUEST_TIMEOUT_MS
    )
      .then((res) => {
        const { accessToken, refreshToken: newRefresh } = res.data.data;
        setAuthTokens(accessToken, newRefresh || refresh);
        return accessToken as string;
      })
      .catch(() => {
        clearAuthTokens();
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

export async function ensureValidToken(): Promise<boolean> {
  if (getAccessToken()) return true;
  try {
    const token = await withTimeout(refreshAccessToken(), 6000);
    return !!token;
  } catch {
    return false;
  }
}

const api = axios.create({
  baseURL: BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err: AxiosError<any>) => {
    const original = err.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const isAuthRoute =
      original?.url?.includes('/auth/login') ||
      original?.url?.includes('/auth/register') ||
      original?.url?.includes('/auth/refresh') ||
      original?.url?.includes('/auth/me');

    if (err.response?.status === 401 && original && !original._retry && !isAuthRoute) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        original._retry = true;
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }

      clearAuthTokens();
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }

    return Promise.reject(err);
  }
);

export default api;

export function getErrorMessage(err: unknown): string {
  if (err instanceof AxiosError) {
    if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
      return 'Server is not responding. Make sure the backend is running on port 4000.';
    }
    if (!err.response) {
      return 'Cannot reach the server. Check that the API is running at ' + BASE_URL;
    }
    return err.response?.data?.message || err.message || 'An error occurred';
  }
  if (err instanceof Error) return err.message;
  return 'An error occurred';
}
