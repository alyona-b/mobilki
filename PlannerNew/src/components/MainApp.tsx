import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Animated,
  BackHandler
} from 'react-native';
import CalendarScreen from '../screens/CalendarScreen';
import TasksScreen from '../screens/TasksScreen';
import NotesScreen from '../screens/NotesScreen';
import NoteEditScreen from '../screens/NoteEditScreen';
import TaskEditScreen from '../screens/TaskEditScreen';
import FolderEditScreen from '../screens/FolderEditScreen';
import FolderScreen from '../screens/FolderScreen';
import DocumentationScreen from '../screens/DocumentationScreen';
import { useAuth } from '../contexts/AuthContext';
import { 
  appStyles, 
  drawerStyles, 
  overlayStyles, 
  DRAWER_WIDTH 
} from '../styles/appStyles';

type ScreenType = 'calendar' | 'tasks' | 'notes' | 'noteEdit' | 'taskEdit' | 'folderEdit' | 'folder' | 'documentation';

// Создаем мемоизированные компоненты с правильными типами
const MemoizedCalendarScreen = React.memo(CalendarScreen) as React.NamedExoticComponent<any>;
const MemoizedTasksScreen = React.memo(TasksScreen) as React.NamedExoticComponent<any>;
const MemoizedNotesScreen = React.memo(NotesScreen) as React.NamedExoticComponent<any>;
const MemoizedNoteEditScreen = React.memo(NoteEditScreen) as React.NamedExoticComponent<any>;
const MemoizedTaskEditScreen = React.memo(TaskEditScreen) as React.NamedExoticComponent<any>;
const MemoizedFolderEditScreen = React.memo(FolderEditScreen) as React.NamedExoticComponent<any>;
const MemoizedFolderScreen = React.memo(FolderScreen) as React.NamedExoticComponent<any>;
const MemoizedDocumentationScreen = React.memo(DocumentationScreen) as React.NamedExoticComponent<any>;

const MainApp: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('calendar');
  const [screenParams, setScreenParams] = useState<Record<string, any>>({});
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [overlayOpacity] = useState(new Animated.Value(0));
  const [drawerTranslate] = useState(new Animated.Value(-DRAWER_WIDTH));
  
  // Используем useRef для хранения callbacks, чтобы избежать ререндеров
  const screenHistoryRef = useRef<Array<{screen: ScreenType, params: any}>>([
    { screen: 'calendar', params: {} }
  ]);
  
  const { user, logout } = useAuth();

  // Обработка аппаратной кнопки "Назад" на Android
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (isDrawerOpen) {
          closeDrawer();
          return true;
        }
        
        if (screenHistoryRef.current.length > 1) {
          // Возвращаемся на предыдущий экран
          screenHistoryRef.current.pop(); // Удаляем текущий экран
          const prevScreen = screenHistoryRef.current[screenHistoryRef.current.length - 1];
          
          setCurrentScreen(prevScreen.screen);
          setScreenParams(prevScreen.params);
          return true;
        }
        
        // Если это корневой экран, выходим из приложения
        return false;
      }
    );

    return () => backHandler.remove();
  }, [isDrawerOpen]);

  const navigateTo = useCallback((screen: ScreenType, params?: any) => {
    console.log(`📍 Навигация на ${screen}`, params);
    
    // Добавляем в историю
    screenHistoryRef.current.push({ screen, params: params || {} });
    
    setCurrentScreen(screen);
    if (params) {
      setScreenParams(params);
    } else {
      setScreenParams({});
    }
    closeDrawer();
  }, []);

  const goBack = useCallback(() => {
    console.log('🔙 Нажата кнопка назад', {
      currentScreen,
      sourceScreen: screenParams.sourceScreen,
      params: screenParams
    });
    
    // Удаляем текущий экран из истории
    if (screenHistoryRef.current.length > 0) {
      screenHistoryRef.current.pop();
    }
    
    if (screenHistoryRef.current.length > 0) {
      // Возвращаемся на предыдущий экран
      const prevScreen = screenHistoryRef.current[screenHistoryRef.current.length - 1];
      console.log('↩️ Возврат на экран:', prevScreen.screen);
      setCurrentScreen(prevScreen.screen);
      setScreenParams(prevScreen.params);
    } else {
      console.log('↩️ Возврат по умолчанию');
      // Если истории нет, возвращаемся на экран по умолчанию
      const defaultScreen = getDefaultScreen(currentScreen);
      screenHistoryRef.current = [{ screen: defaultScreen, params: {} }];
      setCurrentScreen(defaultScreen);
      setScreenParams({});
    }
  }, [currentScreen, screenParams]);

  const getDefaultScreen = (screen: ScreenType): ScreenType => {
    switch (screen) {
      case 'noteEdit':
      case 'folderEdit':
      case 'folder':
        return 'notes';
      case 'taskEdit':
        return 'tasks';
      default:
        return 'calendar';
    }
  };

  // Для CalendarScreen и TasksScreen (старая сигнатура)
  const handleNavigateToNoteEditBasic = useCallback((noteId?: number, sourceScreen?: string) => {
    const source = (sourceScreen as ScreenType) || currentScreen;
    console.log('📝 Навигация к редактированию заметки (базовая версия)');
    navigateTo('noteEdit', { 
      noteId, 
      sourceScreen: source,
    });
  }, [currentScreen, navigateTo]);

  // Для NotesScreen и FolderScreen (новая сигнатура с folderId и callback)
  const handleNavigateToNoteEditWithFolder = useCallback((
    noteId?: number, 
    folderId?: number, 
    onSavedCallback?: () => void
  ) => {
    const source = currentScreen;
    console.log('📝 Навигация к редактированию заметки (с папкой и callback)', {
      noteId,
      folderId,
      hasCallback: !!onSavedCallback
    });
    navigateTo('noteEdit', { 
      noteId, 
      folderId, 
      sourceScreen: source,
      onSavedCallback
    });
  }, [currentScreen, navigateTo]);

  // Добавить обработчик навигации:
  const handleNavigateToDocumentation = useCallback(() => {
    navigateTo('documentation');
  }, [navigateTo]);

  const handleNavigateToTaskEdit = useCallback((taskId?: number, initialDate?: string) => {
    const source = currentScreen;
    console.log('📋 Навигация к редактированию задачи');
    navigateTo('taskEdit', { taskId, initialDate, sourceScreen: source });
  }, [currentScreen, navigateTo]);

  const handleNavigateToFolderEdit = useCallback((folderId?: number, parentFolderId?: number) => {
    const source = currentScreen;
    console.log('📁 Навигация к редактированию папки');
    navigateTo('folderEdit', { 
      folderId, 
      parentFolderId, 
      sourceScreen: source,
      // Добавляем callback для обновления после сохранения
      onFolderSaved: () => {
        console.log('✅ Папка сохранена - можно обновить список');
      }
    });
  }, [currentScreen, navigateTo]);

  const handleNavigateToFolder = useCallback((folderId: number, folderName: string) => {
    const source = currentScreen;
    console.log(`📂 Навигация в папку: ${folderName} (ID: ${folderId})`);
    navigateTo('folder', { 
      folderId, 
      folderName, 
      sourceScreen: source 
    });
  }, [currentScreen, navigateTo]);

  const openDrawer = useCallback(() => {
    setIsDrawerOpen(true);
    Animated.parallel([
      Animated.timing(drawerTranslate, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0.5,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [drawerTranslate, overlayOpacity]);

  const closeDrawer = useCallback(() => {
    Animated.parallel([
      Animated.timing(drawerTranslate, {
        toValue: -DRAWER_WIDTH,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsDrawerOpen(false);
    });
  }, [drawerTranslate, overlayOpacity]);

  const handleLogout = useCallback(async () => {
    console.log('🚪 Выход из приложения');
    await logout();
    closeDrawer();
  }, [logout, closeDrawer]);

  const handleNoteSaved = useCallback((callback?: () => void) => {
    console.log('📞 Callback сохранения заметки вызван');
    if (callback) {
      callback();
    }
  }, []);

  const handleFolderSaved = useCallback((callback?: () => void) => {
    console.log('📞 Callback сохранения папки вызван');
    if (callback) {
      callback();
    }
  }, []);

  const renderScreen = useCallback(() => {
    console.log('📱 Рендер экрана:', currentScreen, 'params:', screenParams);
    
    switch (currentScreen) {
      case 'calendar':
        return (
          <MemoizedCalendarScreen 
            onNavigateToTaskEdit={handleNavigateToTaskEdit}
            onNavigateToNoteEdit={handleNavigateToNoteEditBasic}
          />
        );
      case 'tasks':
        return (
          <MemoizedTasksScreen 
            onNavigateToTaskEdit={handleNavigateToTaskEdit}
            onNavigateToNoteEdit={handleNavigateToNoteEditBasic}
          />
        );
      case 'notes':
        return (
          <MemoizedNotesScreen 
            onNavigateToNoteEdit={handleNavigateToNoteEditWithFolder}
            onNavigateToTaskEdit={handleNavigateToTaskEdit}
            onNavigateToFolderEdit={handleNavigateToFolderEdit}
            onNavigateToFolder={handleNavigateToFolder}
          />
        );
      case 'documentation':
        return (
          <MemoizedDocumentationScreen // ← ИСПОЛЬЗУЙТЕ МЕМОИЗИРОВАННУЮ ВЕРСИЮ
            onGoBack={goBack}
          />
        );
      case 'noteEdit':
        return (
          <MemoizedNoteEditScreen 
            onGoBack={goBack} 
            onNoteSaved={() => handleNoteSaved(screenParams.onSavedCallback)}
            noteId={screenParams.noteId}
            folderId={screenParams.folderId}
          />
        );
      case 'taskEdit':
        return (
          <MemoizedTaskEditScreen 
            onGoBack={goBack} 
            onTaskSaved={() => {
              console.log('✅ Задача сохранена');
              // Можно добавить обновление списка задач
            }}
            taskId={screenParams.taskId}
            initialDate={screenParams.initialDate}
          />
        );
      case 'folderEdit':
        return (
          <MemoizedFolderEditScreen 
            onGoBack={goBack} 
            onFolderSaved={() => handleFolderSaved(screenParams.onFolderSaved)}
            folderId={screenParams.folderId}
            parentFolderId={screenParams.parentFolderId}
          />
        );
      case 'folder':
        return (
          <MemoizedFolderScreen 
            folderId={screenParams.folderId}
            folderName={screenParams.folderName}
            onGoBack={goBack}
            onNavigateToNoteEdit={handleNavigateToNoteEditWithFolder}
            onNavigateToTaskEdit={handleNavigateToTaskEdit}
            onNavigateToFolderEdit={handleNavigateToFolderEdit}
            onNavigateToSubfolder={handleNavigateToFolder}
          />
        );
      default:
        return <MemoizedCalendarScreen />;
    }
  }, [
    currentScreen, 
    screenParams, 
    goBack, 
    handleNavigateToTaskEdit, 
    handleNavigateToNoteEditBasic, 
    handleNavigateToNoteEditWithFolder, 
    handleNavigateToFolderEdit, 
    handleNavigateToFolder,
    handleNoteSaved,
    handleFolderSaved
  ]);

  const getScreenTitle = useCallback(() => {
    switch (currentScreen) {
      case 'calendar':
        return 'Календарь';
      case 'tasks':
        return 'Задачи';
      case 'notes':
        return 'Заметки';
      case 'noteEdit':
        return screenParams.noteId ? '✏️ Редактирование' : 'Новая заметка';
      case 'taskEdit':
        return screenParams.taskId ? '✏️ Редактирование задачи' : 'Новая задача';
      case 'folderEdit':
        return screenParams.folderId ? '✏️ Редактирование папки' : 'Новая папка';
      case 'folder':
        return `📁 ${screenParams.folderName || 'Папка'}`;
      default:
        return 'Мой Планнер';
    }
  }, [currentScreen, screenParams]);

  const menuItems = [
    { label: 'Календарь', screen: 'calendar' as ScreenType },
    { label: 'Задачи', screen: 'tasks' as ScreenType },
    { label: 'Заметки', screen: 'notes' as ScreenType },
    { label: 'О приложении', screen: 'documentation' as ScreenType },
  ];

  return (
    <View style={appStyles.container}>
      <View style={appStyles.header}>
        <TouchableOpacity 
          style={appStyles.menuButton}
          onPress={openDrawer}
        >
          <Text style={appStyles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <Text style={appStyles.headerTitle}>{getScreenTitle()}</Text>
        <View style={appStyles.headerPlaceholder} />
      </View>

      <View style={appStyles.content}>
        {renderScreen()}
      </View>

      {isDrawerOpen && (
        <Animated.View 
          style={[
            overlayStyles.overlay,
            { opacity: overlayOpacity }
          ]}
        >
          <TouchableOpacity 
            style={overlayStyles.overlayTouchable}
            onPress={closeDrawer}
          />
        </Animated.View>
      )}

      <Animated.View 
        style={[
          drawerStyles.drawer,
          { 
            transform: [{ translateX: drawerTranslate }],
            width: DRAWER_WIDTH,
          }
        ]}
      >
        <View style={drawerStyles.drawerHeader}>
          <Text style={drawerStyles.drawerTitle}>MyPlanner</Text>
          <Text style={drawerStyles.drawerSubtitle}>
            {user?.email || 'Пользователь'}
          </Text>
        </View>
        
        <View style={drawerStyles.drawerMenu}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.screen}
              style={[
                drawerStyles.drawerMenuItem,
                currentScreen === item.screen && drawerStyles.drawerMenuItemActive
              ]}
              onPress={() => navigateTo(item.screen)}
            >
              <Text style={[
                drawerStyles.drawerMenuText,
                currentScreen === item.screen && drawerStyles.drawerMenuTextActive
              ]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        <TouchableOpacity 
          style={drawerStyles.logoutButton}
          onPress={handleLogout}
        >
          <Text style={drawerStyles.logoutButtonText}>Выйти</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

export default MainApp;