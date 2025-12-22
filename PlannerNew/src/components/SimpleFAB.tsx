import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
} from 'react-native';

interface SimpleFABProps {
  onNotePress?: () => void;
  onTaskPress?: () => void;
  onFolderPress?: () => void; // НОВАЯ КНОПКА
  showFolderOption?: boolean; // Показывать ли кнопку папки
  showTaskOption?: boolean; // ДОБАВИЛИ: Показывать ли кнопку задачи
}

const SimpleFAB: React.FC<SimpleFABProps> = ({ 
  onNotePress, 
  onTaskPress,
  onFolderPress,
  showFolderOption = false, // По умолчанию не показывать
  showTaskOption = true // ДОБАВИЛИ: По умолчанию показывать кнопку задачи
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <View style={styles.container}>
      {isMenuOpen && (
        <View style={styles.menu}>
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => {
              setIsMenuOpen(false);
              onNotePress?.();
            }}
          >
            <Text style={styles.menuText}>Заметка</Text>
          </TouchableOpacity>
          
          {/* КНОПКА ЗАДАЧИ - ТОЛЬКО ЕСЛИ ПОКАЗЫВАТЬ И ЕСТЬ ОБРАБОТЧИК */}
          {showTaskOption && onTaskPress && (
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => {
                setIsMenuOpen(false);
                onTaskPress?.();
              }}
            >
              <Text style={styles.menuText}>Задача</Text>
            </TouchableOpacity>
          )}
          
          {/* НОВАЯ КНОПКА ДЛЯ ПАПКИ - ТОЛЬКО ЕСЛИ ПОКАЗЫВАТЬ И ЕСТЬ ОБРАБОТЧИК */}
          {showFolderOption && onFolderPress && (
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => {
                setIsMenuOpen(false);
                onFolderPress?.();
              }}
            >
              <Text style={styles.menuText}>Папка</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <TouchableOpacity 
        style={styles.fab}
        onPress={() => setIsMenuOpen(!isMenuOpen)}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 40, // Увеличено с 24 до 40 для отступа от навигационной панели
    right: 24,
    alignItems: 'flex-end',
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fabText: {
    fontSize: 24,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  menu: {
    marginBottom: 8,
  },
  menuItem: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    marginBottom: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  menuText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3498db',
  },
});

export default SimpleFAB;