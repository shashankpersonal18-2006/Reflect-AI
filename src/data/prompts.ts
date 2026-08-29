import { DailyPrompt } from '../types';

export const DAILY_PROMPTS: DailyPrompt[] = [
  {
    id: 'p1',
    question: 'What is one thing you want to improve or nurture today?',
    category: 'Intention',
    icon: 'Sun',
  },
  {
    id: 'p2',
    question: 'What went well today, and what personal strength helped make it happen?',
    category: 'Gratitude',
    icon: 'Sparkles',
  },
  {
    id: 'p3',
    question: 'What challenged you recently, and what did that challenge reveal to you?',
    category: 'Resilience',
    icon: 'Shield',
  },
  {
    id: 'p4',
    question: 'What is your single biggest priority right now, and what friction is standing in your way?',
    category: 'Clarity',
    icon: 'Compass',
  },
  {
    id: 'p5',
    question: 'What are you genuinely grateful for in this exact moment?',
    category: 'Mindfulness',
    icon: 'Heart',
  },
  {
    id: 'p6',
    question: 'What would you do differently if you approached today with calm confidence?',
    category: 'Perspective',
    icon: 'Feather',
  },
  {
    id: 'p7',
    question: 'What is something meaningful you are looking forward to, and why?',
    category: 'Optimism',
    icon: 'Sunrise',
  },
];

export function getTodayPrompt(): DailyPrompt {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24);
  return DAILY_PROMPTS[dayOfYear % DAILY_PROMPTS.length];
}
