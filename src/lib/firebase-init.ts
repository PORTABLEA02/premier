import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyBkzpvB9F2d_mlKo7IAzTL6hOAYn_fCRI8",
  authDomain: "musaib-fda27.firebaseapp.com",
  projectId: "musaib-fda27",
  storageBucket: "musaib-fda27.firebasestorage.app",
  messagingSenderId: "228939211863",
  appId: "1:228939211863:web:f188b71800039909ccef12"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Development mode - connect to emulators if needed
if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATOR) {
  try {
    connectAuthEmulator(auth, 'http://localhost:9099');
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectStorageEmulator(storage, 'localhost', 9199);
  } catch (error) {
    console.log('Firebase emulators already connected');
  }
}

export default app;