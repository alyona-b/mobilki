import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';

const AuthScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { login, register, isOnline } = useAuth();

  // Очистка ошибки при изменении полей
  useEffect(() => {
    setError('');
  }, [email, password, confirmPassword, isLogin]);

  const handleSubmit = async () => {
    try {
      setError('');
      setIsProcessing(true);
      
      // 🔍 БАЗОВАЯ ВАЛИДАЦИЯ ПОЛЕЙ
      if (!email.trim()) {
        setError('Введите email');
        setIsProcessing(false);
        return;
      }
      
      if (!password.trim()) {
        setError('Введите пароль');
        setIsProcessing(false);
        return;
      }
      
      if (!isLogin && !confirmPassword.trim()) {
        setError('Подтвердите пароль');
        setIsProcessing(false);
        return;
      }
      
      if (!isLogin && password !== confirmPassword) {
        setError('Пароли не совпадают');
        setIsProcessing(false);
        return;
      }
      
      // Проверка email формата
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setError('Введите корректный email');
        setIsProcessing(false);
        return;
      }
      
      // Проверка длины пароля
      if (password.length < 6) {
        setError('Пароль должен содержать минимум 6 символов');
        setIsProcessing(false);
        return;
      }
      
      console.log(`📱 Отправка формы: ${isLogin ? 'вход' : 'регистрация'}`);
      console.log(`📶 Режим сети: ${isOnline ? 'онлайн' : 'офлайн'}`);
      
      // 🔄 ВЫЗОВ АВТОРИЗАЦИИ/РЕГИСТРАЦИИ
      if (isLogin) {
        await login({ email, password });
      } else {
        await register({ email, password, confirmPassword });
      }
      
    } catch (err: any) {
      setError(err.message || 'Произошла ошибка');
      console.error('Ошибка авторизации:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Функция для сброса формы при переключении режима
  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setConfirmPassword('');
  };

  // Определяем, активна ли кнопка отправки
  const isSubmitDisabled = () => {
    if (!email || !password) return true;
    if (!isLogin && !confirmPassword) return true;
    return isProcessing;
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          {/* Индикатор сети */}
          <View style={[styles.networkIndicator, !isOnline && styles.networkIndicatorOffline]}>
            <Text style={styles.networkIndicatorText}>
              {isOnline ? '📶 Онлайн' : '📴 Офлайн-режим'}
            </Text>
            {!isOnline && (
              <Text style={styles.networkIndicatorSubtext}>
                Работа с сохраненными данными
              </Text>
            )}
          </View>
          
          <Text style={styles.title}>MyPlanner</Text>
          <Text style={styles.subtitle}>
            {isLogin ? 'Вход в систему' : 'Регистрация нового аккаунта'}
          </Text>
          
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Введите ваш email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                textContentType="emailAddress"
                editable={!isProcessing}
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Пароль</Text>
              <TextInput
                style={styles.input}
                placeholder="Введите пароль"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="password"
                textContentType="password"
                editable={!isProcessing}
              />
            </View>
            
            {!isLogin && (
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Подтверждение пароля</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Повторите пароль"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  autoComplete="password"
                  textContentType="password"
                  editable={!isProcessing}
                />
              </View>
            )}
            
            {/* Информация о режиме */}
            <View style={styles.modeInfo}>
              <Text style={styles.modeInfoText}>
                {!isOnline 
                  ? '📴 Работаем в офлайн-режиме. Используются локальные данные.'
                  : '🌐 Подключение к интернету есть. Синхронизация доступна.'
                }
              </Text>
              {!isOnline && isLogin && (
                <Text style={styles.modeHint}>
                  Для входа используйте ранее сохраненные данные
                </Text>
              )}
              {!isOnline && !isLogin && (
                <Text style={styles.modeHint}>
                  Аккаунт будет создан локально. Синхронизация при появлении сети
                </Text>
              )}
            </View>
            
            {/* Сообщение об ошибке */}
            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorIcon}>⚠️</Text>
                <Text style={styles.error}>{error}</Text>
              </View>
            ) : null}
            
            {/* Кнопка отправки */}
            <TouchableOpacity 
              style={[
                styles.button, 
                isSubmitDisabled() && styles.buttonDisabled
              ]} 
              onPress={handleSubmit}
              disabled={isSubmitDisabled()}
            >
              {isProcessing ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.buttonText}>
                  {isLogin ? 'Войти' : 'Зарегистрироваться'}
                </Text>
              )}
            </TouchableOpacity>
            
            {/* Переключение режима */}
            <TouchableOpacity 
              style={styles.switchButton}
              onPress={toggleAuthMode}
              disabled={isProcessing}
            >
              <Text style={styles.switchButtonText}>
                {isLogin ? 'Нет аккаунта? Зарегистрироваться' : 'Есть аккаунт? Войти'}
              </Text>
            </TouchableOpacity>
            
            {/* Подсказка */}
            <Text style={styles.hint}>
              {isLogin 
                ? 'При первом входе требуется интернет'
                : 'Минимальная длина пароля - 6 символов'
              }
            </Text>
            
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    padding: 20,
  },
  networkIndicator: {
    backgroundColor: '#2ecc71',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'center',
  },
  networkIndicatorOffline: {
    backgroundColor: '#f39c12',
  },
  networkIndicatorText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  networkIndicatorSubtext: {
    color: '#ffffff',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#3498db',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
    color: '#7f8c8d',
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#2c3e50',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    borderRadius: 8,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
  },
  modeInfo: {
    backgroundColor: '#ecf0f1',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  modeInfoText: {
    color: '#2c3e50',
    fontSize: 13,
    textAlign: 'center',
  },
  modeHint: {
    color: '#7f8c8d',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 5,
    fontStyle: 'italic',
  },
  button: {
    backgroundColor: '#3498db',
    padding: 18,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  buttonDisabled: {
    backgroundColor: '#95a5a6',
    opacity: 0.7,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  switchButton: {
    alignItems: 'center',
    padding: 15,
    marginBottom: 10,
  },
  switchButtonText: {
    color: '#3498db',
    fontSize: 14,
    fontWeight: '500',
  },
  errorContainer: {
    backgroundColor: '#ffeaea',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#fadbd8',
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorIcon: {
    marginRight: 10,
  },
  error: {
    color: '#e74c3c',
    fontSize: 14,
    flex: 1,
  },
  hint: {
    fontSize: 12,
    color: '#95a5a6',
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },
});

export default AuthScreen;