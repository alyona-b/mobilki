import React, { useState, useRef } from 'react';
import { 
  View, 
  Text,
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
  const webViewRef = useRef<WebView>(null);
  const [currentUrl, setCurrentUrl] = useState('https://alyona-b.github.io/mobilki/#/');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const docsUrl = 'https://alyona-b.github.io/mobilki/#/';

  // Исправленный JavaScript без синтаксических ошибок
  const injectedJavaScript = `
(function() {
  const backLinks = document.querySelectorAll('a[href*="Назад к оглавлению"]');
  backLinks.forEach(link => {
    if (window.location.hash === '#/' || window.location.hash === '' || window.location.hash === '#README') {
      link.style.display = 'none';
    }
  });
  
  const sections = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
  sections.forEach(section => {
    const text = section.textContent.trim();
    if (text.includes('Разработка') || 
        text.includes('Поддержка') || 
        text.includes('Быстрый старт') ||
        text.includes('Для разработчиков') ||
        text === 'Руководство пользователя') {
      section.style.display = 'none';
      let nextElement = section.nextElementSibling;
      while(nextElement && !nextElement.matches('h1, h2, h3, h4, h5, h6')) {
        nextElement.style.display = 'none';
        nextElement = nextElement.nextElementSibling;
      }
    }
  });
  
  window.scrollTo(0, 0);
  
  const content = document.querySelector('.markdown-section');
  if (content) {
    content.style.paddingTop = '20px';
  }
  
  const firstElement = document.querySelector('.markdown-body > *:first-child');
  if (firstElement && firstElement.textContent.trim() === '') {
    firstElement.style.display = 'none';
  }
  
  setTimeout(() => {
    window.scrollTo(0, 0);
    window.ReactNativeWebView.postMessage('ready');
  }, 1500);
  
  return true;
})();
`;

  const handleNavigationStateChange = (navState: any) => {
    setCurrentUrl(navState.url);
  };

  const handleOpenInBrowser = () => {
    Linking.openURL(currentUrl).catch(err => 
      console.error('Ошибка открытия ссылки:', err)
    );
  };

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

  const onShouldStartLoadWithRequest = (request: any) => {
    if (!request.url.startsWith('https://alyona-b.github.io/mobilki')) {
      Linking.openURL(request.url);
      return false;
    }
    return true;
  };

  const handleMessage = (event: any) => {
    if (event.nativeEvent.data === 'ready') {
      console.log('WebView готов');
    }
  };

  const fallbackContent = `📱 MyPlanner - Документация

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
Данные синхронизируются между устройствами через Firebase.`;

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
            ref={webViewRef}
            source={{ uri: docsUrl }}
            style={styles.webview}
            injectedJavaScript={injectedJavaScript}
            onMessage={handleMessage}
            onNavigationStateChange={handleNavigationStateChange}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            onLoadStart={handleLoadStart}
            onLoadEnd={handleLoadEnd}
            onError={handleError}
            onHttpError={handleError}
            allowsBackForwardNavigationGestures={true}
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