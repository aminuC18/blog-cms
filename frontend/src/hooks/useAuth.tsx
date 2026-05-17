'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getMe, login as loginRequest, logout as logoutRequest } from '@/lib/api/auth.api';
import { api, setAccessToken } from '@/lib/api/axios';
import type { User } from '@/types/api.types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const refreshResponse = await api.post('/auth/refresh');
      const token =
        refreshResponse.data?.data?.accessToken ?? refreshResponse.data?.accessToken;
      if (token) {
        setAccessToken(token);
      }
      const current = await getMe();
      setUser(current);
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await refreshUser();
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      refreshUser,
      async login(email, password) {
        const result = await loginRequest(email, password);
        setUser(result.user);
      },
      async logout() {
        await logoutRequest();
        setUser(null);
      },
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
