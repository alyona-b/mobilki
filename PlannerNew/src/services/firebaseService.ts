import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  AuthErrorCodes
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs,
  doc,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';

// 🔥 КОНФИГУРАЦИЯ FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyAk0SNv5LrKbN99DLbKZo8mroDOpQF5rDM",
  authDomain: "myplanner-api-cb060.firebaseapp.com",
  projectId: "myplanner-api-cb060",
  storageBucket: "myplanner-api-cb060.firebasestorage.app",
  messagingSenderId: "498924898034",
  appId: "1:498924898034:web:79388b8d9e544fa3e7326b",
  measurementId: "G-3X22QDGP5M"
};

// Инициализация Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

interface FirebaseResult {
  success: boolean;
  user?: {
    uid: string;
    email: string;
    token: string;
  };
  error?: string;
  canFallback?: boolean;
}

class FirebaseService {
  // 👤 РЕГИСТРАЦИЯ В ОБЛАКЕ FIREBASE
  async registerUser(email: string, password: string): Promise<FirebaseResult> {
    try {
      console.log('📡 Регистрация в Firebase:', email);

      // 1. Создаем пользователя в Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      console.log('✅ Пользователь создан в Authentication:', user.uid);
      
      // 2. Сохраняем дополнительную информацию в Firestore
      await setDoc(doc(db, 'users', user.uid), {
        email: email,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        isMobileUser: true
      });
      
      console.log('✅ Данные сохранены в Firestore');
      
      return {
        success: true,
        user: {
          uid: user.uid,
          email: user.email || email,
          token: await user.getIdToken()
        }
      };
      
    } catch (error: any) {
      console.error('🔥 Firebase регистрация ошибка:', error.code, error.message);
      
      let message = 'Ошибка регистрации';
      let canFallback = false;
      
      switch (error.code) {
        case AuthErrorCodes.EMAIL_EXISTS:
          message = 'Пользователь с таким email уже существует';
          break;
        case AuthErrorCodes.WEAK_PASSWORD:
          message = 'Слишком слабый пароль';
          break;
        case 'auth/network-request-failed':
          message = 'Нет подключения к интернету';
          canFallback = true;
          break;
        case 'auth/invalid-api-key':
          message = 'Неверный API ключ Firebase';
          canFallback = true;
          break;
        default:
          message = `Ошибка: ${error.code || error.message}`;
          canFallback = true;
      }
      
      return {
        success: false,
        error: message,
        canFallback
      };
    }
  }

  // 🔐 ВХОД ЧЕРЕЗ FIREBASE
  async loginUser(email: string, password: string): Promise<FirebaseResult> {
    try {
      console.log('📡 Вход в Firebase:', email);
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      console.log('✅ Вход успешен в Authentication:', user.uid);
      
      // Обновляем время последнего входа
      await setDoc(doc(db, 'users', user.uid), {
        lastLogin: serverTimestamp()
      }, { merge: true });
      
      return {
        success: true,
        user: {
          uid: user.uid,
          email: user.email || email,
          token: await user.getIdToken()
        }
      };
      
    } catch (error: any) {
      console.error('🔥 Firebase вход ошибка:', error.code, error.message);
      
      let message = 'Ошибка входа';
      let canFallback = false;
      
      switch (error.code) {
        case AuthErrorCodes.INVALID_EMAIL:
        case AuthErrorCodes.USER_DELETED:
          message = 'Пользователь не найден';
          break;
        case AuthErrorCodes.INVALID_PASSWORD:
          message = 'Неверный пароль';
          break;
        case 'auth/network-request-failed':
          message = 'Нет подключения к интернету';
          canFallback = true;
          break;
        case 'auth/invalid-api-key':
          message = 'Неверный API ключ Firebase';
          canFallback = true;
          break;
        default:
          message = `Ошибка: ${error.code || error.message}`;
          canFallback = true;
      }
      
      return {
        success: false,
        error: message,
        canFallback
      };
    }
  }

  // 🔄 СИНХРОНИЗАЦИЯ ДАННЫХ С ОБЛАКОМ
  async syncData(userId: string, data: any): Promise<{success: boolean; message?: string}> {
    try {
      console.log('🔄 Синхронизация с Firebase для пользователя:', userId);
      
      // Сохраняем данные в Firestore
      await addDoc(collection(db, 'sync'), {
        userId,
        data,
        timestamp: serverTimestamp(),
        device: 'mobile',
        syncedAt: new Date().toISOString()
      });
      
      return {
        success: true,
        message: 'Данные синхронизированы с облаком'
      };
      
    } catch (error: any) {
      console.error('Firebase синхронизация ошибка:', error);
      return {
        success: false,
        message: error.message || 'Ошибка синхронизации'
      };
    }
  }

  // 📥 ПОЛУЧЕНИЕ ДАННЫХ ИЗ ОБЛАКА
  async getCloudData(userId: string): Promise<{success: boolean; data: any}> {
    try {
      const q = query(
        collection(db, 'sync'), 
        where('userId', '==', userId)
      );
      
      const querySnapshot = await getDocs(q);
      const data: any[] = [];
      
      querySnapshot.forEach((doc) => {
        data.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return {
        success: true,
        data: data.sort((a, b) => b.timestamp - a.timestamp)[0]?.data || {}
      };
    } catch (error) {
      console.error('Firebase получение данных ошибка:', error);
      return {
        success: false,
        data: {}
      };
    }
  }

  // 🚪 ВЫХОД
  async logout(): Promise<{success: boolean; error?: string}> {
    try {
      await signOut(auth);
      return { success: true };
    } catch (error: any) {
      console.error('Firebase выход ошибка:', error);
      return { 
        success: false, 
        error: 'Ошибка выхода из Firebase' 
      };
    }
  }
}

export const firebaseService = new FirebaseService();