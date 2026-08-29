import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { JournalSession, Goal, SavedInsight } from '../../types';
import { getTodayPrompt } from '../../data/prompts';
import {
  Sparkles,
  Flame,
  PlusCircle,
  Clock,
  Target,
  ArrowRight,
  BookOpen,
  Calendar,
  Smile,
  ChevronRight,
  CheckCircle2,
  Bookmark,
} from 'lucide-react';

interface DashboardHomeProps {
  sessions: JournalSession[];
  goals: Goal[];
  savedInsights: SavedInsight[];
  onStartSession: (initialText?: string, promptText?: string) => void;
  onOpenSession: (sessionId: string) => void;
  onNavigateTab: (tab: string) => void;
}

export const DashboardHome: React.FC<DashboardHomeProps> = ({
  sessions,
  goals,
  savedInsights,
  onStartSession,
  onOpenSession,
  onNavigateTab,
}) => {
  const { user, userProfile } = useAuth();
  const [quickThought, setQuickThought] = useState('');
  const todayPrompt = getTodayPrompt();

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const streak = userProfile?.streak?.current || 1;
  const activeGoals = goals.filter((g) => g.status === 'active');
  const recentSessions = sessions.slice(0, 4);

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickThought.trim()) return;
    onStartSession(quickThought.trim());
    setQuickThought('');
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl border border-slate-800/80 bg-gradient-to-r from-slate-900/90 via-slate-950/80 to-sky-950/30 backdrop-blur-xl shadow-xl">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sky-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Private AI Reflection Space</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {getTimeGreeting()},{' '}
            <span className="text-sky-400">
              {userProfile?.displayName || user?.displayName?.split(' ')[0] || 'Friend'}
            </span>
          </h1>
          <p className="text-sm text-slate-400">
            How are you feeling today? Take a mindful pause to reflect and untangle your thoughts.
          </p>
        </div>

        <button
          id="dash-new-reflection-btn"
          onClick={() => onStartSession()}
          className="self-start md:self-center flex items-center gap-2 px-5 py-3 rounded-2xl font-semibold text-white bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 shadow-lg shadow-sky-500/25 active:scale-95 transition-all text-sm shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Journal</span>
        </button>
      </div>

      {/* Daily Reflection Prompt Card */}
      {userProfile?.preferences?.dailyPromptEnabled !== false && (
        <div className="p-6 rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-950/20 via-slate-900/60 to-slate-950 backdrop-blur-xl relative overflow-hidden">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
              <span>☀️ Today's Daily Reflection</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px]">
                {todayPrompt.category}
              </span>
            </div>
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
          </div>

          <p className="text-lg sm:text-xl font-medium text-slate-100 max-w-3xl leading-relaxed">
            "{todayPrompt.question}"
          </p>

          <div className="mt-4 flex items-center gap-3">
            <button
              id="dash-start-prompt-reflection-btn"
              onClick={() => onStartSession('', todayPrompt.question)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Reflect on this prompt</span>
            </button>
          </div>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Reflection Streak */}
        <div className="p-4 sm:p-5 rounded-2xl border border-slate-800/80 bg-slate-900/50 backdrop-blur-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Streak</span>
            <Flame className="w-4 h-4 text-amber-400 fill-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white">{streak} days</div>
          <p className="text-[11px] text-slate-500 mt-1">Keep the momentum going</p>
        </div>

        {/* Total Reflections */}
        <div className="p-4 sm:p-5 rounded-2xl border border-slate-800/80 bg-slate-900/50 backdrop-blur-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Reflections</span>
            <BookOpen className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-white">{sessions.length}</div>
          <p className="text-[11px] text-slate-500 mt-1">Total sessions preserved</p>
        </div>

        {/* Active Goals */}
        <div
          onClick={() => onNavigateTab('goals')}
          className="p-4 sm:p-5 rounded-2xl border border-slate-800/80 bg-slate-900/50 backdrop-blur-sm hover:border-slate-700 cursor-pointer transition-colors"
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Active Goals</span>
            <Target className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">{activeGoals.length}</div>
          <p className="text-[11px] text-slate-500 mt-1">Tracked commitments</p>
        </div>

        {/* Saved Insights */}
        <div
          onClick={() => onNavigateTab('favorites')}
          className="p-4 sm:p-5 rounded-2xl border border-slate-800/80 bg-slate-900/50 backdrop-blur-sm hover:border-slate-700 cursor-pointer transition-colors"
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Saved Insights</span>
            <Bookmark className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white">{savedInsights.length}</div>
          <p className="text-[11px] text-slate-500 mt-1">Core takeaways</p>
        </div>
      </div>

      {/* Interactive Quick Composer */}
      <div className="p-6 sm:p-7 rounded-3xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-xl shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <label htmlFor="quick-thought-input" className="text-sm font-semibold text-white flex items-center gap-2">
            <Smile className="w-4 h-4 text-sky-400" />
            <span>How are you feeling right now?</span>
          </label>
          <span className="text-xs text-slate-400">Press enter to start reflecting</span>
        </div>

        <form onSubmit={handleQuickSubmit} className="space-y-3">
          <textarea
            id="quick-thought-input"
            value={quickThought}
            onChange={(e) => setQuickThought(e.target.value)}
            placeholder="Write your thoughts freely... (e.g., Today I felt overwhelmed by my schedule and want to simplify...)"
            rows={3}
            className="w-full p-4 rounded-2xl border border-slate-800 bg-slate-950/70 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50 transition-all resize-none"
          />

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse"></span>
              <span>Gemini Flash ready to reflect</span>
            </div>

            <button
              type="submit"
              disabled={!quickThought.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white bg-sky-500 hover:bg-sky-400 disabled:opacity-40 disabled:pointer-events-none transition-all shadow-md shadow-sky-500/20"
            >
              <span>Reflect with Gemini</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>

      {/* Two Column Section: Recent Sessions & Quick Goals/Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Sessions (2 columns) */}
        <div className="lg:col-span-2 p-6 rounded-3xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-400" />
              <span>Recent Reflection Sessions</span>
            </h2>
            <button
              onClick={() => onNavigateTab('history')}
              className="text-xs font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1"
            >
              <span>View all</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentSessions.length === 0 ? (
            <div className="py-12 text-center rounded-2xl border border-dashed border-slate-800 p-6 space-y-3">
              <BookOpen className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-sm font-medium text-slate-300">No reflections yet.</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Start writing your first reflection and let Gemini help you unpack and understand it.
              </p>
              <button
                onClick={() => onStartSession()}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-sky-400 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 transition-colors"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Start First Reflection</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentSessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => onOpenSession(session.id)}
                  className="p-4 rounded-2xl border border-slate-800/80 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-900/60 transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="space-y-1 max-w-[80%]">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-white group-hover:text-sky-300 transition-colors truncate">
                        {session.title || 'Untitled Reflection'}
                      </h4>
                      {session.mood && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                          {session.mood}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 truncate">
                      {session.summary?.mainTopic || `${session.messageCount || 0} messages exchanged`}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-slate-500">
                      {session.updatedAt ? new Date(session.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-sky-400 transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Goals & AI Insight Sidebar (1 column) */}
        <div className="space-y-6">
          {/* Active Goals Card */}
          <div className="p-6 rounded-3xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-400" />
                <span>Active Goals</span>
              </h3>
              <button
                onClick={() => onNavigateTab('goals')}
                className="text-xs text-sky-400 hover:underline"
              >
                Manage
              </button>
            </div>

            {activeGoals.length === 0 ? (
              <p className="text-xs text-slate-500 py-3">
                No active goals yet. Add commitments to track your reflection progress.
              </p>
            ) : (
              <div className="space-y-3">
                {activeGoals.slice(0, 3).map((goal) => (
                  <div key={goal.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-200 truncate">{goal.title}</span>
                      <span className="text-slate-400 font-mono">{goal.progress}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-400 transition-all duration-300"
                        style={{ width: `${goal.progress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent AI Insight Card */}
          <div className="p-6 rounded-3xl border border-sky-500/20 bg-gradient-to-br from-sky-950/20 via-slate-900/60 to-slate-950 backdrop-blur-sm space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-sky-400">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Reflective Insight</span>
              </span>
              <span className="text-[10px] text-slate-400">AI Observation</span>
            </div>
            <p className="text-xs text-slate-300 italic leading-relaxed">
              "Breaking large, open-ended aspirations into 15-minute daily rituals turns overwhelm into manageable momentum."
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
