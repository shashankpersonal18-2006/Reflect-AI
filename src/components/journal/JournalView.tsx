import React, { useState, useEffect, useRef } from 'react';
import Markdown from 'react-markdown';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  JournalSession,
  JournalMessage,
  AIMode,
  MoodTheme,
  JournalSessionSummary,
} from '../../types';
import {
  subscribeMessages,
  addMessage,
  updateSession,
  deleteSession,
  createGoal,
  saveInsight,
} from '../../lib/firestore/service';
import {
  Sparkles,
  Send,
  ArrowLeft,
  Bookmark,
  Star,
  Edit2,
  Trash2,
  BrainCircuit,
  FileText,
  HelpCircle,
  Compass,
  CheckCircle2,
  Copy,
  Check,
  RefreshCw,
  X,
  Target,
} from 'lucide-react';

interface JournalViewProps {
  session: JournalSession;
  initialPrompt?: string;
  onBack: () => void;
  onSessionUpdated: (updated: Partial<JournalSession>) => void;
  onSessionDeleted: () => void;
}

export const JournalView: React.FC<JournalViewProps> = ({
  session,
  initialPrompt,
  onBack,
  onSessionUpdated,
  onSessionDeleted,
}) => {
  const { user, authFetch, userProfile } = useAuth();
  const { success, error: showError, info } = useToast();

  const [messages, setMessages] = useState<JournalMessage[]>([]);
  const [inputText, setInputText] = useState(initialPrompt || '');
  const [selectedMode, setSelectedMode] = useState<AIMode>(userProfile?.preferences?.defaultMode || 'Reflect');
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingText, setStreamingText] = useState('');

  // Titling & Renaming
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(session.title);

  // Summary Drawer / Modal
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [activeSummary, setActiveSummary] = useState<JournalSessionSummary | null>(session.summary || null);

  // Detected goal callout
  const [activeDetectedGoal, setActiveDetectedGoal] = useState<string | null>(null);

  // Copied message state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Subscribe to real-time messages
  useEffect(() => {
    if (!user || !session.id) return;
    const unsub = subscribeMessages(user.uid, session.id, (loadedMsgs) => {
      setMessages(loadedMsgs);
    });
    return () => unsub();
  }, [user, session.id]);

  // Scroll to bottom on updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText, isGenerating]);

  // Auto-focus input
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleRenameTitle = async () => {
    if (!titleInput.trim() || titleInput === session.title) {
      setIsEditingTitle(false);
      return;
    }
    try {
      await updateSession(user!.uid, session.id, { title: titleInput.trim() });
      onSessionUpdated({ title: titleInput.trim() });
      success('Session renamed');
    } catch (err: any) {
      showError('Failed to rename session');
    } finally {
      setIsEditingTitle(false);
    }
  };

  const handleToggleFavorite = async () => {
    const newVal = !session.isFavorite;
    try {
      await updateSession(user!.uid, session.id, { isFavorite: newVal });
      onSessionUpdated({ isFavorite: newVal });
      success(newVal ? 'Added to favorites' : 'Removed from favorites');
    } catch (err: any) {
      showError('Failed to update favorite status');
    }
  };

  const handleDeleteSession = async () => {
    if (window.confirm('Are you sure you want to delete this reflection session? This cannot be undone.')) {
      try {
        await deleteSession(user!.uid, session.id);
        success('Reflection session deleted');
        onSessionDeleted();
      } catch (err: any) {
        showError('Failed to delete session');
      }
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isGenerating || !user) return;

    const userMessageContent = inputText.trim();
    setInputText('');
    setIsGenerating(true);
    setStreamingText('');

    const isFirst = messages.length === 0;

    try {
      // 1. Save user turn immediately to Firestore
      await addMessage(user.uid, session.id, {
        role: 'user',
        content: userMessageContent,
        createdAt: new Date().toISOString(),
      });

      // 2. Prepare conversation history for multi-turn context
      const historyContext = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // 3. Call AI endpoint with streaming
      const response = await authFetch('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: session.id,
          message: userMessageContent,
          mode: selectedMode,
          history: historyContext,
          stream: true,
          isFirstMessage: isFirst,
        }),
      });

      if (!response.ok) {
        throw new Error(`AI generation failed with status ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder('utf-8');
      let finalAIResponse = '';
      let detectedTitle: string | null = null;
      let detectedMood: { mood: MoodTheme; confidence: 'Low' | 'Medium' | 'High' } | null = null;
      let detectedGoalText: string | null = null;
      let modelUsed = 'gemini-3.6-flash';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.substring(6));
                if (data.type === 'chunk') {
                  finalAIResponse += data.text;
                  setStreamingText((prev) => prev + data.text);
                } else if (data.type === 'done') {
                  finalAIResponse = data.text || finalAIResponse;
                  modelUsed = data.modelUsed || modelUsed;
                  detectedTitle = data.generatedTitle;
                  detectedMood = data.moodInfo;
                  detectedGoalText = data.detectedGoal;
                } else if (data.type === 'error') {
                  throw new Error(data.error);
                }
              } catch (parseErr) {
                // Ignore chunk parse edges
              }
            }
          }
        }
      }

      // 4. Save assistant response turn to Firestore
      if (finalAIResponse.trim()) {
        await addMessage(user.uid, session.id, {
          role: 'assistant',
          content: finalAIResponse.trim(),
          model: modelUsed,
          mode: selectedMode,
          detectedGoal: detectedGoalText,
          createdAt: new Date().toISOString(),
        });
      }

      // 5. Update session metadata if title or mood detected
      const updates: Partial<JournalSession> = {};
      if (isFirst && detectedTitle) {
        updates.title = detectedTitle;
        setTitleInput(detectedTitle);
      }
      if (detectedMood && userProfile?.preferences?.moodAnalysisEnabled !== false) {
        updates.mood = detectedMood.mood;
        updates.confidence = detectedMood.confidence;
      }

      if (Object.keys(updates).length > 0) {
        await updateSession(user.uid, session.id, updates);
        onSessionUpdated(updates);
      }

      // 6. If goal detected, show prompt
      if (detectedGoalText) {
        setActiveDetectedGoal(detectedGoalText);
      }
    } catch (err: any) {
      console.error('Error during AI conversation:', err);
      showError(err?.message || 'Could not complete reflection with Gemini.');
    } finally {
      setIsGenerating(false);
      setStreamingText('');
    }
  };

  const handleGenerateSummary = async () => {
    if (!user || messages.length === 0) {
      info('Exchange at least one thought before generating a summary.');
      return;
    }

    setIsGeneratingSummary(true);
    try {
      const transcript = messages
        .map((m) => `${m.role === 'user' ? 'User' : 'ReflectAI'}: ${m.content}`)
        .join('\n\n');

      const response = await authFetch('/api/ai/summarize', {
        method: 'POST',
        body: JSON.stringify({ transcript }),
      });

      if (!response.ok) {
        throw new Error('Summary service failed');
      }

      const summaryData: JournalSessionSummary = await response.json();
      setActiveSummary(summaryData);
      setIsSummaryOpen(true);

      // Persist summary to Firestore session document
      await updateSession(user.uid, session.id, { summary: summaryData });
      onSessionUpdated({ summary: summaryData });
      success('Session summary generated & saved');
    } catch (err: any) {
      console.error('Summary error:', err);
      showError(err?.message || 'Failed to generate session summary.');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleAddGoal = async (goalTitle: string) => {
    if (!user) return;
    try {
      await createGoal(user.uid, {
        title: goalTitle,
        description: `Identified during reflection: "${session.title}"`,
        progress: 0,
      });
      success(`Goal added: "${goalTitle}"`);
      setActiveDetectedGoal(null);
    } catch (err: any) {
      showError('Failed to save goal');
    }
  };

  const handleSaveAsInsight = async (text: string) => {
    if (!user) return;
    try {
      await saveInsight(user.uid, {
        content: text,
        sessionId: session.id,
        sessionTitle: session.title,
        category: 'Reflection',
      });
      success('Saved to your Insight Favorites ⭐');
    } catch (err: any) {
      showError('Could not save insight');
    }
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const modesList: { mode: AIMode; label: string; desc: string }[] = [
    { mode: 'Reflect', label: 'Reflect', desc: 'Thoughtful mirror & deep inquiry' },
    { mode: 'Brainstorm', label: 'Brainstorm', desc: 'Creative lateral ideation' },
    { mode: 'Summarize', label: 'Summarize', desc: 'Extract key points & takeaways' },
    { mode: 'Solve a Problem', label: 'Solve a Problem', desc: 'Deconstruct friction & roadblocks' },
    { mode: 'Plan', label: 'Plan', desc: 'Milestones & actionable checklist' },
    { mode: 'Ask Gemini', label: 'Ask Gemini', desc: 'Conversational thinking partner' },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] max-w-5xl mx-auto">
      {/* Session Top Bar */}
      <div className="flex items-center justify-between gap-3 p-4 border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            id="journal-back-btn"
            onClick={onBack}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          {isEditingTitle ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRenameTitle()}
                className="px-3 py-1 text-sm font-semibold rounded-lg bg-slate-900 border border-sky-500 text-white focus:outline-none"
                autoFocus
              />
              <button
                onClick={handleRenameTitle}
                className="px-2 py-1 text-xs font-semibold text-sky-400 hover:text-sky-300"
              >
                Save
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-base font-bold text-white truncate max-w-xs sm:max-w-md">
                {session.title || 'Untitled Reflection'}
              </h1>
              <button
                onClick={() => setIsEditingTitle(true)}
                className="p-1 text-slate-500 hover:text-slate-300"
                title="Rename reflection session"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {session.mood && userProfile?.preferences?.moodAnalysisEnabled !== false && (
            <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800/80 text-slate-300 border border-slate-700">
              {session.mood}
              {session.confidence && <span className="text-[10px] text-slate-500 ml-1">({session.confidence})</span>}
            </span>
          )}
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            id="journal-toggle-favorite-btn"
            onClick={handleToggleFavorite}
            className={`p-2 rounded-xl border transition-colors ${
              session.isFavorite
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
            title={session.isFavorite ? 'Remove from favorites' : 'Mark as favorite'}
          >
            <Star className={`w-4 h-4 ${session.isFavorite ? 'fill-amber-400' : ''}`} />
          </button>

          <button
            id="journal-summary-btn"
            onClick={handleGenerateSummary}
            disabled={isGeneratingSummary || messages.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-sky-400 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 transition-all disabled:opacity-40"
            title="Generate structured AI session summary"
          >
            {isGeneratingSummary ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">
              {session.summary ? 'View Summary' : 'Generate Summary'}
            </span>
          </button>

          <button
            id="journal-delete-btn"
            onClick={handleDeleteSession}
            className="p-2 rounded-xl border border-slate-800 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            title="Delete this reflection session"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* AI Mode Selector Tabs */}
      <div className="px-4 py-2 border-b border-slate-800/80 bg-slate-950/40 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider shrink-0 mr-1">
          AI Mode:
        </span>
        {modesList.map((m) => {
          const isSelected = selectedMode === m.mode;
          return (
            <button
              key={m.mode}
              onClick={() => setSelectedMode(m.mode)}
              title={m.desc}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                isSelected
                  ? 'bg-sky-500 text-white shadow-sm shadow-sky-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-slate-800/80'
              }`}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      {/* Detected Goal Quick Callout */}
      {activeDetectedGoal && (
        <div className="mx-4 mt-3 p-3 rounded-2xl bg-gradient-to-r from-sky-950/60 to-indigo-950/60 border border-sky-500/30 flex items-center justify-between gap-3 text-xs text-sky-200 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2 min-w-0">
            <Target className="w-4 h-4 text-sky-400 shrink-0" />
            <span className="truncate">
              <strong>AI detected a potential goal:</strong> "{activeDetectedGoal}"
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleAddGoal(activeDetectedGoal)}
              className="px-3 py-1 rounded-lg font-semibold text-xs text-white bg-sky-500 hover:bg-sky-400 transition-colors shadow-sm"
            >
              + Add as Goal
            </button>
            <button
              onClick={() => setActiveDetectedGoal(null)}
              className="text-slate-400 hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Messages Conversation Thread */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {messages.length === 0 && !isGenerating && (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4 text-slate-400">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="space-y-1 max-w-md">
              <h3 className="text-base font-bold text-white">Your thoughts are safe here</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Write whatever is on your mind. ReflectAI will respond in <strong>{selectedMode}</strong> mode,
                asking clarifying questions and helping you uncover clarity.
              </p>
            </div>
          </div>
        )}

        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3.5 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-sky-500/20">
                  <Sparkles className="w-4 h-4" />
                </div>
              )}

              <div className={`max-w-[85%] sm:max-w-2xl space-y-1.5 ${isUser ? 'items-end' : 'items-start'}`}>
                <div
                  className={`p-4 sm:p-5 rounded-2xl text-sm leading-relaxed ${
                    isUser
                      ? 'bg-sky-600 text-white rounded-br-none shadow-md shadow-sky-600/10 whitespace-pre-wrap'
                      : 'bg-slate-900/90 text-slate-200 border border-slate-800 rounded-bl-none shadow-xl'
                  }`}
                >
                  {isUser ? (
                    msg.content
                  ) : (
                    <div className="markdown-body space-y-2 prose prose-invert max-w-none text-sm">
                      <Markdown>{msg.content}</Markdown>
                    </div>
                  )}
                </div>

                {/* Assistant metadata & quick tools */}
                {!isUser && (
                  <div className="flex items-center gap-3 px-1 text-[11px] text-slate-500">
                    <span>Mode: {msg.mode || 'Reflect'}</span>
                    <span>•</span>
                    <button
                      onClick={() => handleSaveAsInsight(msg.content)}
                      className="hover:text-amber-400 flex items-center gap-1 transition-colors"
                      title="Save as key insight"
                    >
                      <Bookmark className="w-3 h-3" />
                      <span>Save as Insight</span>
                    </button>
                    <span>•</span>
                    <button
                      onClick={() => handleCopyText(msg.id, msg.content)}
                      className="hover:text-slate-300 flex items-center gap-1 transition-colors"
                      title="Copy message text"
                    >
                      {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                )}
              </div>

              {isUser && (
                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-200 shrink-0">
                  {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'You'}
                </div>
              )}
            </div>
          );
        })}

        {/* Live Streaming or Thinking Indicator */}
        {isGenerating && (
          <div className="flex items-start gap-3.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-sky-500/20 animate-pulse">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="max-w-[85%] sm:max-w-2xl p-4 sm:p-5 rounded-2xl rounded-bl-none bg-slate-900/90 text-slate-200 border border-sky-500/30 shadow-xl space-y-2">
              {streamingText ? (
                <div className="markdown-body space-y-2 prose prose-invert max-w-none text-sm">
                  <Markdown>{streamingText}</Markdown>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-sky-400">
                  <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                  <span>Gemini is thinking and reflecting...</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Composer */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/80 backdrop-blur-xl shrink-0">
        <form onSubmit={handleSendMessage} className="relative flex items-end gap-2 max-w-4xl mx-auto">
          <textarea
            ref={textareaRef}
            id="journal-message-input"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder={`Reflect in ${selectedMode} mode... (Cmd/Ctrl + Enter to send)`}
            rows={2}
            className="w-full p-3.5 pr-12 rounded-2xl border border-slate-800 bg-slate-900/90 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50 resize-none transition-all"
          />

          <button
            type="submit"
            id="journal-send-btn"
            disabled={!inputText.trim() || isGenerating}
            className="absolute right-2.5 bottom-3.5 p-2 rounded-xl text-white bg-sky-500 hover:bg-sky-400 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-md shadow-sky-500/25"
            aria-label="Send reflection message"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        <p className="text-center text-[11px] text-slate-500 mt-2">
          ReflectAI is private and observational. Press Cmd/Ctrl + Enter to submit.
        </p>
      </div>

      {/* Structured Summary Modal */}
      {isSummaryOpen && activeSummary && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-2xl max-h-[85vh] rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-2xl overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2 text-sky-400 font-bold text-lg">
                <Sparkles className="w-5 h-5" />
                <span>Session Summary</span>
              </div>
              <button
                onClick={() => setIsSummaryOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Main Topic</h4>
                <p className="text-slate-200 leading-relaxed font-medium bg-slate-950/50 p-3.5 rounded-xl border border-slate-800/80">
                  {activeSummary.mainTopic}
                </p>
              </div>

              {activeSummary.keyPoints && activeSummary.keyPoints.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Key Points</h4>
                  <ul className="space-y-1.5">
                    {activeSummary.keyPoints.map((point, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-slate-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-2 shrink-0" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {activeSummary.potentialChallenges && activeSummary.potentialChallenges.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Potential Challenges</h4>
                  <ul className="space-y-1.5">
                    {activeSummary.potentialChallenges.map((challenge, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-slate-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 shrink-0" />
                        <span>{challenge}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {activeSummary.possibleNextSteps && activeSummary.possibleNextSteps.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Possible Next Steps</h4>
                  <ul className="space-y-2">
                    {activeSummary.possibleNextSteps.map((step, idx) => (
                      <li key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-800 text-slate-200">
                        <span className="text-xs">{step}</span>
                        <button
                          onClick={() => handleAddGoal(step)}
                          className="text-[11px] font-semibold text-sky-400 hover:text-sky-300 underline ml-2 shrink-0"
                        >
                          + Add as Goal
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsSummaryOpen(false)}
                className="px-5 py-2 rounded-xl text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-white transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
