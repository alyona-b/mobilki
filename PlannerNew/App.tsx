import React from 'react';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import MainApp from './src/components/MainApp';
import AuthScreen from './src/screens/AuthScreen';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

// Стили для загрузки
const loadingStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  text: {
    marginTop: 10,
    fontSize: 16,
    color: '#3498db',
  },
});

// Компонент который решает что показывать
const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={loadingStyles.container}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={loadingStyles.text}>Загрузка...</Text>
      </View>
    );
  }

  return isAuthenticated ? <MainApp /> : <AuthScreen />;
};

// Главный компонент
export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}