import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthState, LoginData, RegisterData } from '../types';
import { userService } from '../database/userService';
import { initDatabase, checkDatabaseStructure } from '../database/database';
import { firebaseService } from '../services/firebaseService'; // ИМПОРТ FIREBASE

interface AuthContextType extends AuthState {
  login: (data: LoginData) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  forceRecreateDatabase: () => Promise<void>;
  syncWithCloud: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

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
    if (!authState.user) return;
    
    try {
      console.log('🔄 Начинаю синхронизацию с Firebase...');
      
      // Здесь позже добавим синхронизацию заметок и задач
      const syncResult = await firebaseService.syncData(authState.user.email, {
        userId: authState.user.email,
        timestamp: new Date().toISOString(),
        message: 'Initial sync from mobile app'
      });
      
      if (syncResult.success) {
        console.log('✅ Синхронизация с Firebase успешна:', syncResult.message);
      } else {
        console.log('⚠️ Синхронизация не удалась, но приложение работает');
      }
    } catch (error) {
      console.log('ℹ️ Firebase временно недоступен, работаем локально');
    }
  };

  // Инициализация приложения
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('🔄 Initializing database...');
        
        await initDatabase();
        await checkDatabaseStructure();
        
        // Проверяем, есть ли сохраненный пользователь
        const currentUser = await userService.getCurrentUser();
        
        setAuthState({
          user: currentUser,
          isAuthenticated: !!currentUser?.auth_token,
          isLoading: false,
        });
        
        console.log('✅ App initialized successfully');
        
        // Пробуем синхронизировать если пользователь есть
        if (currentUser) {
          setTimeout(() => syncWithCloud(), 2000);
        }
      } catch (error) {
        console.error('❌ Error initializing app:', error);
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
    };

    initializeApp();
  }, []);

  // 🔐 АВТОРИЗАЦИЯ ЧЕРЕЗ FIREBASE
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

      // 🔥 ИСПОЛЬЗУЕМ FIREBASE ДЛЯ АВТОРИЗАЦИИ
      const firebaseResult = await firebaseService.loginUser(data.email, data.password);
      
      if (!firebaseResult.success) {
        throw new Error(firebaseResult.error || 'Ошибка входа');
      }

      // ПРОВЕРЯЕМ ЛОКАЛЬНО (в SQLite)
      let user = await userService.getUserByEmail(data.email);
      
      if (!user) {
        // Создаем локально если нет
        const localId = `user_${Date.now()}`;
        const userId = await userService.createUser(data.email, localId);
        user = { 
          id: userId, 
          local_id: localId, 
          email: data.email, 
          created_at: new Date().toISOString() 
        };
      }

      // Обновляем токен
      const firebaseToken = firebaseResult.user?.token || 'firebase_token_' + Date.now();
      await userService.updateAuthToken(user.id, firebaseToken);

      const updatedUser: User = {
        ...user,
        auth_token: firebaseToken,
      };

      setAuthState({
        user: updatedUser,
        isAuthenticated: true,
        isLoading: false,
      });
      
      console.log('✅ Вход через Firebase успешен');
      
      // Запускаем синхронизацию
      setTimeout(() => syncWithCloud(), 1000);
      
    } catch (error: any) {
      console.error('Login error:', error);
      setAuthState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  // 👤 РЕГИСТРАЦИЯ ЧЕРЕЗ FIREBASE
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

      // 🔥 ИСПОЛЬЗУЕМ FIREBASE ДЛЯ РЕГИСТРАЦИИ
      const firebaseResult = await firebaseService.registerUser(data.email, data.password);
      
      if (!firebaseResult.success) {
        throw new Error(firebaseResult.error || 'Ошибка регистрации');
      }

      // ПРОВЕРЯЕМ ЛОКАЛЬНО (в SQLite)
      const existingUser = await userService.getUserByEmail(data.email);
      if (existingUser) {
        // Если пользователь уже есть локально, просто обновляем токен
        const firebaseToken = firebaseResult.user?.token || 'firebase_token_' + Date.now();
        await userService.updateAuthToken(existingUser.id, firebaseToken);
        
        setAuthState({
          user: { ...existingUser, auth_token: firebaseToken },
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        // СОЗДАЕМ ПОЛЬЗОВАТЕЛЯ ЛОКАЛЬНО
        const localId = `user_${Date.now()}`;
        const userId = await userService.createUser(data.email, localId);
        const firebaseToken = firebaseResult.user?.token || 'firebase_token_' + Date.now();
        await userService.updateAuthToken(userId, firebaseToken);

        const newUser: User = {
          id: userId,
          local_id: localId,
          email: data.email,
          auth_token: firebaseToken,
          created_at: new Date().toISOString(),
        };

        setAuthState({
          user: newUser,
          isAuthenticated: true,
          isLoading: false,
        });
      }
      
      console.log('✅ Регистрация через Firebase успешна');
      
      // Запускаем синхронизацию
      setTimeout(() => syncWithCloud(), 1000);
      
    } catch (error: any) {
      console.error('Register error:', error);
      setAuthState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));

      // Выход из Firebase
      await firebaseService.logout();
      
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
      console.error('Logout error:', error);
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