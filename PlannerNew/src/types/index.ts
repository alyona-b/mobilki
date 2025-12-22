export interface User {
  id: number;
  local_id: string;
  email: string;
  auth_token?: string;
  created_at: string;
}

export interface Task {
  id: number;
  local_id: string;
  user_id: number;
  content: string;
  priority: 'high' | 'low';
  date?: string; // дата выполнения
  start_time?: string; // время начала (формат: "HH:MM")
  end_time?: string; // время окончания (формат: "HH:MM")
  completed: boolean;
  created_at: string;
  updated_at: string;
  sync_status: 'synced' | 'pending' | 'error';
}

export interface Note {
  id: number;
  local_id?: string; // опциональный
  user_id: number;
  folder_id?: number | null; // разрешаем null
  title?: string | null;
  content: string;
  created_at: string;
  updated_at: string;
  sync_status: 'synced' | 'pending' | 'error';
}

export interface Folder {
  id: number;
  local_id?: string; // опциональный
  user_id: number;
  name: string;
  parent_folder_id?: number | null; // НОВОЕ: для вложенных папок
  created_at: string;
  sync_status: 'synced' | 'pending' | 'error';
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
  navigation: any; // Или более конкретный тип навигации
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
export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearAuthError: () => void;
}

// Тип для состояния синхронизации
export interface SyncStatus {
  lastSync: string | null;
  isSyncing: boolean;
  pendingChanges: number;
  lastError?: string;
}