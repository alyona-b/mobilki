import React, { createContext, useContext, useState, useEffect } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, AuthState, LoginData, RegisterData, AuthResult } from '../types';
import { userService } from '../database/userService';
import { initDatabase, checkDatabaseStructure } from '../database/database';
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

// Локальный сервис авторизации для офлайн-режима
const localAuthService = {
  // Хэширование пароля (упрощенное)
  hashPassword: (password: string): string => {
    try {
      return Buffer.from(password).toString('base64');
    } catch {
      return password.split('').reverse().join('');
    }
  },

  // Проверка пароля
  verifyPassword: (password: string, hash: string): boolean => {
    try {
      const inputHash = localAuthService.hashPassword(password);
      return inputHash === hash;
    } catch {
      return false;
    }
  },

  // Локальный вход
  loginLocally: async (email: string, password: string): Promise<AuthResult> => {
    try {
      console.log('🔒 Попытка локального входа:', email);
      
      // 1. Найти пользователя в локальной БД
      const user = await userService.getUserByEmail(email);
      
      if (!user) {
        return {
          success: false,
          error: 'Пользователь не найден. Зарегистрируйтесь.'
        };
      }
      
      // 2. Проверить пароль из AsyncStorage
      const storedPasswordHash = await AsyncStorage.getItem(`user_password_${email}`);
      
      if (storedPasswordHash) {
        // Проверяем пароль
        const isValid = localAuthService.verifyPassword(password, storedPasswordHash);
        if (!isValid) {
          return {
            success: false,
            error: 'Неверный пароль'
          };
        }
      } else {
        // Если хэша нет (первый вход был через Firebase)
        console.log('⚠️ Локального хэша пароля нет, пропускаем проверку для офлайн-режима');
        
        // Сохраняем хэш для будущих офлайн-входов
        await AsyncStorage.setItem(
          `user_password_${email}`, 
          localAuthService.hashPassword(password)
        );
      }
      
      // 3. Генерируем офлайн-токен
      const offlineToken = 'offline_token_' + Date.now();
      await userService.updateAuthToken(user.id, offlineToken);
      
      return {
        success: true,
        user: { ...user, auth_token: offlineToken },
        isOffline: true
      };
      
    } catch (error: any) {
      console.error('❌ Ошибка локального входа:', error);
      return {
        success: false,
        error: 'Ошибка локальной авторизации: ' + error.message
      };
    }
  },

  // Локальная регистрация
  registerLocally: async (email: string, password: string): Promise<AuthResult> => {
    try {
      console.log('👤 Локальная регистрация:', email);
      
      // Проверяем, нет ли уже такого пользователя
      const existingUser = await userService.getUserByEmail(email);
      if (existingUser) {
        return {
          success: false,
          error: 'Пользователь уже существует'
        };
      }
      
      // Создаем пользователя в SQLite
      const localId = `user_${Date.now()}`;
      const userId = await userService.createUser(email, localId);
      
      // Сохраняем хэш пароля для офлайн-проверки
      const passwordHash = localAuthService.hashPassword(password);
      await AsyncStorage.setItem(`user_password_${email}`, passwordHash);
      
      // Создаем офлайн-токен
      const offlineToken = 'offline_token_' + Date.now();
      await userService.updateAuthToken(userId, offlineToken);
      
      const newUser: User = {
        id: userId,
        local_id: localId,
        email: email,
        auth_token: offlineToken,
        created_at: new Date().toISOString(),
      };
      
      return {
        success: true,
        user: newUser,
        isOffline: true
      };
      
    } catch (error: any) {
      console.error('❌ Ошибка локальной регистрации:', error);
      return {
        success: false,
        error: 'Ошибка регистрации: ' + error.message
      };
    }
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });
  
  const [isOnline, setIsOnline] = useState<boolean>(true);

  // Мониторинг состояния сети
  useEffect(() => {
    const unsubscribeNetInfo = NetInfo.addEventListener((state: NetInfoState) => {
      const online = state.isConnected && state.isInternetReachable;
      setIsOnline(!!online);
      console.log(`📶 Сеть: ${online ? 'онлайн' : 'офлайн'}`);
    });

    return () => unsubscribeNetInfo();
  }, []);

  // Функция для принудительного пересоздания БД
  const forceRecreateDatabase = async (): Promise<void> => {
    try {
      console.log('🔄 Force recreating database...');
      await initDatabase();
      console.log('✅ Database recreated successfully');
      
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    } catch (error) {
      console.log('❌ Error force recreating database:', error);
      throw error;
    }
  };

  // Функция синхронизации с облаком
  const syncWithCloud = async (): Promise<void> => {
    if (!authState.user || !isOnline) {
      console.log('ℹ️ Синхронизация невозможна: нет пользователя или сети');
      return;
    }
    
    try {
      console.log('🔄 Начинаю синхронизацию с Firebase...');
      
      const syncResult = await firebaseService.syncData(authState.user.email, {
        userId: authState.user.email,
        timestamp: new Date().toISOString(),
        message: 'Sync from mobile app',
        isOfflineMode: false
      });
      
      if (syncResult.success) {
        console.log('✅ Синхронизация с Firebase успешна:', syncResult.message);
      } else {
        console.log('⚠️ Синхронизация не удалась, работаем локально');
      }
    } catch (error) {
      console.log('ℹ️ Firebase временно недоступен, работаем локально');
    }
  };

  // Автоматическая синхронизация при восстановлении сети
  useEffect(() => {
    if (isOnline && authState.user && authState.isAuthenticated) {
      console.log('🌐 Сеть восстановлена, запускаю синхронизацию...');
      setTimeout(() => syncWithCloud(), 3000);
    }
  }, [isOnline, authState.user]);

  // Инициализация приложения
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('🔄 Initializing database...');
        
        await initDatabase();
        await checkDatabaseStructure();
        
        // Проверяем состояние сети
        const networkState = await NetInfo.fetch();
        setIsOnline(!!(networkState.isConnected && networkState.isInternetReachable));
        
        // Проверяем, есть ли сохраненный пользователь
        const currentUser = await userService.getCurrentUser();
        
        setAuthState({
          user: currentUser,
          isAuthenticated: !!currentUser?.auth_token,
          isLoading: false,
        });
        
        console.log('✅ App initialized successfully');
        console.log(`📱 Режим: ${networkState.isConnected ? 'онлайн' : 'офлайн'}`);
        
        // Пробуем синхронизировать если пользователь есть и есть сеть
        if (currentUser && networkState.isConnected) {
          setTimeout(() => syncWithCloud(), 2000);
        }
      } catch (error: any) {
        console.error('❌ Error initializing app:', error);
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
    };

    initializeApp();
  }, []);

  // 🔐 АВТОРИЗАЦИЯ (офлайн + онлайн)
  const login = async (data: LoginData): Promise<void> => {
    try {
      // ВАЛИДАЦИЯ ВВОДА
      if (!data.email?.trim()) {
        throw new Error('Введите email');
      }
      if (!data.password?.trim()) {
        throw new Error('Введите пароль');
      }
      
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      console.log('🔄 Начало входа:', data.email);
      console.log(`📶 Состояние сети: ${isOnline ? 'онлайн' : 'офлайн'}`);
      
      let authResult: AuthResult;
      
      if (isOnline) {
        console.log('🌐 Онлайн-режим: пытаемся через Firebase...');
        
        try {
          // Пробуем Firebase с таймаутом
          const firebaseResult = await firebaseService.loginUser(data.email, data.password);
          
          if (firebaseResult.success && firebaseResult.user) {
            console.log('✅ Firebase успешно ответил');
            
            // 1. Сохраняем хэш пароля для будущих офлайн-входов
            await AsyncStorage.setItem(
              `user_password_${data.email}`, 
              localAuthService.hashPassword(data.password)
            );
            
            // 2. Проверяем/создаем пользователя локально
            let user = await userService.getUserByEmail(data.email);
            
            if (!user) {
              const localId = `user_${Date.now()}`;
              const userId = await userService.createUser(data.email, localId);
              user = { 
                id: userId, 
                local_id: localId, 
                email: data.email, 
                created_at: new Date().toISOString() 
              };
            }
            
            // 3. Обновляем токен
            const firebaseToken = firebaseResult.user.token;
            await userService.updateAuthToken(user.id, firebaseToken);
            
            authResult = {
              success: true,
              user: { ...user, auth_token: firebaseToken },
              isOffline: false
            };
            
          } else if (firebaseResult.canFallback) {
            // Firebase не ответил, но можно fallback
            console.log('⚠️ Firebase недоступен, fallback на локальный вход');
            authResult = await localAuthService.loginLocally(data.email, data.password);
          } else {
            // Firebase вернул ошибку (неверные данные)
            throw new Error(firebaseResult.error || 'Ошибка входа');
          }
          
        } catch (firebaseError: any) {
          console.log('⚠️ Firebase ошибка:', firebaseError.message);
          // Fallback на локальную авторизацию
          authResult = await localAuthService.loginLocally(data.email, data.password);
        }
        
      } else {
        // ОФФЛАЙН РЕЖИМ - только локальная проверка
        console.log('📴 Офлайн-режим: локальная авторизация');
        authResult = await localAuthService.loginLocally(data.email, data.password);
      }
      
      // Проверяем результат авторизации
      if (!authResult.success) {
        throw new Error(authResult.error || 'Ошибка входа');
      }
      
      if (!authResult.user) {
        throw new Error('Пользователь не найден');
      }
      
      // Устанавливаем пользователя
      setAuthState({
        user: authResult.user,
        isAuthenticated: true,
        isLoading: false,
      });
      
      console.log(`✅ Вход успешен (${authResult.isOffline ? 'офлайн' : 'онлайн'})`);
      
      // Если онлайн - синхронизируем
      if (!authResult.isOffline && isOnline) {
        setTimeout(() => syncWithCloud(), 1000);
      }
      
    } catch (error: any) {
      console.error('❌ Login error:', error);
      setAuthState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  // 👤 РЕГИСТРАЦИЯ (офлайн + онлайн)
  const register = async (data: RegisterData): Promise<void> => {
    try {
      // ВАЛИДАЦИЯ ВВОДА
      if (!data.email?.trim()) {
        throw new Error('Введите email');
      }
      if (!data.password?.trim()) {
        throw new Error('Введите пароль');
      }
      if (!data.confirmPassword?.trim()) {
        throw new Error('Подтвердите пароль');
      }
      if (data.password !== data.confirmPassword) {
        throw new Error('Пароли не совпадают');
      }
      
      // Проверка пароля
      if (data.password.length < 6) {
        throw new Error('Пароль должен содержать минимум 6 символов');
      }
      
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      console.log(`📶 Состояние сети при регистрации: ${isOnline ? 'онлайн' : 'офлайн'}`);
      
      let authResult: AuthResult;
      
      if (isOnline) {
        console.log('🌐 Онлайн-регистрация: пытаемся через Firebase...');
        
        try {
          const firebaseResult = await firebaseService.registerUser(data.email, data.password);
          
          if (firebaseResult.success && firebaseResult.user) {
            console.log('✅ Firebase регистрация успешна');
            
            // Сохраняем хэш пароля
            await AsyncStorage.setItem(
              `user_password_${data.email}`, 
              localAuthService.hashPassword(data.password)
            );
            
            // Проверяем, есть ли уже пользователь локально
            const existingUser = await userService.getUserByEmail(data.email);
            
            if (existingUser) {
              // Обновляем токен
              const firebaseToken = firebaseResult.user.token;
              await userService.updateAuthToken(existingUser.id, firebaseToken);
              
              authResult = {
                success: true,
                user: { ...existingUser, auth_token: firebaseToken },
                isOffline: false
              };
            } else {
              // Создаем нового пользователя
              const localId = `user_${Date.now()}`;
              const userId = await userService.createUser(data.email, localId);
              const firebaseToken = firebaseResult.user.token;
              await userService.updateAuthToken(userId, firebaseToken);
              
              authResult = {
                success: true,
                user: {
                  id: userId,
                  local_id: localId,
                  email: data.email,
                  auth_token: firebaseToken,
                  created_at: new Date().toISOString(),
                },
                isOffline: false
              };
            }
            
          } else if (firebaseResult.canFallback) {
            // Firebase недоступен, fallback на локальную регистрацию
            console.log('⚠️ Firebase недоступен, локальная регистрация');
            authResult = await localAuthService.registerLocally(data.email, data.password);
          } else {
            // Ошибка регистрации в Firebase
            throw new Error(firebaseResult.error || 'Ошибка регистрации');
          }
          
        } catch (firebaseError: any) {
          console.log('⚠️ Firebase ошибка при регистрации:', firebaseError.message);
          // Fallback на локальную регистрацию
          authResult = await localAuthService.registerLocally(data.email, data.password);
        }
        
      } else {
        // Офлайн-регистрация
        console.log('📴 Офлайн-регистрация');
        authResult = await localAuthService.registerLocally(data.email, data.password);
      }
      
      // Проверяем результат
      if (!authResult.success) {
        throw new Error(authResult.error || 'Ошибка регистрации');
      }
      
      if (!authResult.user) {
        throw new Error('Не удалось создать пользователя');
      }
      
      setAuthState({
        user: authResult.user,
        isAuthenticated: true,
        isLoading: false,
      });
      
      console.log(`✅ Регистрация успешна (${authResult.isOffline ? 'офлайн' : 'онлайн'})`);
      
      // Если онлайн - синхронизируем
      if (!authResult.isOffline && isOnline) {
        setTimeout(() => syncWithCloud(), 1000);
      }
      
    } catch (error: any) {
      console.error('❌ Register error:', error);
      setAuthState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));

      // Пытаемся выйти из Firebase (если онлайн)
      if (isOnline) {
        try {
          await firebaseService.logout();
        } catch (error) {
          console.log('⚠️ Ошибка выхода из Firebase:', error);
        }
      }
      
      // Выход локально
      if (authState.user) {
        await userService.logoutUser(authState.user.id);
      }
      
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
      
      console.log('✅ Пользователь вышел из системы');
    } catch (error) {
      console.error('❌ Logout error:', error);
      setAuthState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  const value: AuthContextType = {
    ...authState,
    login,
    register,
    logout,
    forceRecreateDatabase,
    syncWithCloud,
    isOnline,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};