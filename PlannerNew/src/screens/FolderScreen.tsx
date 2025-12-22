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

interface FolderScreenProps {
  folderId: number;
  folderName: string;
  onGoBack: () => void;
  onNavigateToNoteEdit?: (noteId?: number, folderId?: number) => void;
  onNavigateToTaskEdit?: (taskId?: number) => void;
  onNavigateToFolderEdit?: (folderId?: number, parentFolderId?: number) => void;
  onNavigateToSubfolder?: (folderId: number, folderName: string) => void;
}

type ListItem = 
  | { type: 'note'; data: Note }
  | { type: 'folder'; data: Folder & { noteCount: number }; isOpen: boolean };

const FolderScreen: React.FC<FolderScreenProps> = ({
  folderId,
  folderName,
  onGoBack,
  onNavigateToNoteEdit,
  onNavigateToTaskEdit,
  onNavigateToFolderEdit,
  onNavigateToSubfolder,
}) => {
  const { user } = useAuth();
  const [items, setItems] = useState<ListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Загрузка данных при монтировании и изменении folderId
  useEffect(() => {
    console.log('FolderScreen useEffect, user:', user?.id, 'folderId:', folderId);
    if (user && folderId) {
      loadData();
    } else {
      setItems([]);
      setIsLoading(false);
    }
  }, [user, folderId]);

  const loadData = async () => {
    console.log('loadData called, folderId:', folderId);
    if (!user || !folderId) {
      console.log('No user or folderId, skipping load');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Loading data for folder:', folderId);
      
      // ЗАГРУЖАЕМ ТОЛЬКО СОДЕРЖИМОЕ КОНКРЕТНОЙ ПАПКИ
      const [folderNotes, childFolders] = await Promise.all([
        noteService.getNotesByFolder(user.id, folderId),  // Заметки в этой папке
        noteService.getSubfolders(user.id, folderId),     // Подпапки этой папки
      ]);

      console.log('Folder notes loaded:', folderNotes.length);
      console.log('Child folders loaded:', childFolders.length);

      // Создаем элементы для отображения
      const itemsToDisplay: ListItem[] = [];
      
      // Добавляем подпапки
      for (const folder of childFolders) {
        // Получаем количество заметок в подпапке
        const noteCount = await noteService.getNoteCountByFolder(folder.id);
        itemsToDisplay.push({
          type: 'folder',
          data: {
            ...folder,
            noteCount
          },
          isOpen: false
        });
      }
      
      // Добавляем заметки в этой папке
      for (const note of folderNotes) {
        itemsToDisplay.push({
          type: 'note',
          data: note
        });
      }

      // Сортируем: сначала папки, потом заметки
      itemsToDisplay.sort((a, b) => {
        if (a.type === 'folder' && b.type === 'note') return -1;
        if (a.type === 'note' && b.type === 'folder') return 1;
        return 0;
      });

      console.log(`✅ Папка загружена: ${childFolders.length} папок, ${folderNotes.length} заметок`);
      setItems(itemsToDisplay);
      
    } catch (error) {
      console.error('Error loading folder data:', error);
      setError('Не удалось загрузить содержимое папки');
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotePress = (note: Note) => {
    console.log(`📄 Открытие заметки ${note.id}`);
    onNavigateToNoteEdit?.(note.id, note.folder_id || undefined);
  };

  const handleSubfolderPress = (folder: Folder & { noteCount: number }) => {
    console.log(`📂 Переход в подпапку ${folder.name}`);
    if (onNavigateToSubfolder) {
      onNavigateToSubfolder(folder.id, folder.name);
    } else {
      // Альтернативное поведение, если навигация не настроена
      Alert.alert(
        'Подпапка: ' + folder.name,
        `В папке ${folder.noteCount} заметок`,
        [
          { text: 'Отмена', style: 'cancel' },
          { 
            text: 'Редактировать', 
            onPress: () => onNavigateToFolderEdit?.(folder.id, folderId) 
          }
        ]
      );
    }
  };

  const handleCreateNote = () => {
    console.log('📝 Создание заметки в папке');
    onNavigateToNoteEdit?.(undefined, folderId);
  };

  const handleCreateTask = () => {
    onNavigateToTaskEdit?.();
  };

  const handleCreateSubfolder = () => {
    console.log('📁 Создание подпапки');
    onNavigateToFolderEdit?.(undefined, folderId);
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
              console.log(`🗑️ Заметка ${note.id} удалена`);
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
      `Вы уверены, что хотите удалить папку "${folder.name}" и все её содержимое?`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              await noteService.deleteFolder(user!.id, folder.id);
              console.log(`🗑️ Папка ${folder.id} удалена`);
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
      
      // Фильтруем результаты по текущей папке
      const filteredResults = searchResults.filter(note => note.folder_id === folderId);
      
      const noteItems: ListItem[] = filteredResults.map(note => ({
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
          onPress={() => handleSubfolderPress(folder)}
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
            {onNavigateToSubfolder ? (
              <Text style={styles.arrowIcon}>›</Text>
            ) : (
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
            )}
          </View>
          
          {isOpen && !onNavigateToSubfolder && (
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

  console.log('FolderScreen render state:', {
    isLoading,
    itemsLength: items.length,
    isSearching,
    folderId
  });

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onGoBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>‹ Назад</Text>
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>
            {folderName}
          </Text>
          <TouchableOpacity onPress={loadData} style={styles.refreshButton}>
            <Text style={styles.refreshButtonText}>↻</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>Загрузка содержимого...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onGoBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>‹ Назад</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          {folderName}
        </Text>
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
          placeholder="Поиск в папке..."
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
                  Папка пуста
                </Text>
                <Text style={styles.emptyStateSubtext}>
                  Нажмите "+" чтобы создать заметку или подпапку
                </Text>
              </>
            )}
          </View>
        }
      />
      
      <SimpleFAB 
        onNotePress={handleCreateNote}
        onTaskPress={handleCreateTask}
        onFolderPress={handleCreateSubfolder}
        showFolderOption={true}
        showTaskOption={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: '#3498db',
    fontWeight: '600',
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  refreshButton: {
    padding: 8,
  },
  refreshButtonText: {
    fontSize: 18,
    color: '#3498db',
  },
  debugContainer: {
    padding: 12,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
  },
  debugText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
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
    marginHorizontal: 16,
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
    paddingHorizontal: 16,
    paddingBottom: 100,
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
  arrowIcon: {
    fontSize: 20,
    color: '#95a5a6',
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
    paddingVertical: 60,
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
    marginHorizontal: 16,
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

export default FolderScreen;