import React, { useState } from 'react';
import { 
  View, 
  Text, // ← ДОБАВЬТЕ ЭТОТ ИМПОРТ
  StyleSheet, 
  SafeAreaView,
  TouchableOpacity,
  Linking,
  ActivityIndicator
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useAuth } from '../contexts/AuthContext';

interface DocumentationScreenProps {
  onGoBack: () => void;
}

const DocumentationScreen: React.FC<DocumentationScreenProps> = ({ onGoBack }) => {
  const { user } = useAuth();
  const [currentUrl, setCurrentUrl] = useState('https://github.com/alyona-b/mobilki');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // URL вашей документации на GitHub Pages
  const docsUrl = 'https://github.com/alyona-b/mobilki';

  // Обработчик навигации внутри WebView
  const handleNavigationStateChange = (navState: any) => {
    setCurrentUrl(navState.url);
  };

  // Открыть ссылку во внешнем браузере
  const handleOpenInBrowser = () => {
    Linking.openURL(currentUrl).catch(err => 
      console.error('Ошибка открытия ссылки:', err)
    );
  };

  // Обработка загрузки
  const handleLoadStart = () => {
    setIsLoading(true);
    setError(null);
  };

  const handleLoadEnd = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setError('Не удалось загрузить документацию');
  };

  // Обработка внутренних ссылок
  const onShouldStartLoadWithRequest = (request: any) => {
    // Если ссылка ведет на другой домен - открываем в браузере
    if (!request.url.startsWith('https://github.com/alyona-b/mobilki')) {
      Linking.openURL(request.url);
      return false;
    }
    return true;
  };

  // Резервный текст на случай ошибки
  const fallbackContent = `
📱 MyPlanner - Документация

Приложение для управления задачами, заметками и событиями.

Основные разделы:

📅 Календарь
- Просмотр задач по дням
- Создание событий
- Цветовая индикация приоритетов

✅ Задачи
- Создание и редактирование задач
- Установка приоритетов
- Отметка выполнения

📝 Заметки
- Текстовые заметки
- Организация в папки
- Поиск по содержимому

📁 Папки
- Создание вложенных папок
- Перемещение заметок
- Структурирование информации

🔄 Синхронизация
Данные синхронизируются между устройствами через Firebase.

`;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onGoBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>‹ Назад</Text>
        </TouchableOpacity>
        <Text style={styles.title}>О приложении</Text>
        <TouchableOpacity onPress={handleOpenInBrowser} style={styles.browserButton}>
          <Text style={styles.browserButtonText}>🌐</Text>
        </TouchableOpacity>
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.fallbackText}>{fallbackContent}</Text>
        </View>
      ) : (
        <>
          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3498db" />
              <Text style={styles.loadingText}>Загрузка документации...</Text>
            </View>
          )}
          <WebView
            source={{ uri: docsUrl }}
            style={styles.webview}
            onNavigationStateChange={handleNavigationStateChange}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            onLoadStart={handleLoadStart}
            onLoadEnd={handleLoadEnd}
            onError={handleError}
            onHttpError={handleError}
            allowsBackForwardNavigationGestures={true}
            // Обработка внутренних ссылок
            onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
          />
        </>
      )}
    </SafeAreaView>
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
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#3498db',
    fontWeight: '500',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  browserButton: {
    padding: 8,
  },
  browserButtonText: {
    fontSize: 18,
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#7f8c8d',
  },
  errorContainer: {
    flex: 1,
    padding: 16,
    backgroundColor: '#ffffff',
  },
  errorText: {
    fontSize: 16,
    color: '#e74c3c',
    marginBottom: 16,
    textAlign: 'center',
  },
  fallbackText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#2c3e50',
  },
});

export default DocumentationScreen;