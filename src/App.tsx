import React, { useState, useEffect, useMemo } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { LandingPage } from './components/landing/LandingPage';
import { DashboardHome } from './components/dashboard/DashboardHome';
import { JournalView } from './components/journal/JournalView';
import { HistoryView } from './components/history/HistoryView';
import { GoalsView } from './components/goals/GoalsView';
import { InsightsView } from './components/insights/InsightsView';
import { SettingsView } from './components/settings/SettingsView';
import {
  JournalSession,
  Goal,
  SavedInsight,
} from './types';
import {
  subscribeSessions,
  subscribeGoals,
  subscribeSavedInsights,
  createSession,
} from './lib/firestore/service';
import { Sparkles, Loader2 } from 'lucide-react';

const AppContent: React.FC = () => {
  const { user, userProfile, loading } = useAuth();

  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [initialPromptText, setInitialPromptText] = useState<string | undefined>(undefined);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  const [sessions, setSessions] = useState<JournalSession[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [savedInsights, setSavedInsights] = useState<SavedInsight[]>([]);

  // Real-time Firestore Subscriptions for user data
  useEffect(() => {
    if (!user) {
      setSessions([]);
      setGoals([]);
      setSavedInsights([]);
      return;
    }

    const unsubSessions = subscribeSessions(user.uid, (data) => {
      setSessions(data);
    });

    const unsubGoals = subscribeGoals(user.uid, (data) => {
      setGoals(data);
    });

    const unsubInsights = subscribeSavedInsights(user.uid, (data) => {
      setSavedInsights(data);
    });

    return () => {
      unsubSessions();
      unsubGoals();
      unsubInsights();
    };
  }, [user]);

  // Active session object
  const activeSession = useMemo(() => {
    return sessions.find((s) => s.id === activeSessionId) || null;
  }, [sessions, activeSessionId]);

  // Handle Starting a new reflection session
  const handleStartNewSession = async (initialText?: string, promptText?: string) => {
    if (!user) return;
    try {
      const newId = await createSession(user.uid, promptText ? `Reflection: ${promptText.slice(0, 30)}...` : undefined);
      setActiveSessionId(newId);
      setInitialPromptText(initialText || promptText || undefined);
      setCurrentTab('journal');
    } catch (err) {
      console.error('Failed to create new session:', err);
    }
  };

  const handleOpenSession = (sessionId: string) => {
    setActiveSessionId(sessionId);
    setInitialPromptText(undefined);
    setCurrentTab('journal');
  };

  // Sync theme mode
  const isLight = userProfile?.preferences?.theme === 'light';

  // 1. Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-sky-500/20 animate-pulse">
          <Sparkles className="w-6 h-6" />
        </div>
        <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
          <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
          <span>Connecting securely to ReflectAI...</span>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated Visitor -> Modern Landing Page
  if (!user) {
    return <LandingPage />;
  }

  // 3. Authenticated User Workspace
  return (
    <div className={`min-h-screen flex flex-col ${isLight ? 'bg-slate-50 text-slate-900' : 'bg-slate-950 text-slate-100'}`}>
      <Navbar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          if (tab !== 'journal') setActiveSessionId(null);
        }}
        onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
        isMobileMenuOpen={isMobileMenuOpen}
      />

      <div className="flex-1 flex">
        {/* Sidebar Navigation */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => {
            setCurrentTab(tab);
            if (tab !== 'journal') setActiveSessionId(null);
          }}
          onNewJournal={() => handleStartNewSession()}
          isMobileMenuOpen={isMobileMenuOpen}
          onCloseMobileMenu={() => setIsMobileMenuOpen(false)}
        />

        {/* Main Content Area */}
        <main className="flex-1 lg:pl-64 flex flex-col min-w-0">
          <div className="flex-1 p-4 sm:p-6 lg:p-8">
            {currentTab === 'dashboard' && (
              <DashboardHome
                sessions={sessions}
                goals={goals}
                savedInsights={savedInsights}
                onStartSession={handleStartNewSession}
                onOpenSession={handleOpenSession}
                onNavigateTab={(tab) => setCurrentTab(tab)}
              />
            )}

            {currentTab === 'journal' && activeSession && (
              <JournalView
                session={activeSession}
                initialPrompt={initialPromptText}
                onBack={() => {
                  setCurrentTab('dashboard');
                  setActiveSessionId(null);
                }}
                onSessionUpdated={(updates) => {
                  setSessions((prev) =>
                    prev.map((s) => (s.id === activeSession.id ? { ...s, ...updates } : s))
                  );
                }}
                onSessionDeleted={() => {
                  setCurrentTab('dashboard');
                  setActiveSessionId(null);
                }}
              />
            )}

            {currentTab === 'history' && (
              <HistoryView
                sessions={sessions}
                onOpenSession={handleOpenSession}
                onNewJournal={() => handleStartNewSession()}
                onSessionUpdated={(id, updates) => {
                  setSessions((prev) =>
                    prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
                  );
                }}
                onSessionDeleted={(id) => {
                  setSessions((prev) => prev.filter((s) => s.id !== id));
                  if (activeSessionId === id) setActiveSessionId(null);
                }}
              />
            )}

            {currentTab === 'goals' && (
              <GoalsView
                goals={goals}
                onGoalAdded={() => {}}
              />
            )}

            {currentTab === 'insights' && (
              <InsightsView
                sessions={sessions}
                savedInsights={savedInsights}
                initialTab="insights"
              />
            )}

            {currentTab === 'favorites' && (
              <InsightsView
                sessions={sessions}
                savedInsights={savedInsights}
                initialTab="favorites"
              />
            )}

            {currentTab === 'settings' && (
              <SettingsView
                sessions={sessions}
                goals={goals}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AuthProvider>
  );
}
