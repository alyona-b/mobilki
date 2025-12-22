import db from './database';
import { User, LoginData, RegisterData } from '../types';

export const userService = {
  // Создание нового пользователя (локально)
  createUser: async (email: string, localId: string): Promise<number> => {
    try {
      const result = await db.runAsync(
        'INSERT INTO users (email, local_id) VALUES (?, ?);',
        [email, localId]
      );
      return result.lastInsertRowId as number;
    } catch (error) {
      throw error;
    }
  },

  // Получение пользователя по email
  getUserByEmail: async (email: string): Promise<User | null> => {
    try {
      const result = await db.getFirstAsync<User>(
        'SELECT * FROM users WHERE email = ?;',
        [email]
      );
      return result || null;
    } catch (error) {
      throw error;
    }
  },

  // Получение текущего пользователя
  getCurrentUser: async (): Promise<User | null> => {
    try {
      const result = await db.getFirstAsync<User>(
        'SELECT * FROM users LIMIT 1;',
        []
      );
      return result || null;
    } catch (error) {
      throw error;
    }
  },

  // Обновление токена аутентификации
  updateAuthToken: async (userId: number, token: string): Promise<void> => {
    try {
      await db.runAsync(
        'UPDATE users SET auth_token = ? WHERE id = ?;',
        [token, userId]
      );
    } catch (error) {
      throw error;
    }
  },

  // Выход пользователя
  logoutUser: async (userId: number): Promise<void> => {
    try {
      await db.runAsync(
        'UPDATE users SET auth_token = NULL WHERE id = ?;',
        [userId]
      );
    } catch (error) {
      throw error;
    }
  },
};