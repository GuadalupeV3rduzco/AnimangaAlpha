import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApps, initializeApp } from 'firebase/app';
import { getAuth, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: "AIzaSyACl9C3TxQlIdb8Y2c0b_hSp03zsrD9KmM",
  authDomain: "animanga-8b838.firebaseapp.com",
  projectId: "animanga-8b838",
  storageBucket: "animanga-8b838.firebasestorage.app",
  messagingSenderId: "685744968986",
  appId: "1:685744968986:web:ffc83cf7bd4b743b4cc8a3"
};

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

let authInstance;

if (Platform.OS === 'web') {
  authInstance = getAuth(app);
} else {
  try {
    const reactNativePersistence = require('firebase/auth/react-native');
    
    authInstance = initializeAuth(app, {
      persistence: reactNativePersistence.getReactNativePersistence(AsyncStorage)
    });
    console.log("✅ Auth inicializado con AsyncStorage (react-native)");
  } catch (error1) {
    try {
      const { getReactNativePersistence } = require('@firebase/auth/dist/rn');
      
      authInstance = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage)
      });
      console.log("✅ Auth inicializado con AsyncStorage (@firebase/auth)");
    } catch (error2) {
      console.warn("⚠️ No se pudo configurar persistencia, usando memoria");
      authInstance = getAuth(app);
    }
  }
}

export const auth = authInstance;
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;