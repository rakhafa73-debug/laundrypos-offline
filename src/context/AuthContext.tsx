import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '../types';
import { apiFetch } from '../utils/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  needsSetup: boolean;
  login: (token: string, user: User) => void;
  logout: () => Promise<void>;
  checkSetupStatus: () => Promise<boolean>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('laundrypos_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [needsSetup, setNeedsSetup] = useState<boolean>(false);

  const checkSetupStatus = async (): Promise<boolean> => {
    try {
      const res = await apiFetch('/api/v1/auth/setup-status');
      setNeedsSetup(res.needsSetup);
      return res.needsSetup;
    } catch {
      return false;
    }
  };

  const refreshUser = async () => {
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await apiFetch('/api/v1/auth/me');
      if (res.success && res.user) {
        setUser(res.user);
      } else {
        localStorage.removeItem('laundrypos_token');
        setToken(null);
        setUser(null);
      }
    } catch {
      // If network fails, keep cached user identity for offline UI view
      const cached = localStorage.getItem('laundrypos_user');
      if (cached) {
        try {
          setUser(JSON.parse(cached));
        } catch {
          setUser(null);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const isSetup = await checkSetupStatus();
      if (!isSetup && token) {
        await refreshUser();
      } else {
        setIsLoading(false);
      }
    };
    init();
  }, [token]);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('laundrypos_token', newToken);
    localStorage.setItem('laundrypos_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = async () => {
    try {
      await apiFetch('/api/v1/auth/logout', { method: 'POST' });
    } catch {
      // silent fail on logout
    } finally {
      localStorage.removeItem('laundrypos_token');
      localStorage.removeItem('laundrypos_user');
      setToken(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        needsSetup,
        login,
        logout,
        checkSetupStatus,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
