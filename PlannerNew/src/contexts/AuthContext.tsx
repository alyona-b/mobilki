import React, { createContext, useContext, useEffect, useState } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { User, AuthState, LoginData, RegisterData, AuthResult } from '../types';
import { userService } from '../database/userService';
import { initDatabase } from '../database/database';
import { firebaseService } from '../services/firebaseService';

interface AuthContextType extends AuthState {
  login: (data: LoginData) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  forceRecreateDatabase: () => Promise<void>;
  syncWithCloud: () => Promise<void>;
  isOnline: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Локальный сервис авторизации (оффлайн)
 */
const localAuthService = {
  hashPassword(password: string): string {
    try {
      return Buffer.from(password).toString('base64');
    } catch {
      return password.split('').reverse().join('');
    }
  },

  verifyPassword(password: string, hash: string): boolean {
    return this.hashPassword(password) === hash;
  },

  async loginLocally(email: string, password: string): Promise<AuthResult> {
    try {
      console.log('🔒 Локальный вход:', email);

      const user = await userService.getUserByEmail(email);
      if (!user) {
        return { success: false, error: 'Пользователь не найден' };
      }

      const storedHash = await AsyncStorage.getItem(`user_password_${email}`);

      if (storedHash) {
        if (!this.verifyPassword(password, storedHash)) {
          return { success: false, error: 'Неверный пароль' };
        }
      } else {
        await AsyncStorage.setItem(
          `user_password_${email}`,
          this.hashPassword(password)
        );
      }

      const token = `offline_token_${Date.now()}`;
      await userService.updateAuthToken(user.id, token);

      return {
        success: true,
        user: { ...user, auth_token: token },
        isOffline: true,
      };
    } catch (error: any) {
      return {
        success: false,
        error: 'Ошибка локального входа: ' + error.message,
      };
    }
  },

  async registerLocally(email: string, password: string): Promise<AuthResult> {
    try {
      console.log('👤 Локальная регистрация:', email);

      const exists = await userService.getUserByEmail(email);
      if (exists) {
        return { success: false, error: 'Пользователь уже существует' };
      }

      const localId = `user_${Date.now()}`;
      const userId = await userService.createUser(email, localId);

      await AsyncStorage.setItem(
        `user_password_${email}`,
        this.hashPassword(password)
      );

      const token = `offline_token_${Date.now()}`;
      await userService.updateAuthToken(userId, token);

      return {
        success: true,
        user: {
          id: userId,
          local_id: localId,
          email,
          auth_token: token,
          created_at: new Date().toISOString(),
        },
        isOffline: true,
      };
    } catch (error: any) {
      return {
        success: false,
        error: 'Ошибка регистрации: ' + error.message,
      };
    }
  },
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  const [isOnline, setIsOnline] = useState(true);

  /**
   * Мониторинг сети
   */
  useEffect(() => {
    const unsub = NetInfo.addEventListener((state: NetInfoState) => {
      const online = !!(state.isConnected && state.isInternetReachable);
      setIsOnline(online);
      console.log(`📶 Сеть: ${online ? 'онлайн' : 'офлайн'}`);
    });
    return () => unsub();
  }, []);

  /**
   * Инициализация приложения
   */
  useEffect(() => {
    const init = async () => {
      try {
        console.log('🔄 Инициализация приложения...');
        await initDatabase();

        const net = await NetInfo.fetch();
        setIsOnline(!!(net.isConnected && net.isInternetReachable));

        const currentUser = await userService.getCurrentUser();

        setAuthState({
          user: currentUser,
          isAuthenticated: !!currentUser?.auth_token,
          isLoading: false,
        });

        if (currentUser && net.isConnected) {
          setTimeout(syncWithCloud, 2000);
        }

        console.log('✅ Приложение инициализировано');
      } catch (error) {
        console.error('❌ Ошибка инициализации:', error);
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
    };

    init();
  }, []);

  /**
   * Синхронизация с облаком
   */
  const syncWithCloud = async (): Promise<void> => {
    if (!authState.user || !isOnline) return;

    try {
      console.log('🔄 Синхронизация с Firebase...');
      await firebaseService.syncData(authState.user.email, {
        userId: authState.user.email,
        timestamp: new Date().toISOString(),
        isOfflineMode: false,
      });
      console.log('✅ Синхронизация завершена');
    } catch {
      console.log('⚠️ Firebase недоступен');
    }
  };

  /**
   * Принудительное пересоздание БД
   */
  const forceRecreateDatabase = async (): Promise<void> => {
    await initDatabase();
    setAuthState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  };

  /**
   * ВХОД
   */
  const login = async (data: LoginData): Promise<void> => {
    setAuthState(prev => ({ ...prev, isLoading: true }));

    let result: AuthResult;

    if (isOnline) {
      try {
        const fb = await firebaseService.loginUser(data.email, data.password);
        if (fb.success && fb.user) {
          await AsyncStorage.setItem(
            `user_password_${data.email}`,
            localAuthService.hashPassword(data.password)
          );

          let user = await userService.getUserByEmail(data.email);
          if (!user) {
            const localId = `user_${Date.now()}`;
            const id = await userService.createUser(data.email, localId);
            user = { id, local_id: localId, email: data.email };
          }

          await userService.updateAuthToken(user.id, fb.user.token);

          result = {
            success: true,
            user: { ...user, auth_token: fb.user.token },
            isOffline: false,
          };
        } else {
          throw new Error();
        }
      } catch {
        result = await localAuthService.loginLocally(data.email, data.password);
      }
    } else {
      result = await localAuthService.loginLocally(data.email, data.password);
    }

    if (!result.success || !result.user) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      throw new Error(result.error || 'Ошибка входа');
    }

    setAuthState({
      user: result.user,
      isAuthenticated: true,
      isLoading: false,
    });
  };

  /**
   * РЕГИСТРАЦИЯ
   */
  const register = async (data: RegisterData): Promise<void> => {
    setAuthState(prev => ({ ...prev, isLoading: true }));

    let result: AuthResult;

    if (isOnline) {
      try {
        const fb = await firebaseService.registerUser(data.email, data.password);
        if (fb.success && fb.user) {
          await AsyncStorage.setItem(
            `user_password_${data.email}`,
            localAuthService.hashPassword(data.password)
          );

          const localId = `user_${Date.now()}`;
          const id = await userService.createUser(data.email, localId);
          await userService.updateAuthToken(id, fb.user.token);

          result = {
            success: true,
            user: {
              id,
              local_id: localId,
              email: data.email,
              auth_token: fb.user.token,
              created_at: new Date().toISOString(),
            },
            isOffline: false,
          };
        } else {
          throw new Error();
        }
      } catch {
        result = await localAuthService.registerLocally(data.email, data.password);
      }
    } else {
      result = await localAuthService.registerLocally(data.email, data.password);
    }

    if (!result.success || !result.user) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      throw new Error(result.error || 'Ошибка регистрации');
    }

    setAuthState({
      user: result.user,
      isAuthenticated: true,
      isLoading: false,
    });
  };

  /**
   * ВЫХОД
   */
  const logout = async (): Promise<void> => {
    setAuthState(prev => ({ ...prev, isLoading: true }));

    if (isOnline) {
      try {
        await firebaseService.logout();
      } catch {}
    }

    if (authState.user) {
      await userService.logoutUser(authState.user.id);
    }

    setAuthState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  };

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        login,
        register,
        logout,
        forceRecreateDatabase,
        syncWithCloud,
        isOnline,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
};
