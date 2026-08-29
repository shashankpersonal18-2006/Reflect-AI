import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { JournalSession } from '../../types';
import { updateSession, deleteSession } from '../../lib/firestore/service';
import {
  Search,
  Calendar,
  Star,
  Trash2,
  Edit2,
  ChevronRight,
  BookOpen,
  Filter,
  ArrowUpDown,
} from 'lucide-react';

interface HistoryViewProps {
  sessions: JournalSession[];
  onOpenSession: (sessionId: string) => void;
  onNewJournal: () => void;
  onSessionUpdated: (id: string, updates: Partial<JournalSession>) => void;
  onSessionDeleted: (id: string) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  sessions,
  onOpenSession,
  onNewJournal,
  onSessionUpdated,
  onSessionDeleted,
}) => {
  const { user } = useAuth();
  const { success, error: showError } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterMood, setFilterMood] = useState<string>('all');
  const [filterFavorite, setFilterFavorite] = useState<boolean>(false);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  // Inline rename state
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');

  const handleToggleFavorite = async (e: React.MouseEvent, session: JournalSession) => {
    e.stopPropagation();
    if (!user) return;
    const newVal = !session.isFavorite;
    try {
      await updateSession(user.uid, session.id, { isFavorite: newVal });
      onSessionUpdated(session.id, { isFavorite: newVal });
      success(newVal ? 'Added to favorites' : 'Removed from favorites');
    } catch (err) {
      showError('Failed to update favorite status');
    }
  };

  const handleDelete = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (!user) return;
    if (window.confirm('Delete this reflection session?')) {
      try {
        await deleteSession(user.uid, sessionId);
        onSessionDeleted(sessionId);
        success('Session deleted');
      } catch (err) {
        showError('Failed to delete session');
      }
    }
  };

  const handleRenameSubmit = async (sessionId: string) => {
    if (!user || !newTitle.trim()) {
      setRenamingId(null);
      return;
    }
    try {
      await updateSession(user.uid, sessionId, { title: newTitle.trim() });
      onSessionUpdated(sessionId, { title: newTitle.trim() });
      success('Renamed successfully');
    } catch (err) {
      showError('Failed to rename session');
    } finally {
      setRenamingId(null);
    }
  };

  // Filtered & Sorted Sessions
  const filteredSessions = useMemo(() => {
    return sessions
      .filter((s) => {
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = s.title?.toLowerCase().includes(q);
          const matchTopic = s.summary?.mainTopic?.toLowerCase().includes(q);
          const matchMood = s.mood?.toLowerCase().includes(q);
          if (!matchTitle && !matchTopic && !matchMood) return false;
        }

        // Mood filter
        if (filterMood !== 'all' && s.mood !== filterMood) {
          return false;
        }

        // Favorite filter
        if (filterFavorite && !s.isFavorite) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.updatedAt || a.createdAt).getTime();
        const timeB = new Date(b.updatedAt || b.createdAt).getTime();
        return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
      });
  }, [sessions, searchQuery, filterMood, filterFavorite, sortOrder]);

  // Group by date (Today, Yesterday, Last 7 Days, Older)
  const groupedSessions = useMemo(() => {
    const groups: { [key: string]: JournalSession[] } = {
      Today: [],
      Yesterday: [],
      'This Week': [],
      Earlier: [],
    };

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).getTime();

    filteredSessions.forEach((s) => {
      const sessionDate = (s.createdAt || s.updatedAt || '').split('T')[0];
      const sessionTime = new Date(s.createdAt || s.updatedAt || '').getTime();

      if (sessionDate === todayStr) {
        groups.Today.push(s);
      } else if (sessionDate === yesterday) {
        groups.Yesterday.push(s);
      } else if (sessionTime >= sevenDaysAgo) {
        groups['This Week'].push(s);
      } else {
        groups.Earlier.push(s);
      }
    });

    return groups;
  }, [filteredSessions]);

  const moodsList = ['all', 'Focused', 'Motivated', 'Calm', 'Stressed', 'Excited', 'Uncertain', 'Frustrated', 'Grateful', 'Reflective'];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Journal History</h1>
          <p className="text-sm text-slate-400">Search and revisit your past reflections and breakthroughs.</p>
        </div>

        <button
          onClick={onNewJournal}
          className="px-4 py-2 text-xs font-semibold text-white bg-sky-500 hover:bg-sky-400 rounded-xl transition-colors self-start sm:self-auto shadow-md shadow-sky-500/20"
        >
          + New Reflection
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-xl space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              id="history-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reflections by keyword, topic, or mood (e.g., career, focus, React)..."
              className="w-full pl-10 pr-4 py-2 rounded-xl text-sm bg-slate-950/80 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Sort Toggle */}
          <button
            onClick={() => setSortOrder((prev) => (prev === 'newest' ? 'oldest' : 'newest'))}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 bg-slate-950/80 border border-slate-800 hover:border-slate-700 shrink-0"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-sky-400" />
            <span>{sortOrder === 'newest' ? 'Newest First' : 'Oldest First'}</span>
          </button>

          {/* Favorites filter toggle */}
          <button
            onClick={() => setFilterFavorite((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-colors shrink-0 ${
              filterFavorite
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${filterFavorite ? 'fill-amber-400 text-amber-400' : ''}`} />
            <span>Favorites</span>
          </button>
        </div>

        {/* Mood filter chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mr-1 shrink-0">
            Mood:
          </span>
          {moodsList.map((m) => (
            <button
              key={m}
              onClick={() => setFilterMood(m)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize transition-colors shrink-0 ${
                filterMood === m
                  ? 'bg-sky-500 text-white'
                  : 'bg-slate-950/60 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Session Groups */}
      {filteredSessions.length === 0 ? (
        <div className="py-16 text-center rounded-3xl border border-dashed border-slate-800 p-8 space-y-3">
          <BookOpen className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-semibold text-slate-300">No reflections found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery || filterMood !== 'all' || filterFavorite
              ? 'Try adjusting your filters or search keywords.'
              : 'Write your thoughts and start your first conversation with Gemini.'}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {(Object.entries(groupedSessions) as [string, JournalSession[]][]).map(([groupName, groupItems]) => {
            if (groupItems.length === 0) return null;
            return (
              <div key={groupName} className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <Calendar className="w-3.5 h-3.5 text-sky-400" />
                  <span>{groupName}</span>
                  <span className="text-slate-600 font-mono">({groupItems.length})</span>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {groupItems.map((session) => (
                    <div
                      key={session.id}
                      onClick={() => onOpenSession(session.id)}
                      className="p-5 rounded-2xl border border-slate-800/80 bg-slate-900/50 hover:bg-slate-900/90 hover:border-slate-700 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                    >
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {renamingId === session.id ? (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-2"
                            >
                              <input
                                type="text"
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleRenameSubmit(session.id)}
                                className="px-2 py-0.5 text-xs font-semibold rounded bg-slate-950 border border-sky-500 text-white"
                                autoFocus
                              />
                              <button
                                onClick={() => handleRenameSubmit(session.id)}
                                className="text-xs text-sky-400"
                              >
                                Save
                              </button>
                            </div>
                          ) : (
                            <h3 className="text-sm font-semibold text-white group-hover:text-sky-300 transition-colors truncate">
                              {session.title || 'Untitled Session'}
                            </h3>
                          )}

                          {session.mood && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                              {session.mood}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                          {session.summary?.mainTopic ||
                            `Session with ${session.messageCount || 0} messages.`}
                        </p>

                        <div className="flex items-center gap-3 text-[11px] text-slate-500">
                          <span>
                            {session.createdAt ? new Date(session.createdAt).toLocaleDateString() : ''}
                          </span>
                          <span>•</span>
                          <span>{session.messageCount || 0} messages</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button
                          onClick={(e) => handleToggleFavorite(e, session)}
                          className={`p-2 rounded-xl border transition-colors ${
                            session.isFavorite
                              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                              : 'border-slate-800 text-slate-500 hover:text-slate-300'
                          }`}
                          title="Bookmark favorite"
                        >
                          <Star className={`w-3.5 h-3.5 ${session.isFavorite ? 'fill-amber-400' : ''}`} />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setRenamingId(session.id);
                            setNewTitle(session.title);
                          }}
                          className="p-2 rounded-xl border border-slate-800 text-slate-500 hover:text-slate-300"
                          title="Rename"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={(e) => handleDelete(e, session.id)}
                          className="p-2 rounded-xl border border-slate-800 text-slate-500 hover:text-rose-400"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-sky-400 transition-colors ml-1" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
