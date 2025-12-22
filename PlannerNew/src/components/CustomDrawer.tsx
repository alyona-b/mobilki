import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { DrawerContentComponentProps } from '@react-navigation/drawer';
import { useAuth } from '../contexts/AuthContext';

const CustomDrawer: React.FC<DrawerContentComponentProps> = (props) => {
  const { navigation } = props;
  const { user, logout } = useAuth();

  const menuItems = [
    { label: '📅 Календарь', screen: 'Calendar' },
    { label: '✅ Задачи', screen: 'Tasks' },
    { label: '📝 Заметки', screen: 'Notes' },
  ];

  const handleLogout = async () => {
    await logout();
    navigation.closeDrawer();
  };

  return (
    <View style={styles.container}>
      {/* Заголовок drawer */}
      <View style={styles.header}>
        <Text style={styles.title}>Мой Планнер</Text>
        <Text style={styles.subtitle}>
          {user?.email || 'Пользователь'}
        </Text>
      </View>
      
      {/* Меню */}
      <View style={styles.menu}>
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.screen}
            style={styles.menuItem}
            onPress={() => navigation.navigate(item.screen)}
          >
            <Text style={styles.menuText}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Футер */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={() => navigation.closeDrawer()}
        >
          <Text style={styles.closeButtonText}>✕ Закрыть</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Text style={styles.logoutButtonText}>🚪 Выйти</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    padding: 20,
    paddingTop: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3498db',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  menu: {
    flex: 1,
    paddingVertical: 16,
  },
  menuItem: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  menuText: {
    fontSize: 16,
    color: '#333',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  closeButton: {
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  closeButtonText: {
    color: '#6c757d',
    fontSize: 14,
    fontWeight: '600',
  },
  logoutButton: {
    padding: 12,
    backgroundColor: '#e74c3c',
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default CustomDrawer;