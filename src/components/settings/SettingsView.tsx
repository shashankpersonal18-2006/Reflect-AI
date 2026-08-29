import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { JournalSession, Goal, AIMode } from '../../types';
import { deleteAllUserData } from '../../lib/firestore/service';
import {
  Settings,
  User,
  Shield,
  Download,
  Trash2,
  Moon,
  Sun,
  Smile,
  Bell,
  BrainCircuit,
  Lock,
  LogOut,
  AlertTriangle,
  FileText,
} from 'lucide-react';

interface SettingsViewProps {
  sessions: JournalSession[];
  goals: Goal[];
}

export const SettingsView: React.FC<SettingsViewProps> = ({ sessions, goals }) => {
  const { user, userProfile, updatePreferences, signOutUser, authFetch } = useAuth();
  const { success, error: showError, info } = useToast();

  const [isExporting, setIsExporting] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const prefs = userProfile?.preferences || {
    theme: 'dark',
    moodAnalysisEnabled: true,
    dailyPromptEnabled: true,
    defaultMode: 'Reflect',
  };

  const handleToggleTheme = (theme: 'dark' | 'light') => {
    updatePreferences({ theme });
    success(`Theme set to ${theme}`);
  };

  const handleToggleMood = () => {
    const next = !prefs.moodAnalysisEnabled;
    updatePreferences({ moodAnalysisEnabled: next });
    success(next ? 'Mood detection enabled' : 'Mood detection disabled');
  };

  const handleToggleDailyPrompt = () => {
    const next = !prefs.dailyPromptEnabled;
    updatePreferences({ dailyPromptEnabled: next });
    success(next ? 'Daily prompts enabled' : 'Daily prompts disabled');
  };

  const handleChangeDefaultMode = (mode: AIMode) => {
    updatePreferences({ defaultMode: mode });
    success(`Default mode set to ${mode}`);
  };

  const handleExportData = async (format: 'json' | 'markdown') => {
    if (!user) return;
    setIsExporting(true);

    try {
      const response = await authFetch('/api/export', {
        method: 'POST',
        body: JSON.stringify({
          format,
          sessions,
          goals,
        }),
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reflectai-export-${new Date().toISOString().split('T')[0]}.${format === 'markdown' ? 'md' : 'json'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      success(`Exported as ${format.toUpperCase()}`);
    } catch (err: any) {
      showError(err?.message || 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const handleClearAllHistory = async () => {
    if (!user) return;
    setIsDeletingAll(true);
    try {
      await deleteAllUserData(user.uid);
      success('All journal sessions and goals cleared');
      setShowDeleteModal(false);
      window.location.reload();
    } catch (err: any) {
      showError(err?.message || 'Failed to delete data');
    } finally {
      setIsDeletingAll(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-20">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Account &amp; Preferences</h1>
        <p className="text-sm text-slate-400">
          Manage your personal profile, reflection settings, and data exports.
        </p>
      </div>

      {/* User Profile Card */}
      <div className="p-6 rounded-3xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <User className="w-4 h-4 text-sky-400" />
          <span>Profile Information</span>
        </h2>

        <div className="flex items-center gap-4 pt-2">
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt="Avatar"
              referrerPolicy="no-referrer"
              className="w-14 h-14 rounded-2xl object-cover border border-slate-700"
            />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-sky-600 flex items-center justify-center text-white text-xl font-bold">
              {(user?.displayName || user?.email || 'U').charAt(0).toUpperCase()}
            </div>
          )}

          <div className="space-y-0.5">
            <h3 className="text-base font-bold text-white">
              {userProfile?.displayName || user?.displayName || 'Reflective Writer'}
            </h3>
            <p className="text-xs text-slate-400">{user?.email}</p>
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 pt-1">
              <Shield className="w-3.5 h-3.5" />
              <span>Google Identity Verified</span>
            </div>
          </div>
        </div>
      </div>

      {/* Reflection Preferences */}
      <div className="p-6 rounded-3xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl space-y-6">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Settings className="w-4 h-4 text-sky-400" />
          <span>Reflection Preferences</span>
        </h2>

        <div className="space-y-4 text-sm">
          {/* Theme Preference */}
          <div className="flex items-center justify-between py-2 border-b border-slate-800/80">
            <div>
              <h4 className="font-semibold text-slate-200">Color Theme</h4>
              <p className="text-xs text-slate-400">Choose between dark or light aesthetic</p>
            </div>
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800">
              <button
                onClick={() => handleToggleTheme('dark')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  prefs.theme !== 'light' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                <span>Dark</span>
              </button>
              <button
                onClick={() => handleToggleTheme('light')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  prefs.theme === 'light' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                <span>Light</span>
              </button>
            </div>
          </div>

          {/* Mood Analysis Toggle */}
          <div className="flex items-center justify-between py-2 border-b border-slate-800/80">
            <div>
              <h4 className="font-semibold text-slate-200">Observational Mood Detection</h4>
              <p className="text-xs text-slate-400">
                Allow Gemini to identify broad themes (Focused, Calm, Motivated)
              </p>
            </div>
            <button
              onClick={handleToggleMood}
              className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                prefs.moodAnalysisEnabled ? 'bg-sky-500' : 'bg-slate-800'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  prefs.moodAnalysisEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Daily Prompt Toggle */}
          <div className="flex items-center justify-between py-2 border-b border-slate-800/80">
            <div>
              <h4 className="font-semibold text-slate-200">Daily Reflection Prompt</h4>
              <p className="text-xs text-slate-400">
                Display curated daily prompt card on Dashboard
              </p>
            </div>
            <button
              onClick={handleToggleDailyPrompt}
              className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                prefs.dailyPromptEnabled ? 'bg-sky-500' : 'bg-slate-800'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  prefs.dailyPromptEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Default AI Mode */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2">
            <div>
              <h4 className="font-semibold text-slate-200">Default AI Mode</h4>
              <p className="text-xs text-slate-400">Preferred conversational style for new sessions</p>
            </div>
            <select
              value={prefs.defaultMode || 'Reflect'}
              onChange={(e) => handleChangeDefaultMode(e.target.value as AIMode)}
              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-white focus:outline-none focus:border-sky-500"
            >
              <option value="Reflect">Reflect</option>
              <option value="Brainstorm">Brainstorm</option>
              <option value="Summarize">Summarize</option>
              <option value="Solve a Problem">Solve a Problem</option>
              <option value="Plan">Plan</option>
              <option value="Ask Gemini">Ask Gemini</option>
            </select>
          </div>
        </div>
      </div>

      {/* Data Sovereignty & Export */}
      <div className="p-6 rounded-3xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Download className="w-4 h-4 text-emerald-400" />
          <span>Data Sovereignty &amp; Export</span>
        </h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          Your reflections belong strictly to you. Download a complete archive of your journal sessions, AI summaries, and goals anytime.
        </p>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            onClick={() => handleExportData('json')}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors shadow-sm disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span>Export Raw JSON</span>
          </button>

          <button
            onClick={() => handleExportData('markdown')}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors shadow-sm disabled:opacity-50"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export Formatted Markdown (.md)</span>
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="p-6 rounded-3xl border border-rose-500/20 bg-rose-950/10 backdrop-blur-xl space-y-4">
        <h2 className="text-sm font-bold text-rose-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400" />
          <span>Danger Zone</span>
        </h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          Permanently erase all reflection history and active goals from Firestore. This action is irreversible.
        </p>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear All Data</span>
          </button>

          <button
            onClick={signOutUser}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl border border-rose-500/30 bg-slate-900 p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              <span>Permanently Delete All Reflections?</span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              This will permanently delete all your journal entries, messages, active goals, and saved insights from Cloud Firestore.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleClearAllHistory}
                disabled={isDeletingAll}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl"
              >
                {isDeletingAll ? 'Deleting...' : 'Yes, Delete Everything'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
