export type AIMode =
  | 'Reflect'
  | 'Brainstorm'
  | 'Summarize'
  | 'Solve a Problem'
  | 'Plan'
  | 'Ask Gemini';

export type MoodTheme =
  | 'Focused'
  | 'Motivated'
  | 'Calm'
  | 'Stressed'
  | 'Excited'
  | 'Uncertain'
  | 'Frustrated'
  | 'Grateful'
  | 'Reflective';

export interface UserPreferences {
  theme: 'dark' | 'light' | 'system';
  moodAnalysisEnabled: boolean;
  dailyPromptEnabled: boolean;
  defaultMode: AIMode;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  preferences: UserPreferences;
  streak: {
    current: number;
    longest: number;
    totalDays: number;
    lastDate?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface JournalMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  model?: string;
  mode?: AIMode;
  detectedGoal?: string | null;
  createdAt: string;
}

export interface JournalSessionSummary {
  mainTopic: string;
  keyPoints: string[];
  potentialChallenges: string[];
  possibleNextSteps: string[];
  rawMarkdown?: string;
}

export interface JournalSession {
  id: string;
  userId: string;
  title: string;
  summary?: JournalSessionSummary | null;
  mood?: MoodTheme;
  confidence?: 'Low' | 'Medium' | 'High';
  messageCount: number;
  isFavorite?: boolean;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Goal {
  id: string;
  userId: string;
  title: string;
  description: string;
  status: 'active' | 'completed';
  progress: number; // 0 to 100
  createdAt: string;
  updatedAt: string;
}

export interface SavedInsight {
  id: string;
  userId: string;
  content: string;
  sessionId?: string;
  sessionTitle?: string;
  category?: string;
  createdAt: string;
}

export interface DailyPrompt {
  id: string;
  question: string;
  category: string;
  icon: string;
}

export interface AIInsightTopic {
  topic: string;
  count: number;
  percentage: number;
}

export interface AIInsightsResponse {
  mostDiscussedTopics: AIInsightTopic[];
  commonThemes: string[];
  recentInsights: string[];
  lastGeneratedAt: string;
}
