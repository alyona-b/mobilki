export interface User {
  id: number;
  local_id: string;
  email: string;
  auth_token?: string;
  created_at: string;
  last_sync?: string; // Добавляем время последней синхронизации
  is_offline?: boolean; // Флаг офлайн-режима
}

export interface Task {
  id: number;
  local_id: string;
  user_id: number;
  content: string;
  priority: 'high' | 'low' | 'medium'; // Добавляем medium
  date?: string; // дата выполнения
  start_time?: string; // время начала (формат: "HH:MM")
  end_time?: string; // время окончания (формат: "HH:MM")
  completed: boolean;
  created_at: string;
  updated_at: string;
  sync_status: 'synced' | 'pending' | 'error';
  cloud_id?: string; // ID в облаке для синхронизации
}

export interface Note {
  id: number;
  local_id?: string;
  user_id: number;
  folder_id?: number | null;
  title?: string | null;
  content: string;
  created_at: string;
  updated_at: string;
  sync_status: 'synced' | 'pending' | 'error';
  cloud_id?: string; // ID в облаке для синхронизации
}

export interface Folder {
  id: number;
  local_id?: string;
  user_id: number;
  name: string;
  parent_folder_id?: number | null;
  created_at: string;
  sync_status: 'synced' | 'pending' | 'error';
  cloud_id?: string; // ID в облаке для синхронизации
}

// НОВЫЙ ТИП: Параметры для экрана папки
export interface FolderScreenParams {
  folderId: number;
  folderName: string;
}

// Тип для элемента списка (может быть заметкой или папкой) - для NotesScreen
export type ListItem = 
  | { type: 'note'; data: Note }
  | { type: 'folder'; data: Folder & { noteCount: number }; isOpen: boolean };

// Тип для элемента содержимого папки - для FolderScreen
export type FolderContentItem = 
  | { type: 'note'; data: Note }
  | { type: 'folder'; data: Folder };

// Типы для навигации
export type RootStackParamList = {
  Notes: undefined;
  NoteEdit: { noteId?: number; folderId?: number };
  Folder: FolderScreenParams;
  FolderEdit: { folderId?: number; parentFolderId?: number };
  Tasks: undefined;
  TaskEdit: { taskId?: number };
  // ... другие экраны
};

// Типы для аутентификации
export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  confirmPassword: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isOnline?: boolean; // Добавляем флаг состояния сети
}

// НОВЫЙ ТИП: Результат авторизации
export interface AuthResult {
  success: boolean;
  user?: User;
  error?: string;
  isOffline?: boolean;
}

// Типы для пропсов экранов
export interface NotesScreenProps {
  onNavigateToNoteEdit?: (noteId?: number, folderId?: number) => void;
  onNavigateToTaskEdit?: (taskId?: number) => void;
  onNavigateToFolderEdit?: (folderId?: number, parentFolderId?: number) => void;
  onNavigateToFolder?: (folderId: number, folderName: string) => void;
}

export interface FolderScreenProps {
  route: {
    params: FolderScreenParams;
  };
  navigation: any;
}

export interface NoteEditScreenProps {
  route: {
    params: {
      noteId?: number;
      folderId?: number;
    };
  };
  navigation: any;
}

export interface FolderEditScreenProps {
  route: {
    params: {
      folderId?: number;
      parentFolderId?: number;
    };
  };
  navigation: any;
}

// Типы для работы с базой данных
export interface DatabaseResult {
  success: boolean;
  data?: any;
  error?: string;
}

// Тип для поиска заметок
export interface SearchNotesResult {
  notes: Note[];
  folders: Folder[];
}

// Тип для отображения заметок с расширенной информацией
export interface NoteWithFolder extends Note {
  folder_name?: string;
}

// Тип для отображения папок с количеством заметок
export interface FolderWithNoteCount extends Folder {
  noteCount: number;
  subfolderCount?: number;
}

// Тип для иерархической структуры папок
export interface FolderTreeItem extends Folder {
  children: FolderTreeItem[];
  notes: Note[];
}

// Тип для передачи данных в FAB (плавающую кнопку)
export interface FABActions {
  onNotePress: () => void;
  onTaskPress: () => void;
  onFolderPress: () => void;
}

// Тип для контекста аутентификации
export interface AuthContextType extends AuthState {
  login: (data: LoginData) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  forceRecreateDatabase?: () => Promise<void>;
  syncWithCloud?: () => Promise<void>;
  isOnline?: boolean; // Добавляем состояние сети
}

// Тип для состояния синхронизации
export interface SyncStatus {
  lastSync: string | null;
  isSyncing: boolean;
  pendingChanges: number;
  lastError?: string;
}

// НОВЫЙ ТИП: Данные для синхронизации
export interface SyncData {
  userId: string;
  timestamp: string;
  data: any;
  device: 'mobile' | 'web';
  isOfflineMode?: boolean;
}

// НОВЫЙ ТИП: Результат Firebase операции
export interface FirebaseResult {
  success: boolean;
  user?: {
    uid: string;
    email: string;
    token: string;
  };
  error?: string;
  canFallback?: boolean;
}

// НОВЫЙ ТИП: Ошибки приложения
export interface AppError {
  id: string;
  timestamp: string;
  context: string;
  message: string;
  stack?: string;
}

// НОВЫЙ ТИП: Статистика приложения
export interface AppStats {
  totalNotes: number;
  totalTasks: number;
  totalFolders: number;
  offlineMode: boolean;
  lastBackup?: string;
}

// НОВЫЙ ТИП: Конфигурация Firebase
export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}