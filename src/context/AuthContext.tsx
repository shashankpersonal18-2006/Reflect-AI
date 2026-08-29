import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  User,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  getIdToken,
} from 'firebase/auth';
import { auth, googleProvider, testConnection } from '../lib/firebase/config';
import { getUserProfile, upsertUserProfile } from '../lib/firestore/service';
import { UserProfile, UserPreferences } from '../types';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  error: string | null;
  token: string | null;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updatePreferences: (prefs: Partial<UserPreferences>) => Promise<void>;
  authFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const fetchProfile = useCallback(async (currentUser: User) => {
    try {
      let profile = await getUserProfile(currentUser.uid);
      if (!profile) {
        // Initialize profile in Firestore
        await upsertUserProfile({
          uid: currentUser.uid,
          email: currentUser.email || '',
          displayName: currentUser.displayName || 'Reflective Journaler',
          photoURL: currentUser.photoURL || '',
        });
        profile = await getUserProfile(currentUser.uid);
      }
      setUserProfile(profile);
    } catch (err: any) {
      console.warn('Profile sync note:', err?.message || err);
    }
  }, []);

  useEffect(() => {
    // Test initial connection as specified in guidelines
    testConnection();

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);
      setError(null);

      if (currentUser) {
        setUser(currentUser);
        try {
          const idToken = await getIdToken(currentUser, true);
          setToken(idToken);
          await fetchProfile(currentUser);
        } catch (err: any) {
          console.error('Error refreshing token or profile:', err);
          setError(err?.message || 'Failed to authenticate user token');
        }
      } else {
        setUser(null);
        setUserProfile(null);
        setToken(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [fetchProfile]);

  const signInWithGoogle = async () => {
    try {
      setError(null);
      setLoading(true);
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await getIdToken(result.user, true);
      setToken(idToken);
      await fetchProfile(result.user);
    } catch (err: any) {
      console.error('Google Sign-In error:', err);
      // Suppress standard user-cancelled popup errors from looking like fatal system errors
      if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
        setError(err.message || 'Failed to complete Google Sign-In.');
      }
    } finally {
      setLoading(false);
    }
  };

  const signOutUser = async () => {
    try {
      setLoading(true);
      await firebaseSignOut(auth);
      setUser(null);
      setUserProfile(null);
      setToken(null);
    } catch (err: any) {
      console.error('Sign-out error:', err);
      setError(err?.message || 'Failed to sign out.');
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user);
    }
  };

  const updatePreferences = async (prefs: Partial<UserPreferences>) => {
    if (!user || !userProfile) return;
    const newPrefs = {
      ...userProfile.preferences,
      ...prefs,
    };
    await upsertUserProfile({
      uid: user.uid,
      preferences: newPrefs,
    });
    setUserProfile((prev) => prev ? { ...prev, preferences: newPrefs } : null);
  };

  /**
   * Helper that injects Authorization Bearer token to API calls
   */
  const authFetch = async (input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> => {
    let currentToken = token;
    if (user) {
      try {
        currentToken = await getIdToken(user);
        setToken(currentToken);
      } catch (err) {
        console.warn('Token refresh error in authFetch:', err);
      }
    }

    const headers = new Headers(init.headers || {});
    if (currentToken) {
      headers.set('Authorization', `Bearer ${currentToken}`);
    }
    if (!headers.has('Content-Type') && !(init.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    return fetch(input, {
      ...init,
      headers,
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        error,
        token,
        signInWithGoogle,
        signOutUser,
        refreshProfile,
        updatePreferences,
        authFetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
