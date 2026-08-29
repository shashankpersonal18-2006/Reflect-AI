import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  JournalSession,
  JournalMessage,
  Goal,
  SavedInsight,
  UserProfile,
} from '../../types';

/**
 * Strict Undefined-Stripping (Zero-Crash Payload Hygiene)
 * Ensures no undefined fields reach Firestore drivers.
 */
export function sanitizePayload<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (key, value) => {
      if (value === undefined) {
        return null;
      }
      return value;
    })
  );
}

// -------------------------------------------------------------
// USER PROFILE & STREAK MANAGEMENT
// -------------------------------------------------------------

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const profileRef = doc(db, 'users', uid, 'profile', 'default');
    const snap = await getDoc(profileRef);
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
  } catch (err) {
    console.error('Error fetching user profile:', err);
  }
  return null;
}

export async function upsertUserProfile(profile: Partial<UserProfile> & { uid: string }): Promise<void> {
  const profileRef = doc(db, 'users', profile.uid, 'profile', 'default');
  const now = new Date().toISOString();

  const currentSnap = await getDoc(profileRef);
  if (!currentSnap.exists()) {
    const initial: UserProfile = {
      uid: profile.uid,
      email: profile.email || '',
      displayName: profile.displayName || 'Reflective Writer',
      photoURL: profile.photoURL || '',
      preferences: {
        theme: 'dark',
        moodAnalysisEnabled: true,
        dailyPromptEnabled: true,
        defaultMode: 'Reflect',
      },
      streak: {
        current: 1,
        longest: 1,
        totalDays: 1,
        lastDate: now.split('T')[0],
      },
      createdAt: now,
      updatedAt: now,
    };
    await setDoc(profileRef, sanitizePayload(initial));
  } else {
    await updateDoc(profileRef, sanitizePayload({
      ...profile,
      updatedAt: now,
    }));
  }
}

export async function updateReflectionStreak(uid: string): Promise<void> {
  try {
    const profileRef = doc(db, 'users', uid, 'profile', 'default');
    const snap = await getDoc(profileRef);
    if (!snap.exists()) return;

    const data = snap.data() as UserProfile;
    const today = new Date().toISOString().split('T')[0];
    const lastDate = data.streak?.lastDate;

    if (lastDate === today) {
      // Already reflected today
      return;
    }

    let newCurrent = 1;
    if (lastDate) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      if (lastDate === yesterday) {
        newCurrent = (data.streak?.current || 0) + 1;
      }
    }

    const longest = Math.max(newCurrent, data.streak?.longest || 1);
    const totalDays = (data.streak?.totalDays || 0) + 1;

    await updateDoc(profileRef, sanitizePayload({
      streak: {
        current: newCurrent,
        longest,
        totalDays,
        lastDate: today,
      },
      updatedAt: new Date().toISOString(),
    }));
  } catch (err) {
    console.warn('Could not update streak:', err);
  }
}

// -------------------------------------------------------------
// JOURNAL SESSIONS
// -------------------------------------------------------------

export function subscribeSessions(
  uid: string,
  onUpdate: (sessions: JournalSession[]) => void,
  onError?: (error: Error) => void
) {
  const sessionsCol = collection(db, 'users', uid, 'sessions');
  const q = query(sessionsCol, orderBy('updatedAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const sessions = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as JournalSession[];
      onUpdate(sessions);
    },
    (err) => {
      console.error('Sessions snapshot error:', err);
      if (onError) onError(err);
    }
  );
}

export async function createSession(uid: string, initialTitle?: string): Promise<string> {
  const sessionsCol = collection(db, 'users', uid, 'sessions');
  const newSessionRef = doc(sessionsCol);
  const now = new Date().toISOString();

  const sessionData: JournalSession = {
    id: newSessionRef.id,
    userId: uid,
    title: initialTitle || 'Untitled Reflection',
    messageCount: 0,
    isFavorite: false,
    mood: 'Reflective',
    confidence: 'Medium',
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(newSessionRef, sanitizePayload(sessionData));
  return newSessionRef.id;
}

export async function updateSession(
  uid: string,
  sessionId: string,
  updates: Partial<JournalSession>
): Promise<void> {
  const sessionRef = doc(db, 'users', uid, 'sessions', sessionId);
  const payload = sanitizePayload({
    ...updates,
    updatedAt: new Date().toISOString(),
  });
  await updateDoc(sessionRef, payload);
}

export async function deleteSession(uid: string, sessionId: string): Promise<void> {
  // First delete all messages in subcollection
  const messagesCol = collection(db, 'users', uid, 'sessions', sessionId, 'messages');
  const messagesSnap = await getDocs(messagesCol);
  const batch = writeBatch(db);
  messagesSnap.forEach((mDoc) => {
    batch.delete(mDoc.ref);
  });

  const sessionRef = doc(db, 'users', uid, 'sessions', sessionId);
  batch.delete(sessionRef);
  await batch.commit();
}

// -------------------------------------------------------------
// JOURNAL MESSAGES
// -------------------------------------------------------------

export function subscribeMessages(
  uid: string,
  sessionId: string,
  onUpdate: (messages: JournalMessage[]) => void
) {
  const messagesCol = collection(db, 'users', uid, 'sessions', sessionId, 'messages');
  const q = query(messagesCol, orderBy('createdAt', 'asc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const messages = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as JournalMessage[];
      onUpdate(messages);
    },
    (err) => {
      console.error('Messages snapshot error:', err);
    }
  );
}

export async function addMessage(
  uid: string,
  sessionId: string,
  message: Omit<JournalMessage, 'id'>
): Promise<string> {
  const messagesCol = collection(db, 'users', uid, 'sessions', sessionId, 'messages');
  const newMsgRef = doc(messagesCol);

  const payload: JournalMessage = {
    id: newMsgRef.id,
    ...message,
  };

  await setDoc(newMsgRef, sanitizePayload(payload));

  // Update session metadata
  const sessionRef = doc(db, 'users', uid, 'sessions', sessionId);
  const sessionSnap = await getDoc(sessionRef);
  const count = (sessionSnap.exists() ? sessionSnap.data().messageCount || 0 : 0) + 1;

  await updateDoc(sessionRef, sanitizePayload({
    messageCount: count,
    updatedAt: new Date().toISOString(),
  }));

  // Update user reflection streak
  updateReflectionStreak(uid);

  return newMsgRef.id;
}

// -------------------------------------------------------------
// GOALS MANAGEMENT
// -------------------------------------------------------------

export function subscribeGoals(
  uid: string,
  onUpdate: (goals: Goal[]) => void
) {
  const goalsCol = collection(db, 'users', uid, 'goals');
  const q = query(goalsCol, orderBy('updatedAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const goals = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as Goal[];
      onUpdate(goals);
    },
    (err) => {
      console.error('Goals snapshot error:', err);
    }
  );
}

export async function createGoal(
  uid: string,
  goal: { title: string; description?: string; progress?: number }
): Promise<string> {
  const goalsCol = collection(db, 'users', uid, 'goals');
  const newGoalRef = doc(goalsCol);
  const now = new Date().toISOString();

  const data: Goal = {
    id: newGoalRef.id,
    userId: uid,
    title: goal.title,
    description: goal.description || '',
    status: (goal.progress ?? 0) >= 100 ? 'completed' : 'active',
    progress: Math.min(100, Math.max(0, goal.progress ?? 0)),
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(newGoalRef, sanitizePayload(data));
  return newGoalRef.id;
}

export async function updateGoal(
  uid: string,
  goalId: string,
  updates: Partial<Goal>
): Promise<void> {
  const goalRef = doc(db, 'users', uid, 'goals', goalId);
  const sanitized = sanitizePayload({
    ...updates,
    updatedAt: new Date().toISOString(),
  });
  if (updates.progress !== undefined) {
    if (updates.progress >= 100) {
      sanitized.status = 'completed';
    } else if (sanitized.status === 'completed' && updates.progress < 100) {
      sanitized.status = 'active';
    }
  }
  await updateDoc(goalRef, sanitized);
}

export async function deleteGoal(uid: string, goalId: string): Promise<void> {
  const goalRef = doc(db, 'users', uid, 'goals', goalId);
  await deleteDoc(goalRef);
}

// -------------------------------------------------------------
// SAVED INSIGHTS / FAVORITES
// -------------------------------------------------------------

export function subscribeSavedInsights(
  uid: string,
  onUpdate: (insights: SavedInsight[]) => void
) {
  const insightsCol = collection(db, 'users', uid, 'savedInsights');
  const q = query(insightsCol, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as SavedInsight[];
      onUpdate(items);
    },
    (err) => {
      console.error('Saved insights error:', err);
    }
  );
}

export async function saveInsight(
  uid: string,
  insight: { content: string; sessionId?: string; sessionTitle?: string; category?: string }
): Promise<string> {
  const insightsCol = collection(db, 'users', uid, 'savedInsights');
  const newRef = doc(insightsCol);
  const data: SavedInsight = {
    id: newRef.id,
    userId: uid,
    content: insight.content,
    sessionId: insight.sessionId || '',
    sessionTitle: insight.sessionTitle || '',
    category: insight.category || 'Mindset',
    createdAt: new Date().toISOString(),
  };
  await setDoc(newRef, sanitizePayload(data));
  return newRef.id;
}

export async function deleteSavedInsight(uid: string, insightId: string): Promise<void> {
  const ref = doc(db, 'users', uid, 'savedInsights', insightId);
  await deleteDoc(ref);
}

// -------------------------------------------------------------
// ACCOUNT CLEANUP
// -------------------------------------------------------------

export async function deleteAllUserData(uid: string): Promise<void> {
  const batch = writeBatch(db);

  // Delete all sessions & messages
  const sessionsSnap = await getDocs(collection(db, 'users', uid, 'sessions'));
  for (const sDoc of sessionsSnap.docs) {
    const msgs = await getDocs(collection(db, 'users', uid, 'sessions', sDoc.id, 'messages'));
    msgs.forEach((m) => batch.delete(m.ref));
    batch.delete(sDoc.ref);
  }

  // Delete goals
  const goalsSnap = await getDocs(collection(db, 'users', uid, 'goals'));
  goalsSnap.forEach((g) => batch.delete(g.ref));

  // Delete insights
  const insightsSnap = await getDocs(collection(db, 'users', uid, 'savedInsights'));
  insightsSnap.forEach((i) => batch.delete(i.ref));

  // Delete profile
  batch.delete(doc(db, 'users', uid, 'profile', 'default'));

  await batch.commit();
}
