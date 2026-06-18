import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { fetchCurrentUser, loginRequest } from '../api';
import type { AppUser } from '../types';

const TOKEN_STORAGE_KEY = 'meat_menu_mobile_token';

interface AuthContextValue {
  token: string | null;
  user: AppUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const savedToken = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);

        if (!savedToken) {
          setIsLoading(false);
          return;
        }

        const { user: currentUser } = await fetchCurrentUser(savedToken);

        if (currentUser.role !== 'shop_owner') {
          await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
          setIsLoading(false);
          return;
        }

        setToken(savedToken);
        setUser(currentUser);
      } catch {
        await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user,
      isLoading,
      login: async (email: string, password: string) => {
        const response = await loginRequest(email.trim(), password);

        if (response.user.role !== 'shop_owner') {
          throw new Error('This mobile app is available only for shop owners.');
        }

        await AsyncStorage.setItem(TOKEN_STORAGE_KEY, response.token);
        setToken(response.token);
        setUser(response.user);
      },
      logout: async () => {
        await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
        setToken(null);
        setUser(null);
      },
    }),
    [isLoading, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}
