import axios from 'axios';

// 🔗 URL вашего локального API сервера
const API_BASE_URL = 'http://localhost:3000';

export interface SyncData {
  userId: string;
  deviceId: string;
  notes: any[];
  tasks: any[];
  folders: any[];
  lastSync: string;
}

export interface SyncResponse {
  success: boolean;
  message: string;
  serverData?: {
    notes: any[];
    tasks: any[];
    folders: any[];
  };
  timestamp: string;
}

export interface ApiUser {
  id: number;
  email: string;
  username?: string;
  created_at: string;
}

class ApiService {
  private api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
  });

  // 🔄 Синхронизация данных с внешним API
  async syncData(data: SyncData): Promise<SyncResponse> {
    try {
      console.log('🔄 Отправка данных на внешний API:', API_BASE_URL);
      
      // 1. Сохраняем наши данные в "облачную БД"
      const syncRecord = {
        id: Date.now(),
        userId: data.userId,
        deviceId: data.deviceId,
        notes: data.notes,
        tasks: data.tasks,
        folders: data.folders,
        lastSync: data.lastSync,
        timestamp: new Date().toISOString()
      };
      
      await this.api.post('/sync', syncRecord);
      
      // 2. Получаем ВСЕ данные этого пользователя с сервера
      const response = await this.api.get('/sync');
      const allSyncRecords = response.data || [];
      
      // 3. Находим последнюю запись этого пользователя
      const userRecords = allSyncRecords
        .filter((record: any) => record.userId === data.userId)
        .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      const latestRecord = userRecords[0] || null;
      
      return {
        success: true,
        message: '✅ Синхронизация с внешним API успешна',
        serverData: latestRecord ? {
          notes: latestRecord.notes || [],
          tasks: latestRecord.tasks || [],
          folders: latestRecord.folders || []
        } : {
          notes: [],
          tasks: [],
          folders: []
        },
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      console.error('❌ Ошибка синхронизации с внешним API:', error.message);
      return {
        success: false,
        message: `Ошибка соединения с внешним API: ${error.message}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  // 👤 Регистрация пользователя через внешний API
  async registerUser(email: string, username: string): Promise<{success: boolean; data?: any; error?: string}> {
    try {
      // Проверяем, есть ли уже такой пользователь
      const usersResponse = await this.api.get('/users');
      const existingUsers = usersResponse.data || [];
      
      const emailExists = existingUsers.some((user: any) => user.email === email);
      const usernameExists = existingUsers.some((user: any) => user.username === username);
      
      if (emailExists) {
        return { success: false, error: 'Пользователь с таким email уже зарегистрирован в системе' };
      }
      
      if (usernameExists) {
        return { success: false, error: 'Пользователь с таким логином уже зарегистрирован в системе' };
      }
      
      // Создаем нового пользователя во внешней БД
      const newUser = {
        email,
        username,
        created_at: new Date().toISOString()
      };
      
      const response = await this.api.post('/users', newUser);
      
      return { 
        success: true, 
        data: response.data 
      };
    } catch (error: any) {
      return { 
        success: false, 
        error: `Ошибка регистрации во внешней системе: ${error.message}` 
      };
    }
  }

  // 🔐 Авторизация через внешний API
  async loginUser(email: string): Promise<{success: boolean; user?: ApiUser; error?: string}> {
    try {
      const response = await this.api.get(`/users?email=${email}`);
      const users = response.data || [];
      
      if (users.length > 0) {
        return { success: true, user: users[0] };
      }
      
      return { success: false, error: 'Пользователь не найден во внешней системе' };
    } catch (error: any) {
      return { 
        success: false, 
        error: `Ошибка авторизации: ${error.message}` 
      };
    }
  }

  // 📡 Проверка доступности внешнего API
  async checkApiStatus(): Promise<boolean> {
    try {
      await this.api.get('/users');
      return true;
    } catch (error) {
      console.log('Внешний API недоступен');
      return false;
    }
  }
}

export const apiService = new ApiService();