import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { JournalSession, SavedInsight, AIInsightsResponse } from '../../types';
import { deleteSavedInsight } from '../../lib/firestore/service';
import {
  Sparkles,
  TrendingUp,
  Bookmark,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  Info,
  Layers,
  Quote,
} from 'lucide-react';

interface InsightsViewProps {
  sessions: JournalSession[];
  savedInsights: SavedInsight[];
  initialTab?: 'insights' | 'favorites';
}

export const InsightsView: React.FC<InsightsViewProps> = ({
  sessions,
  savedInsights,
  initialTab = 'insights',
}) => {
  const { user, authFetch } = useAuth();
  const { success, error: showError } = useToast();

  const [activeTab, setActiveTab] = useState<'insights' | 'favorites'>(initialTab);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [synthesizedData, setSynthesizedData] = useState<AIInsightsResponse>({
    mostDiscussedTopics: [
      { topic: 'Mindful Reflection', count: 3, percentage: 45 },
      { topic: 'Habit Consistency', count: 2, percentage: 30 },
      { topic: 'Focus & Prioritization', count: 2, percentage: 25 },
    ],
    commonThemes: ['Growth Mindset', 'Daily Clarity', 'Simplification', 'Resilience'],
    recentInsights: [
      'Reflecting consistently turns scattered daily experiences into lasting self-trust.',
      'Small, bounded daily commitments prevent the guilt of open-ended to-do lists.',
    ],
    lastGeneratedAt: new Date().toISOString(),
  });

  const handleSynthesizeInsights = async () => {
    if (!user) return;
    setIsSynthesizing(true);

    try {
      // Gather snippets from recent reflection summaries and titles
      const snippets = sessions.map(
        (s) => `${s.title}: ${s.summary?.mainTopic || 'Reflective dialogue'}`
      );

      const response = await authFetch('/api/ai/insights', {
        method: 'POST',
        body: JSON.stringify({ snippets }),
      });

      if (!response.ok) {
        throw new Error('Insights synthesis failed');
      }

      const data: AIInsightsResponse = await response.json();
      setSynthesizedData(data);
      success('Reflection insights updated');
    } catch (err: any) {
      showError(err?.message || 'Could not synthesize insights');
    } finally {
      setIsSynthesizing(false);
    }
  };

  const handleDeleteSavedInsight = async (id: string) => {
    if (!user) return;
    try {
      await deleteSavedInsight(user.uid, id);
      success('Removed from saved insights');
    } catch (err) {
      showError('Failed to remove insight');
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">AI Insights &amp; Favorites</h1>
          <p className="text-sm text-slate-400">
            Synthesized patterns across your journal history and your bookmarked wisdom.
          </p>
        </div>

        {activeTab === 'insights' && (
          <button
            onClick={handleSynthesizeInsights}
            disabled={isSynthesizing}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-sky-400 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 rounded-xl transition-all disabled:opacity-40 self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSynthesizing ? 'animate-spin' : ''}`} />
            <span>Re-analyze Reflections</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('insights')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
            activeTab === 'insights'
              ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Synthesized Patterns</span>
        </button>

        <button
          onClick={() => setActiveTab('favorites')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
            activeTab === 'favorites'
              ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Bookmark className="w-4 h-4" />
          <span>Saved Insights ({savedInsights.length})</span>
        </button>
      </div>

      {activeTab === 'insights' ? (
        <div className="space-y-6">
          {/* Non-clinical Disclaimer Banner */}
          <div className="p-4 rounded-2xl border border-sky-500/20 bg-sky-950/20 flex items-start gap-3 text-xs text-sky-200">
            <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Notice:</strong> Observations generated by ReflectAI are designed to assist personal clarity and self-reflection. They do not constitute psychological or medical advice.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Most Discussed Topics */}
            <div className="p-6 rounded-3xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-sky-400" />
                  <span>Most Discussed Topics</span>
                </h3>
                <span className="text-[11px] text-slate-500">Across sessions</span>
              </div>

              <div className="space-y-3 pt-2">
                {synthesizedData.mostDiscussedTopics.map((item, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-200">{item.topic}</span>
                      <span className="text-slate-400 font-mono">{item.percentage}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-sky-500"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Common Reflection Themes */}
            <div className="p-6 rounded-3xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  <span>Common Reflection Themes</span>
                </h3>
                <span className="text-[11px] text-slate-500">Recurring motifs</span>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                {synthesizedData.commonThemes.map((theme, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 text-slate-200 border border-slate-700 hover:border-slate-600 transition-colors"
                  >
                    #{theme}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Key AI Takeaways */}
          <div className="p-6 sm:p-8 rounded-3xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Synthesized Observations</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {synthesizedData.recentInsights.map((insight, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-2xl border border-slate-800/80 bg-slate-950/40 relative flex flex-col justify-between space-y-3"
                >
                  <Quote className="w-5 h-5 text-sky-500/40 shrink-0" />
                  <p className="text-xs text-slate-200 leading-relaxed font-medium italic">
                    "{insight}"
                  </p>
                  <div className="text-[10px] text-slate-500 pt-2 border-t border-slate-900 flex items-center justify-between">
                    <span>Observation #{idx + 1}</span>
                    <button
                      onClick={() => handleCopy(`insight-${idx}`, insight)}
                      className="hover:text-slate-300 flex items-center gap-1"
                    >
                      {copiedId === `insight-${idx}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>Copy</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Favorites / Saved Insights */
        <div className="space-y-4">
          {savedInsights.length === 0 ? (
            <div className="py-16 text-center rounded-3xl border border-dashed border-slate-800 p-8 space-y-3">
              <Bookmark className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-base font-semibold text-slate-300">No saved insights yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Whenever Gemini shares a quote, perspective, or breakthrough you love, click "Save as Insight" to collect it here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {savedInsights.map((item) => (
                <div
                  key={item.id}
                  className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                >
                  <div className="space-y-2 min-w-0 flex-1">
                    <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                      "{item.content}"
                    </p>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500">
                      {item.sessionTitle && (
                        <span>From: <strong>{item.sessionTitle}</strong></span>
                      )}
                      <span>•</span>
                      <span>
                        {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      onClick={() => handleCopy(item.id, item.content)}
                      className="p-2 rounded-xl border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                      title="Copy insight"
                    >
                      {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      onClick={() => handleDeleteSavedInsight(item.id)}
                      className="p-2 rounded-xl border border-slate-800 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Remove from saved"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
