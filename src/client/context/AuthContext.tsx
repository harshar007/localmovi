import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, getAuthToken, setAuthToken } from '../api/apiClient';

interface User {
  id: string;
  username: string;
  role: 'admin' | 'viewer';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isSetupCompleted: boolean;
  requireAuth: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  refreshStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(getAuthToken());
  const [isSetupCompleted, setIsSetupCompleted] = useState<boolean>(true);
  const [requireAuth, setRequireAuth] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshStatus = async () => {
    try {
      const status = await api.getAuthStatus();
      setIsSetupCompleted(status.isSetupCompleted);
      setRequireAuth(status.requireAuth);

      if (token) {
        try {
          const me = await api.getMe();
          setUser(me.user);
        } catch {
          setAuthToken(null);
          setTokenState(null);
          setUser(null);
        }
      }
    } catch (err) {
      console.error('Failed to load auth status', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshStatus();
  }, []);

  const login = (newToken: string, newUser: User) => {
    setAuthToken(newToken);
    setTokenState(newToken);
    setUser(newUser);
  };

  const logout = () => {
    setAuthToken(null);
    setTokenState(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isSetupCompleted,
        requireAuth,
        isLoading,
        login,
        logout,
        refreshStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
