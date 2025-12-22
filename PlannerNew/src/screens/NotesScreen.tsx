import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { noteService } from '../database/noteService';
import { useAuth } from '../contexts/AuthContext';
import { Note, Folder } from '../types';
import SimpleFAB from '../components/SimpleFAB';

// ВОЗВРАЩАЕМ интерфейс пропсов
interface NotesScreenProps {
  onNavigateToNoteEdit?: (noteId?: number, folderId?: number) => void;
  onNavigateToTaskEdit?: (taskId?: number) => void;
  onNavigateToFolderEdit?: (folderId?: number, parentFolderId?: number) => void;
  onNavigateToFolder?: (folderId: number, folderName: string) => void; // ДОБАВИЛИ ДЛЯ НАВИГАЦИИ В ПАПКИ
}

// Тип для элемента списка (может быть заметкой или папкой)
type ListItem = 
  | { type: 'note'; data: Note }
  | { type: 'folder'; data: Folder & { noteCount: number }; isOpen: boolean };

const NotesScreen: React.FC<NotesScreenProps> = ({ 
  onNavigateToTaskEdit, 
  onNavigateToNoteEdit,
  onNavigateToFolderEdit,
  onNavigateToFolder // ДОБАВИЛИ ДЛЯ НАВИГАЦИИ В ПАПКИ
}) => {
  const { user } = useAuth();
  const [items, setItems] = useState<ListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Загрузка данных при монтировании и изменении user
  useEffect(() => {
    console.log('useEffect triggered, user:', user?.id);
    if (user) {
      loadData();
    } else {
      setItems([]);
      setIsLoading(false);
    }
  }, [user]);

  const loadData = async () => {
    console.log('loadData called, user:', user?.id);
    if (!user) {
      console.log('No user, skipping load');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Loading ALL data for user:', user.id);
      
      // ЗАГРУЗКА ВСЕХ ДАННЫХ ПОЛЬЗОВАТЕЛЯ БЕЗ ФИЛЬТРАЦИИ
      const [allFolders, allNotes] = await Promise.all([
        noteService.getFoldersByUser(user.id), // Все папки пользователя
        noteService.getNotesByUser(user.id),   // Все заметки пользователя
      ]);

      console.log('ALL folders loaded:', allFolders.length, 'folders:', allFolders);
      console.log('ALL notes loaded:', allNotes.length, 'notes:', allNotes);

      // 1. Сначала создадим Map для быстрого доступа к заметкам по папке
      const notesByFolder = new Map<number | null, Note[]>();
      
      // Инициализируем все папки (включая null для корня)
      notesByFolder.set(null, []); // Заметки без папки
      allFolders.forEach(folder => notesByFolder.set(folder.id, []));
      
      // Распределяем заметки по папкам
      allNotes.forEach(note => {
        const folderId = note.folder_id || null;
        if (notesByFolder.has(folderId)) {
          notesByFolder.get(folderId)!.push(note);
        } else {
          // Если папка не найдена, добавляем в корень
          notesByFolder.get(null)!.push(note);
        }
      });

      console.log('Notes by folder:', Object.fromEntries(notesByFolder));

      // 2. Создаем элементы для отображения
      const itemsToDisplay: ListItem[] = [];
      
      // Добавляем папки (только корневые, без parent_folder_id)
      const rootFolders = allFolders.filter(folder => !folder.parent_folder_id);
      console.log('Root folders:', rootFolders.length);
      
      for (const folder of rootFolders) {
        const notesInFolder = notesByFolder.get(folder.id) || [];
        itemsToDisplay.push({
          type: 'folder',
          data: {
            ...folder,
            noteCount: notesInFolder.length
          },
          isOpen: false
        });
      }
      
      // Добавляем заметки без папки (корневые заметки)
      const rootNotes = notesByFolder.get(null) || [];
      console.log('Root notes (no folder):', rootNotes.length);
      
      for (const note of rootNotes) {
        itemsToDisplay.push({
          type: 'note',
          data: note
        });
      }

      // 3. Сортируем: сначала папки, потом заметки
      itemsToDisplay.sort((a, b) => {
        if (a.type === 'folder' && b.type === 'note') return -1;
        if (a.type === 'note' && b.type === 'folder') return 1;
        return 0;
      });

      console.log('Total items to display:', itemsToDisplay.length);
      setItems(itemsToDisplay);
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Не удалось загрузить данные');
      setItems([]);
      
      // Создаем тестовые данные для отладки
      if (user) {
        // Создаем тестовую папку без лишних полей
        const testFolder: Folder & { noteCount: number } = {
          id: 999,
          name: 'Тестовая папка',
          user_id: user.id,
          parent_folder_id: null,
          // Добавляем только те поля, которые есть в типе Folder
          created_at: new Date().toISOString(),
          sync_status: 'synced',
          noteCount: 2
        };
        
        const testNote: Note = {
          id: 1000,
          title: 'Тестовая заметка',
          content: 'Это тестовая заметка',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user_id: user.id,
          folder_id: null,
          sync_status: 'synced'
        };
        
        const testItems: ListItem[] = [
          {
            type: 'folder',
            data: testFolder,
            isOpen: false
          },
          {
            type: 'note',
            data: testNote
          }
        ];
        setItems(testItems);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotePress = (note: Note) => {
    // ИСПОЛЬЗУЕМ ПРОПС вместо navigation
    onNavigateToNoteEdit?.(note.id, note.folder_id || undefined);
  };

  const handleFolderPress = (folder: Folder & { noteCount: number }) => {
    console.log('Opening folder:', folder.id, folder.name);
    
    // ИСПОЛЬЗУЕМ НОВЫЙ ПРОПС ДЛЯ НАВИГАЦИИ В ПАПКУ
    if (onNavigateToFolder) {
      onNavigateToFolder(folder.id, folder.name);
    } else {
      // Для обратной совместимости
      Alert.alert(
        'Папка: ' + folder.name,
        `В папке ${folder.noteCount} заметок`,
        [
          { text: 'Отмена', style: 'cancel' },
          { text: 'Редактировать', onPress: () => onNavigateToFolderEdit?.(folder.id, folder.parent_folder_id || undefined) }
        ]
      );
    }
  };

  const handleCreateNote = () => {
    onNavigateToNoteEdit?.(undefined, undefined);
  };

  const handleCreateTask = () => {
    onNavigateToTaskEdit?.();
  };

  const handleCreateFolder = () => {
    onNavigateToFolderEdit?.(undefined, undefined);
  };

  const handleDeleteNote = (note: Note) => {
    Alert.alert(
      'Удалить заметку',
      `Вы уверены, что хотите удалить заметку "${note.title || 'без названия'}"?`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              await noteService.deleteNote(note.id);
              loadData(); // Перезагружаем список
            } catch (error) {
              console.error('Error deleting note:', error);
              Alert.alert('Ошибка', 'Не удалось удалить заметку');
            }
          },
        },
      ]
    );
  };

  const handleDeleteFolder = (folder: Folder) => {
    Alert.alert(
      'Удалить папку',
      `Вы уверены, что хотите удалить папку "${folder.name}"?`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              await noteService.deleteFolder(user!.id, folder.id);
              loadData(); // Перезагружаем список
            } catch (error) {
              console.error('Error deleting folder:', error);
              Alert.alert('Ошибка', 'Не удалось удалить папку');
            }
          },
        },
      ]
    );
  };

  const handleEditFolder = (folder: Folder) => {
    onNavigateToFolderEdit?.(folder.id, folder.parent_folder_id || undefined);
  };

  const handleSearch = async () => {
    if (!user || !searchQuery.trim()) {
      loadData();
      setIsSearching(false);
      return;
    }

    try {
      setIsLoading(true);
      setIsSearching(true);
      setError(null);
      const searchResults = await noteService.searchNotes(user.id, searchQuery);
      
      console.log('Search results found:', searchResults.length);
      const noteItems: ListItem[] = searchResults.map(note => ({
        type: 'note',
        data: note
      }));
      
      setItems(noteItems);
    } catch (error) {
      console.error('Error searching notes:', error);
      setError('Не удалось выполнить поиск');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setIsSearching(false);
    loadData();
  };

  const toggleFolderOpen = (folderId: number) => {
    setItems(prevItems => 
      prevItems.map(item => 
        item.type === 'folder' && item.data.id === folderId
          ? { ...item, isOpen: !item.isOpen }
          : item
      )
    );
  };

  const renderItem = ({ item }: { item: ListItem }) => {
    if (item.type === 'folder') {
      const { data: folder, isOpen } = item;
      const noteCount = folder.noteCount || 0;
      
      return (
        <TouchableOpacity
          style={styles.folderCard}
          onPress={() => handleFolderPress(folder)}
          onLongPress={() => handleEditFolder(folder)}
        >
          <View style={styles.folderHeader}>
            <Text style={styles.folderIcon}>📁</Text>
            <View style={styles.folderInfo}>
              <Text style={styles.folderName} numberOfLines={1}>
                {folder.name}
              </Text>
              <Text style={styles.folderCount}>
                {noteCount} замет{noteCount === 1 ? 'ка' : noteCount >= 2 && noteCount <= 4 ? 'ки' : 'ок'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.folderToggle}
              onPress={(e) => {
                e.stopPropagation();
                toggleFolderOpen(folder.id);
              }}
            >
              <Text style={styles.folderToggleIcon}>
                {isOpen ? '▲' : '▼'}
              </Text>
            </TouchableOpacity>
          </View>
          
          {isOpen && (
            <View style={styles.folderActions}>
              <TouchableOpacity onPress={() => handleDeleteFolder(folder)}>
                <Text style={styles.folderDeleteText}>Удалить папку</Text>
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>
      );
    } else {
      const { data: note } = item;
      
      return (
        <TouchableOpacity
          style={styles.noteCard}
          onPress={() => handleNotePress(note)}
          onLongPress={() => handleDeleteNote(note)}
        >
          <View>
            {note.title ? (
              <Text style={styles.noteTitle} numberOfLines={2}>
                {note.title}
              </Text>
            ) : null}
            <Text style={styles.noteContent} numberOfLines={3}>
              {note.content || 'Нет содержимого'}
            </Text>
            <Text style={styles.noteDate}>
              {new Date(note.updated_at).toLocaleDateString('ru-RU')}
            </Text>
          </View>
        </TouchableOpacity>
      );
    }
  };

  console.log('Render state:', {
    isLoading,
    itemsLength: items.length,
    isSearching,
    searchQuery
  });

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Заметки</Text>
          <TouchableOpacity onPress={loadData} style={styles.refreshButton}>
            <Text style={styles.refreshButtonText}>↻</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>Загрузка...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Заголовок с кнопкой обновления */}
      <View style={styles.header}>
        <Text style={styles.title}>Заметки</Text>
        <TouchableOpacity onPress={loadData} style={styles.refreshButton}>
          <Text style={styles.refreshButtonText}>↻</Text>
        </TouchableOpacity>
      </View>

      {/* Отладочная информация */}
      <View style={styles.debugContainer}>
        <Text style={styles.debugText}>
          Папок: {items.filter(i => i.type === 'folder').length} | 
          Заметок: {items.filter(i => i.type === 'note').length}
        </Text>
      </View>

      {/* Поиск */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Поиск заметок..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        {searchQuery ? (
          <TouchableOpacity onPress={handleClearSearch} style={styles.clearSearchButton}>
            <Text style={styles.clearSearchText}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Сообщение об ошибке */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={loadData}>
            <Text style={styles.errorButtonText}>Повторить</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Результаты поиска */}
      {isSearching && (
        <Text style={styles.searchResultsText}>
          Результаты поиска для "{searchQuery}"
        </Text>
      )}

      {/* Список заметок и папок */}
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => 
          item.type === 'folder' 
            ? `folder-${item.data.id}` 
            : `note-${item.data.id}`
        }
        contentContainerStyle={[
          styles.listContainer,
          items.length === 0 && styles.emptyListContainer
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            {isSearching ? (
              <>
                <Text style={styles.emptyStateText}>Ничего не найдено</Text>
                <TouchableOpacity onPress={handleClearSearch}>
                  <Text style={styles.emptyStateActionText}>Очистить поиск</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.emptyStateText}>
                  У вас пока нет заметок
                </Text>
                <Text style={styles.emptyStateSubtext}>
                  Нажмите "+" чтобы создать заметку или папку
                </Text>
              </>
            )}
          </View>
        }
      />
      
      <SimpleFAB 
        onNotePress={handleCreateNote}
        onTaskPress={handleCreateTask}
        onFolderPress={handleCreateFolder}
        showFolderOption={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  refreshButton: {
    padding: 8,
  },
  refreshButtonText: {
    fontSize: 20,
    color: '#3498db',
    fontWeight: 'bold',
  },
  debugContainer: {
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 6,
    marginBottom: 12,
  },
  debugText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    fontSize: 14,
  },
  clearSearchButton: {
    position: 'absolute',
    right: 12,
    padding: 4,
  },
  clearSearchText: {
    fontSize: 14,
    color: '#95a5a6',
  },
  searchResultsText: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#7f8c8d',
  },
  listContainer: {
    paddingBottom: 80,
  },
  emptyListContainer: {
    flexGrow: 1,
  },
  folderCard: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  folderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  folderIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  folderInfo: {
    flex: 1,
  },
  folderName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  folderCount: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  folderToggle: {
    padding: 8,
  },
  folderToggleIcon: {
    fontSize: 12,
    color: '#95a5a6',
  },
  folderActions: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  folderDeleteText: {
    fontSize: 14,
    color: '#e74c3c',
    textAlign: 'center',
  },
  noteCard: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#2c3e50',
  },
  noteTitlePlaceholder: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#95a5a6',
    fontStyle: 'italic',
  },
  noteContent: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 8,
    lineHeight: 20,
  },
  noteDate: {
    fontSize: 12,
    color: '#adb5bd',
    textAlign: 'right',
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 18,
    color: '#6c757d',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#adb5bd',
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyStateActionText: {
    fontSize: 14,
    color: '#3498db',
    marginTop: 8,
  },
  errorContainer: {
    backgroundColor: '#ffeaea',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#e74c3c',
    flex: 1,
  },
  errorButtonText: {
    fontSize: 14,
    color: '#3498db',
    marginLeft: 12,
    fontWeight: '600',
  },
});

export default NotesScreen;