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
} from 'react-native';
import { noteService } from '../database/noteService';
import { useAuth } from '../contexts/AuthContext';
import { Folder } from '../types';

interface FolderEditScreenProps {
  onGoBack: () => void;
  onFolderSaved?: () => void;
  folderId?: number;
  parentFolderId?: number | null;
}

const FolderEditScreen: React.FC<FolderEditScreenProps> = ({ 
  onGoBack, 
  onFolderSaved,
  folderId,
  parentFolderId = null
}) => {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const isEditing = !!folderId;

  useEffect(() => {
    if (folderId) {
      loadFolder();
    }
  }, [folderId]);

  const loadFolder = async () => {
    if (!folderId) return;
    
    try {
      const folder = await noteService.getFolderById(folderId);
      if (folder) {
        setName(folder.name);
      }
    } catch (error) {
      console.error('Error loading folder:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить папку');
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Внимание', 'Введите название папки');
      return;
    }

    if (!user) {
      Alert.alert('Ошибка', 'Пользователь не авторизован');
      return;
    }

    setIsLoading(true);

    try {
      if (isEditing && folderId) {
        await noteService.updateFolder(folderId, {
          name: name.trim(),
        });
      } else {
        await noteService.createFolder({
          user_id: user.id,
          name: name.trim(),
          parent_folder_id: parentFolderId,
          sync_status: 'synced',
        });
      }

      onFolderSaved?.();
      onGoBack();
    } catch (error) {
      console.error('Error saving folder:', error);
      Alert.alert('Ошибка', 'Не удалось сохранить папку');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    if (!folderId) return;

    if (!user) {
      Alert.alert('Ошибка', 'Пользователь не авторизован');
      return;
    }

    Alert.alert(
      'Удалить папку',
      'Вы уверены, что хотите удалить эту папку? Все заметки внутри будут перемещены в корень.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              await noteService.deleteFolder(user.id, folderId);
              onFolderSaved?.();
              onGoBack();
            } catch (error) {
              console.error('Error deleting folder:', error);
              Alert.alert('Ошибка', 'Не удалось удалить папку');
            }
          },
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={onGoBack}>
          <Text style={styles.headerButton}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditing ? 'Редактировать папку' : 'Новая папка'}
        </Text>
        <TouchableOpacity onPress={handleSave} disabled={isLoading}>
          <Text style={[styles.headerButton, isLoading && styles.disabledButton]}>
            {isLoading ? '...' : '✓'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <TextInput
          style={styles.nameInput}
          placeholder="Название папки"
          value={name}
          onChangeText={setName}
          maxLength={50}
          autoFocus={!isEditing}
        />
        
        <Text style={styles.hint}>
          Папки помогают организовать заметки. 
          {parentFolderId ? ' Эта папка будет создана внутри текущей.' : ' Эта папка будет создана в корне.'}
        </Text>
      </ScrollView>

      {isEditing && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Text style={styles.deleteButtonText}>Удалить папку</Text>
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
  nameInput: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  hint: {
    fontSize: 14,
    color: '#7f8c8d',
    fontStyle: 'italic',
    lineHeight: 20,
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

export default FolderEditScreen;