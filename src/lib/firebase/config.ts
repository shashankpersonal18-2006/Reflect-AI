import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, browserLocalPersistence, setPersistence } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';

// Default configuration loaded from local environment or bundled config
// Note: Client configuration contains only public identifiers (API Key, Project ID)
const clientConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDl4PIOVAq0Vzq8-pghiAmR5MYb5OkbM9k",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "optimum-terra-3nm8c.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "optimum-terra-3nm8c",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "optimum-terra-3nm8c.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "505037670999",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:505037670999:web:29e03dde3961b829daf112",
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || "ai-studio-reflectaiprivate-7ee648b8-1bd0-48a1-bb86-0131d367b10c"
};

export const app = getApps().length === 0 ? initializeApp(clientConfig) : getApp();

export const auth = getAuth(app);

// Configure local persistence
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn("Could not set auth persistence:", err);
});

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Use the provisioned Firestore database ID
export const db = getFirestore(app, clientConfig.firestoreDatabaseId);

export async function testConnection(): Promise<boolean> {
  try {
    // Validate connection to Firestore as specified in Firebase Integration guidelines
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Firestore client is offline or initializing. Checking your Firebase configuration.");
    }
    // Return false but do not crash application
    return false;
  }
}
