import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyACl9C3TxQlIdb8Y2c0b_hSp03zsrD9KmM",
  authDomain: "animanga-8b838.firebaseapp.com",
  projectId: "animanga-8b838",
  storageBucket: "animanga-8b838.firebasestorage.app",
  messagingSenderId: "685744968986",
  appId: "1:685744968986:web:ffc83cf7bd4b743b4cc8a3"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;