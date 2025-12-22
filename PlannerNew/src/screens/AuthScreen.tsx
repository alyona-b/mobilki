import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet,
  KeyboardAvoidingView,
  Platform 
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';

const AuthScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const { login, register } = useAuth();

  const handleSubmit = async () => {
    try {
      setError('');
      
      // 🔍 БАЗОВАЯ ВАЛИДАЦИЯ ПОЛЕЙ
      if (!email.trim()) {
        setError('Введите email');
        return;
      }
      
      if (!password.trim()) {
        setError('Введите пароль');
        return;
      }
      
      if (!isLogin && !confirmPassword.trim()) {
        setError('Подтвердите пароль');
        return;
      }
      
      if (!isLogin && password !== confirmPassword) {
        setError('Пароли не совпадают');
        return;
      }
      
      // Проверка email формата (базовая)
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setError('Введите корректный email');
        return;
      }
      
      // Проверка длины пароля
      if (password.length < 6) {
        setError('Пароль должен содержать минимум 6 символов');
        return;
      }
      
      // 🔄 ВЫЗОВ АВТОРИЗАЦИИ/РЕГИСТРАЦИИ
      if (isLogin) {
        await login({ email, password });
      } else {
        await register({ email, password, confirmPassword });
      }
    } catch (err: any) {
      setError(err.message || 'Произошла ошибка');
    }
  };

  // Функция для сброса формы при переключении режима
  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setConfirmPassword('');
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Text style={styles.title}>MyPlanner</Text>
        <Text style={styles.subtitle}>
          {isLogin ? 'Вход в систему' : 'Регистрация нового аккаунта'}
        </Text>
        
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
          />
          
          <TextInput
            style={styles.input}
            placeholder="Пароль"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
            textContentType="password"
          />
          
          {!isLogin && (
            <TextInput
              style={styles.input}
              placeholder="Подтвердите пароль"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoComplete="password"
              textContentType="password"
            />
          )}
          
          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.error}>{error}</Text>
            </View>
          ) : null}
          
          <TouchableOpacity 
            style={[
              styles.button, 
              (!email || !password || (!isLogin && !confirmPassword)) && styles.buttonDisabled
            ]} 
            onPress={handleSubmit}
            disabled={!email || !password || (!isLogin && !confirmPassword)}
          >
            <Text style={styles.buttonText}>
              {isLogin ? 'Войти' : 'Зарегистрироваться'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.switchButton}
            onPress={toggleAuthMode}
          >
            <Text style={styles.switchButtonText}>
              {isLogin ? 'Нет аккаунта? Зарегистрироваться' : 'Есть аккаунт? Войти'}
            </Text>
          </TouchableOpacity>
          
          
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
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
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    marginBottom: 15,
    borderRadius: 8,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
  },
  button: {
    backgroundColor: '#3498db',
    padding: 15,
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
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  switchButton: {
    alignItems: 'center',
    padding: 10,
    marginBottom: 10,
  },
  switchButtonText: {
    color: '#3498db',
    fontSize: 14,
    fontWeight: '500',
  },
  errorContainer: {
    backgroundColor: '#ffeaea',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#fadbd8',
  },
  error: {
    color: '#e74c3c',
    textAlign: 'center',
    fontSize: 14,
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