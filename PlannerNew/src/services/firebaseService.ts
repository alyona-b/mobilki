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

// 🔥 ВСТАВЬТЕ СЮДА ВАШУ КОНФИГУРАЦИЮ ИЗ FIREBASE
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

class FirebaseService {
  // 👤 РЕГИСТРАЦИЯ В ОБЛАКЕ FIREBASE
  async registerUser(email: string, password: string) {
    try {
      console.log('📡 Регистрация в Firebase:', email);
      
      // 1. Создаем пользователя в Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // 2. Сохраняем дополнительную информацию в Firestore
      await setDoc(doc(db, 'users', user.uid), {
        email: email,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp()
      });
      
      return {
        success: true,
        user: {
          uid: user.uid,
          email: user.email,
          token: await user.getIdToken()
        }
      };
    } catch (error: any) {
      console.error('Firebase регистрация ошибка:', error);
      
      let message = 'Ошибка регистрации';
      switch (error.code) {
        case AuthErrorCodes.EMAIL_EXISTS:
          message = 'Пользователь с таким email уже существует';
          break;
        case AuthErrorCodes.WEAK_PASSWORD:
          message = 'Слишком слабый пароль';
          break;
      }
      
      return {
        success: false,
        error: message
      };
    }
  }

  // 🔐 ВХОД ЧЕРЕЗ FIREBASE
  async loginUser(email: string, password: string) {
    try {
      console.log('📡 Вход в Firebase:', email);
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Обновляем время последнего входа
      await setDoc(doc(db, 'users', user.uid), {
        lastLogin: serverTimestamp()
      }, { merge: true });
      
      return {
        success: true,
        user: {
          uid: user.uid,
          email: user.email,
          token: await user.getIdToken()
        }
      };
    } catch (error: any) {
      console.error('Firebase вход ошибка:', error);
      
      let message = 'Ошибка входа';
      switch (error.code) {
        case AuthErrorCodes.INVALID_EMAIL:
        case AuthErrorCodes.USER_DELETED:
          message = 'Пользователь не найден';
          break;
        case AuthErrorCodes.INVALID_PASSWORD:
          message = 'Неверный пароль';
          break;
      }
      
      return {
        success: false,
        error: message
      };
    }
  }

  // 🔄 СИНХРОНИЗАЦИЯ ДАННЫХ С ОБЛАКОМ
  async syncData(userId: string, data: any) {
    try {
      console.log('🔄 Синхронизация с Firebase для пользователя:', userId);
      
      // Сохраняем данные в Firestore
      const syncRef = await addDoc(collection(db, 'sync'), {
        userId,
        data,
        timestamp: serverTimestamp(),
        device: 'mobile'
      });
      
      return {
        success: true,
        syncId: syncRef.id,
        message: 'Данные синхронизированы с облаком'
      };
    } catch (error) {
      console.error('Firebase синхронизация ошибка:', error);
      return {
        success: false,
        error: 'Ошибка синхронизации'
      };
    }
  }

  // 📥 ПОЛУЧЕНИЕ ДАННЫХ ИЗ ОБЛАКА
  async getCloudData(userId: string) {
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
  async logout() {
    try {
      await signOut(auth);
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Ошибка выхода' };
    }
  }
}

export const firebaseService = new FirebaseService();