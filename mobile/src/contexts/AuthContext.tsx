import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import client, { storeTokens, clearTokens } from '../api/client';

interface AuthUser {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string | null;
  role: 'admin' | 'teacher' | 'student';
  mustChangePassword: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await SecureStore.getItemAsync('access_token');
      if (token) {
        try {
          const { data } = await client.get('/auth/me');
          setUser(data.data);
        } catch {
          setUser(null);
        }
      }
      setLoading(false);
    })();
  }, []);

  async function login(username: string, password: string) {
    const { data } = await client.post('/auth/login', { username, password });
    await storeTokens(data.data.accessToken, data.data.refreshToken);
    setUser(data.data.user);
  }

  async function logout() {
    await clearTokens();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
