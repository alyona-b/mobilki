import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { noteService } from '../database/noteService';
import { useAuth } from '../contexts/AuthContext';
import { Note, Folder } from '../types';

interface NoteEditScreenProps {
  onGoBack: () => void;
  onNoteSaved?: () => void;
  noteId?: number;
  folderId?: number;
}

const NoteEditScreen: React.FC<NoteEditScreenProps> = ({ 
  onGoBack, 
  onNoteSaved,
  noteId, 
  folderId 
}) => {
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(folderId || null);
  const [selectedFolderName, setSelectedFolderName] = useState<string>('Без папки');
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [isFolderLoading, setIsFolderLoading] = useState(false);

  const isEditing = !!noteId;

  useEffect(() => {
    console.log('📝 NoteEditScreen монтируется', { 
      noteId, 
      folderId, 
      hasCallback: !!onNoteSaved,
      callback: onNoteSaved
    });
    loadFolders();
    if (noteId) {
      loadNote();
    } else if (folderId) {
      updateFolderName(folderId);
    }
  }, [noteId, folderId]);

  const loadFolders = async () => {
    if (!user) return;
    
    try {
      setIsFolderLoading(true);
      const userFolders = await noteService.getFoldersByUser(user.id);
      setFolders(userFolders);
      
      // Если есть folderId, находим название папки
      if (folderId) {
        const folder = userFolders.find(f => f.id === folderId);
        if (folder) {
          setSelectedFolderName(folder.name);
        }
      }
    } catch (error) {
      console.error('Error loading folders:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить папки');
    } finally {
      setIsFolderLoading(false);
    }
  };

  const updateFolderName = (folderId: number | null) => {
    if (!folderId) {
      setSelectedFolderName('Без папки');
      return;
    }
    
    const folder = folders.find(f => f.id === folderId);
    if (folder) {
      setSelectedFolderName(folder.name);
    }
  };

  const loadNote = async () => {
    if (!noteId) return;
    
    try {
      setIsLoading(true);
      const note = await noteService.getNoteById(noteId);
      if (note) {
        setTitle(note.title || '');
        setContent(note.content);
        setSelectedFolderId(note.folder_id || null);
        
        // Обновляем название папки если есть
        if (note.folder_id) {
          updateFolderName(note.folder_id);
        }
      }
    } catch (error) {
      console.error('Error loading note:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить заметку');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    console.log('💾 Начинаю сохранение заметки...');
    console.log('📞 onNoteSaved callback доступен:', !!onNoteSaved);
    console.log('Текущая папка:', selectedFolderId);
    
    if (!content.trim()) {
      Alert.alert('Внимание', 'Введите текст заметки');
      return;
    }

    if (!user) {
      Alert.alert('Ошибка', 'Пользователь не авторизован');
      return;
    }

    setIsSaving(true);

    try {
      if (isEditing && noteId) {
        console.log(`💾 Обновление заметки ${noteId}`);
        await noteService.updateNote(noteId, {
          title: title.trim() !== '' ? title.trim() : null,
          content: content.trim(),
          folder_id: selectedFolderId,
        });
      } else {
        console.log(`💾 Создание новой заметки в папке ${selectedFolderId}`);
        await noteService.createNote({
          user_id: user.id,
          title: title.trim() !== '' ? title.trim() : null,
          content: content.trim(),
          folder_id: selectedFolderId,
          sync_status: 'synced',
        });
      }

      console.log('✅ Заметка успешно сохранена');
      
      // СОХРАНЯЕМ ссылку на callback до вызова onGoBack
      const savedCallback = onNoteSaved;
      
      console.log('↩️  Закрываю экран редактирования');
      onGoBack();
      
      // ВЫЗЫВАЕМ callback ПОСЛЕ закрытия экрана
      // Это важно, чтобы родительский экран успел отмонтироваться/смонтироваться
      setTimeout(() => {
        if (savedCallback) {
          console.log('🔄 Вызываю onNoteSaved callback для обновления списка');
          savedCallback();
        } else {
          console.log('⚠️  onNoteSaved callback не передан');
        }
      }, 100); // Небольшая задержка для гарантии
      
    } catch (error) {
      console.error('Error saving note:', error);
      Alert.alert('Ошибка', 'Не удалось сохранить заметку');
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (!noteId) return;

    Alert.alert(
      'Удалить заметку',
      'Вы уверены, что хотите удалить эту заметку?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              await noteService.deleteNote(noteId);
              console.log(`🗑️ Заметка ${noteId} удалена`);
              
              // СОХРАНЯЕМ ссылку на callback до вызова onGoBack
              const savedCallback = onNoteSaved;
              
              onGoBack();
              
              // ВЫЗЫВАЕМ callback ПОСЛЕ закрытия экрана
              setTimeout(() => {
                if (savedCallback) {
                  console.log('🔄 Вызываю callback после удаления');
                  savedCallback();
                } else {
                  console.log('⚠️  onNoteSaved callback не передан');
                }
              }, 100);
              
            } catch (error) {
              console.error('Error deleting note:', error);
              Alert.alert('Ошибка', 'Не удалось удалить заметку');
            }
          },
        },
      ]
    );
  };

  const handleCancel = () => {
    if (title.trim() || content.trim()) {
      Alert.alert(
        'Отменить изменения',
        'Вы уверены, что хотите отменить изменения?',
        [
          { text: 'Нет', style: 'cancel' },
          { 
            text: 'Да', 
            onPress: () => {
              console.log('❌ Отмена редактирования');
              onGoBack();
            }
          }
        ]
      );
    } else {
      console.log('❌ Закрытие без изменений');
      onGoBack();
    }
  };

  const handleFolderSelect = (folder: Folder | null) => {
    setSelectedFolderId(folder ? folder.id : null);
    setSelectedFolderName(folder ? folder.name : 'Без папки');
    setShowFolderModal(false);
    console.log('📁 Выбрана папка:', folder ? folder.name : 'Без папки');
  };

  const renderFolderItem = ({ item }: { item: Folder }) => (
    <TouchableOpacity
      style={[
        styles.folderItem,
        selectedFolderId === item.id && styles.selectedFolderItem
      ]}
      onPress={() => handleFolderSelect(item)}
    >
      <Text style={[
        styles.folderItemText,
        selectedFolderId === item.id && styles.selectedFolderItemText
      ]}>
        📁 {item.name}
      </Text>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Загрузка заметки...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Кастомный хедер */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} disabled={isSaving}>
          <Text style={[styles.headerButton, isSaving && styles.disabledButton]}>
            ✕
          </Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditing ? 'Редактировать заметку' : 'Новая заметка'}
        </Text>
        <TouchableOpacity onPress={handleSave} disabled={isSaving || !content.trim()}>
          {isSaving ? (
            <ActivityIndicator size="small" color="#3498db" />
          ) : (
            <Text style={[
              styles.headerButton, 
              (!content.trim() || isSaving) && styles.disabledButton
            ]}>
              ✓
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Выбор папки */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Папка</Text>
          <TouchableOpacity
            style={styles.folderSelector}
            onPress={() => setShowFolderModal(true)}
            disabled={isFolderLoading}
          >
            {isFolderLoading ? (
              <Text style={styles.folderSelectorText}>Загрузка папок...</Text>
            ) : (
              <>
                <Text style={styles.folderSelectorText}>{selectedFolderName}</Text>
                <Text style={styles.folderSelectorIcon}>▼</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Заголовок */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Заголовок</Text>
          <TextInput
            style={styles.titleInput}
            placeholder="Заголовок (необязательно)"
            value={title}
            onChangeText={setTitle}
            maxLength={200}
            multiline
            editable={!isSaving}
            autoFocus={!noteId}
          />
        </View>
        
        {/* Текст заметки */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Текст заметки *</Text>
          <TextInput
            style={styles.contentInput}
            placeholder="Введите текст заметки..."
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
            editable={!isSaving}
          />
        </View>
      </ScrollView>

      {/* Модальное окно выбора папки */}
      <Modal
        visible={showFolderModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFolderModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Выберите папку</Text>
              <TouchableOpacity onPress={() => setShowFolderModal(false)}>
                <Text style={styles.modalCloseButton}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={folders}
              renderItem={renderFolderItem}
              keyExtractor={(item) => item.id.toString()}
              ListHeaderComponent={
                <TouchableOpacity
                  style={[
                    styles.folderItem,
                    selectedFolderId === null && styles.selectedFolderItem
                  ]}
                  onPress={() => handleFolderSelect(null)}
                >
                  <Text style={[
                    styles.folderItemText,
                    selectedFolderId === null && styles.selectedFolderItemText
                  ]}>
                    📄 Без папки (в корне)
                  </Text>
                </TouchableOpacity>
              }
              ListEmptyComponent={
                <Text style={styles.noFoldersText}>
                  У вас пока нет папок. Создайте папку через главный экран заметок.
                </Text>
              }
            />
          </View>
        </View>
      </Modal>

      {isEditing && (
        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.deleteButton, isSaving && styles.disabledButton]} 
            onPress={handleDelete}
            disabled={isSaving}
          >
            <Text style={styles.deleteButtonText}>Удалить заметку</Text>
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#7f8c8d',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    backgroundColor: '#f8f9fa',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  headerButton: {
    fontSize: 18,
    color: '#3498db',
    fontWeight: 'bold',
    paddingHorizontal: 8,
  },
  disabledButton: {
    opacity: 0.5,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7f8c8d',
    marginBottom: 8,
  },
  requiredHint: {
    fontSize: 12,
    color: '#e74c3c',
    marginTop: 4,
    fontStyle: 'italic',
  },
  folderSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  folderSelectorText: {
    fontSize: 16,
    color: '#2c3e50',
  },
  folderSelectorIcon: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  titleInput: {
    fontSize: 18,
    fontWeight: '600',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    minHeight: 50,
  },
  contentInput: {
    fontSize: 16,
    lineHeight: 24,
    minHeight: 200,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  // Модальное окно
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  modalCloseButton: {
    fontSize: 18,
    color: '#3498db',
    fontWeight: 'bold',
    paddingHorizontal: 8,
  },
  folderItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  selectedFolderItem: {
    backgroundColor: '#3498db',
  },
  folderItemText: {
    fontSize: 16,
    color: '#2c3e50',
  },
  selectedFolderItemText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  noFoldersText: {
    fontSize: 14,
    color: '#95a5a6',
    textAlign: 'center',
    padding: 20,
    fontStyle: 'italic',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  deleteButton: {
    padding: 12,
    backgroundColor: '#e74c3c',
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 50,
  },
  deleteButtonText: {
    color: '#ffffff',
    fontSize: 16, 
    fontWeight: '600',
  },
});

export default NoteEditScreen;