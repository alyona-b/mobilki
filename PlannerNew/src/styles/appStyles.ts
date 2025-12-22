import { StyleSheet, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
export const DRAWER_WIDTH = 280;

export const appStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#3498db',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 15,
  },
  menuButton: {
    padding: 5,
  },
  menuIcon: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerPlaceholder: {
    width: 30,
  },
  content: {
    flex: 1,
  },
});

export const drawerStyles = StyleSheet.create({
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 1000,
  },
  drawerHeader: {
    padding: 20,
    paddingTop: 70,
    backgroundColor: '#3498db',
    // УБРАНО: borderBottomRightRadius: 20,
  },
  drawerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 5,
  },
  drawerSubtitle: {
    fontSize: 14,
    color: '#e8f4f8',
  },
  drawerMenu: {
    flex: 1,
    paddingTop: 20,
  },
  drawerMenuItem: {
    padding: 16,
    paddingLeft: 25,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  drawerMenuItemActive: {
    backgroundColor: '#ebf5fb',
    
    borderLeftColor: '#3498db',
  },
  drawerMenuTextActive: {
    color: '#3498db',
    fontWeight: '600',
  },
  // УБРАНО: drawerMenuItemActive (голубое выделение)
  // УБРАНО: drawerMenuTextActive (цвет активного элемента)
  drawerMenuText: {
    fontSize: 16,
    color: '#2c3e50',
  },
  // drawerFooter УДАЛЕН - заменен на logoutButton
  // closeButton УДАЛЕН - не нужна кнопка закрытия
  
  // НОВАЯ кнопка выхода с увеличенным отступом
  logoutButton: {
    margin: 20,
    marginBottom: 40, // Увеличенный отступ от низа
    padding: 16,
    backgroundColor: '#e74c3c',
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16, // Увеличен размер текста
  },
});

export const overlayStyles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
    zIndex: 999,
  },
  overlayTouchable: {
    flex: 1,
  },
});