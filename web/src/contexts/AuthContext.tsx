'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import api, { setAuthTokens, clearAuthTokens, initAuthFromCookies } from '@/lib/api';
import { AuthUser } from '@/types';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<AuthUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function mapUser(raw: Record<string, unknown>): AuthUser {
  return {
    id: raw.id as string,
    username: raw.username as string,
    firstName: (raw.firstName ?? raw.first_name) as string,
    lastName: (raw.lastName ?? raw.last_name) as string,
    email: (raw.email as string | null) ?? null,
    role: raw.role as AuthUser['role'],
    mustChangePassword: Boolean(raw.mustChangePassword ?? raw.must_change_password),
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const authCheckRef = useRef(0);

  const fetchMe = useCallback(async () => {
    const checkId = ++authCheckRef.current;
    try {
      const { data } = await api.get('/auth/me');
      if (checkId !== authCheckRef.current) return;
      setUser(mapUser(data.data));
    } catch {
      if (checkId !== authCheckRef.current) return;
      setUser(null);
      clearAuthTokens();
    } finally {
      if (checkId === authCheckRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (initAuthFromCookies()) {
      fetchMe();
    } else {
      setLoading(false);
    }

    const safetyTimer = setTimeout(() => setLoading(false), 10000);

    const onCleared = () => {
      setUser(null);
      setLoading(false);
    };
    window.addEventListener('auth:cleared', onCleared);
    return () => {
      clearTimeout(safetyTimer);
      window.removeEventListener('auth:cleared', onCleared);
    };
  }, [fetchMe]);

  async function login(username: string, password: string): Promise<AuthUser> {
    authCheckRef.current++;
    const { data } = await api.post('/auth/login', { username, password });
    const { accessToken, refreshToken, user: userData } = data.data;
    setAuthTokens(accessToken, refreshToken);
    const mapped = mapUser(userData);
    setUser(mapped);
    setLoading(false);
    return mapped;
  }

  function logout() {
    authCheckRef.current++;
    clearAuthTokens();
    setUser(null);
    setLoading(false);
    window.location.href = '/login';
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
