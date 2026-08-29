import { GoogleGenAI } from '@google/genai';

let genAIClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!genAIClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is missing.');
    }
    genAIClient = new GoogleGenAI({ apiKey });
  }
  return genAIClient;
}

// Resilient Model Fallback Ladder
export function getModelFallbackLadder(): string[] {
  const configured = process.env.GEMINI_MODEL;
  // Fallback Ladder ordered by availability, efficiency, and latency:
  // Primary: "gemini-3.6-flash"
  // High-Availability Fallback: "gemini-3.1-flash-lite"
  // Dynamic Alias: "gemini-flash-latest"
  // Deep Reasoning Fallback: "gemini-3.7-flash"
  const standardLadder = [
    'gemini-3.6-flash',
    'gemini-3.1-flash-lite',
    'gemini-flash-latest',
    'gemini-3.7-flash',
  ];

  const deprecated = [
    'gemini-2.5-flash',
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-2.0-flash',
    'gemini-2.0-pro',
    'gemini-2.0-flash-thinking',
    'gemini-pro',
  ];

  if (configured && !standardLadder.includes(configured) && !deprecated.includes(configured)) {
    return [configured, ...standardLadder];
  }
  return standardLadder;
}

export function isRecoverableGeminiError(err: any): boolean {
  if (!err) return false;
  const status = Number(err?.status || err?.statusCode || err?.code || 0);
  const msg = (err?.message || '').toLowerCase();
  const raw = typeof err === 'object' ? JSON.stringify(err).toLowerCase() : '';

  if ([404, 429, 500, 502, 503, 504].includes(status)) return true;
  if (msg.includes('404') || msg.includes('not found') || msg.includes('no longer available')) return true;
  if (msg.includes('429') || msg.includes('quota') || msg.includes('resource_exhausted') || msg.includes('rate limit')) return true;
  if (msg.includes('500') || msg.includes('503') || msg.includes('unavailable') || msg.includes('overloaded') || msg.includes('internal')) return true;
  if (raw.includes('404') || raw.includes('not_found') || raw.includes('resource_exhausted') || raw.includes('429')) return true;
  return true;
}

export interface ContentGenerationOptions {
  systemInstruction?: string;
  contents: any[];
  temperature?: number;
}

/**
 * Execute Gemini content generation with automated fallback ladder and error recovery
 */
export async function generateContentWithFallback(options: ContentGenerationOptions): Promise<{ text: string; modelUsed: string }> {
  const ai = getGeminiClient();
  const models = getModelFallbackLadder();
  let lastError: any = null;

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    try {
      const response = await ai.models.generateContent({
        model,
        contents: options.contents,
        config: {
          systemInstruction: options.systemInstruction,
          temperature: options.temperature ?? 0.7,
        },
      });

      const text = response.text || '';
      return { text, modelUsed: model };
    } catch (err: any) {
      console.warn(`[Gemini Fallback] Model ${model} failed:`, err?.message || err);
      lastError = err;

      const isRecoverable = isRecoverableGeminiError(err);
      if (!isRecoverable && i === models.length - 1) {
        break;
      }

      // If quota or rate limit, brief backoff before trying next model to let transient bursts clear
      const status = Number(err?.status || err?.statusCode || 0);
      const msg = (err?.message || '').toLowerCase();
      if (status === 429 || msg.includes('429') || msg.includes('quota') || msg.includes('resource_exhausted')) {
        if (i < models.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 800));
        }
      }
    }
  }

  const lastMsg = lastError?.message || '';
  if (lastMsg.includes('429') || lastMsg.toLowerCase().includes('quota')) {
    throw new Error('Gemini API quota is currently saturated. Please wait a brief moment before sending another prompt.');
  }
  throw new Error(`All Gemini models in fallback ladder failed. Last error: ${lastMsg || 'Unknown error'}`);
}

/**
 * Streaming Gemini generator with model fallback
 */
export async function* generateStreamWithFallback(options: ContentGenerationOptions): AsyncGenerator<{ text: string; modelUsed: string }, void, unknown> {
  const ai = getGeminiClient();
  const models = getModelFallbackLadder();
  let lastError: any = null;

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    let streamedAnyChunk = false;

    try {
      const stream = await ai.models.generateContentStream({
        model,
        contents: options.contents,
        config: {
          systemInstruction: options.systemInstruction,
          temperature: options.temperature ?? 0.7,
        },
      });

      for await (const chunk of stream) {
        if (chunk.text) {
          streamedAnyChunk = true;
          yield { text: chunk.text, modelUsed: model };
        }
      }
      return;
    } catch (err: any) {
      console.warn(`[Gemini Stream Fallback] Model ${model} failed:`, err?.message || err);
      lastError = err;

      // If we already sent chunks to the client, cannot switch model mid-stream
      if (streamedAnyChunk) {
        break;
      }

      const status = Number(err?.status || err?.statusCode || 0);
      const msg = (err?.message || '').toLowerCase();
      if (status === 429 || msg.includes('429') || msg.includes('quota') || msg.includes('resource_exhausted')) {
        if (i < models.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 800));
        }
      }
    }
  }

  const lastMsg = lastError?.message || '';
  if (lastMsg.includes('429') || lastMsg.toLowerCase().includes('quota')) {
    throw new Error('Gemini API quota is currently saturated. Please wait a brief moment before sending another prompt.');
  }
  throw new Error(`Gemini streaming generation failed across all models. Last error: ${lastMsg || 'Unknown'}`);
}

export function getSystemInstructionForMode(mode: string): string {
  const baseRules = `
SYSTEM ROLE:
You are ReflectAI, an intelligent, private, and deeply thoughtful AI reflection assistant.

CORE DIRECTIVES:
- Help users clarify their thoughts, unpack their experiences, recognize emotional undertones, and discover practical pathways forward.
- Be empathetic, concise, and articulate. Avoid clichéd platitudes or shallow cheerleading.
- IMPORTANT SAFETY BOUNDARY: Do NOT provide psychiatric or medical diagnoses. Present all reflections as personal, observational insights rather than clinical assessments.
- When appropriate, conclude with a single, gentle, high-impact inquiry to encourage deeper reflection.
`;

  switch (mode) {
    case 'Brainstorm':
      return `${baseRules}
MODE: BRAINSTORM
Your goal is lateral ideation. Offer 3-5 distinct perspectives, unconventional angles, or creative possibilities that the user might not have considered. Keep them concise and immediately actionable.`;

    case 'Summarize':
      return `${baseRules}
MODE: SUMMARIZE
Synthesize the core emotional and conceptual themes of the conversation. Highlight the overarching breakthrough, the primary source of tension, and the emergent next step.`;

    case 'Solve a Problem':
      return `${baseRules}
MODE: SOLVE A PROBLEM
Help deconstruct the user's dilemma into first principles. Identify the core friction point, separate controllable factors from uncontrollable ones, and suggest a 3-step structured resolution.`;

    case 'Plan':
      return `${baseRules}
MODE: PLAN
Transform reflective insights into concrete, sustainable momentum. Outline a realistic plan:
1. Immediate Action (Within 24 hours)
2. Weekly Rhythm (Habit or checkpoint)
3. Guardrail (How to overcome likely friction)`;

    case 'Ask Gemini':
      return `${baseRules}
MODE: ASK GEMINI
Engage as an intellectual thinking companion. Answer questions with nuance, depth, and clarity while keeping the focus centered on the user's journey.`;

    case 'Reflect':
    default:
      return `${baseRules}
MODE: REFLECT
Listen deeply. Mirror back the underlying emotions and unspoken assumptions with warm, psychological acuity. Ask one piercing question to help the user uncover what truly matters to them.`;
  }
}

/**
 * Generate an evocative session title based on the first turns of reflection
 * Uses fast Gemini call with fallback to heuristic phrase extraction.
 */
export async function generateSessionTitle(initialUserText: string): Promise<string> {
  if (!initialUserText || typeof initialUserText !== 'string') {
    return 'Personal Reflection';
  }

  // Heuristic title generator as instantaneous fallback
  const deriveFallbackTitle = (txt: string): string => {
    const cleaned = txt.replace(/["\n\r*#]/g, ' ').replace(/\s+/g, ' ').trim();
    const firstSentence = cleaned.split(/[.?!]/)[0].trim();
    const words = firstSentence.split(' ').slice(0, 6).join(' ');
    if (words.length > 3) {
      return words.charAt(0).toUpperCase() + words.slice(1);
    }
    return 'Reflective Session';
  };

  try {
    const prompt = `Analyze this opening reflection from a personal journal and produce a concise, elegant, evocative title (between 3 to 6 words).
DO NOT use quotation marks, punctuation, or generic titles like "Session 1" or "Daily Reflection".
Examples of good titles:
- Balancing College and Career Ambition
- Navigating Creative Impasse
- Rediscovering Focus Amidst Noise
- Overcoming Procrastination with Grace

User's reflection:
"${initialUserText.slice(0, 500)}"

Return ONLY the title text.`;

    const { text } = await generateContentWithFallback({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      temperature: 0.4,
    });

    const cleanTitle = text.replace(/["\n\r*#]/g, '').trim();
    if (cleanTitle.length > 0 && cleanTitle.length <= 60) {
      return cleanTitle;
    }
  } catch (err: any) {
    console.warn('Auto-titling fallback to heuristic due to error/quota:', err?.message || err);
  }

  return deriveFallbackTitle(initialUserText);
}

/**
 * Detect broad emotional themes and mood with fast heuristic categorization
 * and zero API quota consumption.
 */
export function detectMoodAndTheme(text: string): { mood: string; confidence: 'Low' | 'Medium' | 'High' } {
  if (!text || typeof text !== 'string') {
    return { mood: 'Reflective', confidence: 'Medium' };
  }

  const lower = text.toLowerCase();

  const patterns: Record<string, string[]> = {
    Stressed: [
      'overwhelm', 'anxious', 'anxiety', 'burnout', 'exhausted', 'pressure', 'panic',
      'stressed', 'chaotic', 'too much', 'breakdown', 'suffocating', 'drowning', 'tense',
      'deadline', 'sleepless', 'drained', 'fatigued'
    ],
    Frustrated: [
      'frustrat', 'annoyed', 'irritat', 'angry', 'stuck', 'furious', 'unfair', 'pissed',
      'blocked', 'roadblock', 'exasperat', 'hate that', 'sick of', 'fed up'
    ],
    Grateful: [
      'grateful', 'thankful', 'blessed', 'appreciat', 'lucky', 'gratitude', 'kindness',
      'heartwarming', 'touched', 'privilege', 'fortunate'
    ],
    Excited: [
      'excited', 'thrilled', "can't wait", 'energized', 'pumped', 'stoked', 'amazing',
      'incredible', 'ecstatic', 'looking forward', 'awesome', 'enthusiastic'
    ],
    Motivated: [
      'determined', 'ready to', 'driven', 'motivated', 'inspire', 'conquer', 'achieve',
      'momentum', 'push through', 'succeed', 'unstoppable', 'discipline', 'commit'
    ],
    Calm: [
      'peaceful', 'serene', 'relaxed', 'quiet', 'grounded', 'tranquil', 'still', 'rest',
      'centered', 'content', 'at ease', 'breathe', 'clarity'
    ],
    Focused: [
      'deep work', 'productive', 'coding', 'studying', 'flow state', 'concentrat',
      'clear-headed', 'priorities', 'execute', 'progress'
    ],
    Uncertain: [
      'confused', 'not sure', 'doubtful', 'lost', 'wondering', 'hesitant', 'indecisive',
      'dilemma', 'ambiguous', 'crossroads', 'unsure', 'skeptical', 'maybe'
    ],
    Reflective: [
      'thinking', 'noticing', 'journal', 'looking back', 'realize', 'lessons',
      'introspect', 'ponder', 'wonder', 'evaluate', 'reflect'
    ],
  };

  const scores: Record<string, number> = {};
  for (const [mood, keywords] of Object.entries(patterns)) {
    let score = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        score += 1;
      }
    }
    scores[mood] = score;
  }

  let bestMood = 'Reflective';
  let highestScore = 0;
  for (const [mood, score] of Object.entries(scores)) {
    if (score > highestScore) {
      highestScore = score;
      bestMood = mood;
    }
  }

  if (highestScore >= 2) {
    return { mood: bestMood, confidence: 'High' };
  } else if (highestScore === 1) {
    return { mood: bestMood, confidence: 'Medium' };
  }

  return { mood: 'Reflective', confidence: 'Medium' };
}

/**
 * Detect potential goals and actionable ambitions from user thoughts
 * using lightweight intent extraction (zero API quota consumption).
 */
export function detectPotentialGoal(text: string): string | null {
  if (!text || typeof text !== 'string') return null;

  const clean = text.trim();
  if (clean.length < 10) return null;

  const goalRegexes = [
    /(?:i want to|i need to|i'm going to|i am going to|my goal is to|i plan to|i aim to|i commit to|i decided to|i will)\s+([a-zA-Z0-9\s,–-]{10,80})/i,
    /(?:start|finish|complete|build|learn|implement|practice|establish)\s+([a-zA-Z0-9\s,–-]{8,70})/i,
  ];

  for (const regex of goalRegexes) {
    const match = clean.match(regex);
    if (match && match[1]) {
      const candidate = match[1].trim().replace(/[.,;!?]+$/, '');
      if (candidate.length >= 8 && candidate.length <= 90) {
        return candidate.charAt(0).toUpperCase() + candidate.slice(1);
      }
    }
  }

  return null;
}

/**
 * Generate structured session summary with graceful fallback
 */
export async function generateSessionSummary(transcript: string): Promise<{
  mainTopic: string;
  keyPoints: string[];
  potentialChallenges: string[];
  possibleNextSteps: string[];
  rawMarkdown: string;
}> {
  const prompt = `Review the following reflection session transcript between the user and ReflectAI:

${transcript.slice(0, 5000)}

Generate a structured summary following this exact JSON schema:
{
  "mainTopic": "Short paragraph outlining the central theme and emotional landscape.",
  "keyPoints": ["Key takeaway or insight 1", "Key takeaway 2", "Key takeaway 3"],
  "potentialChallenges": ["Challenge or psychological friction identified"],
  "possibleNextSteps": ["Actionable step 1", "Actionable step 2"]
}

Output strictly valid JSON only.`;

  try {
    const { text } = await generateContentWithFallback({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      temperature: 0.4,
    });

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[0]);
      const rawMarkdown = `### Session Summary\n\n**Main Topic**\n${data.mainTopic}\n\n**Key Points**\n${data.keyPoints?.map((p: string) => `• ${p}`).join('\n')}\n\n**Potential Challenges**\n${data.potentialChallenges?.map((c: string) => `• ${c}`).join('\n')}\n\n**Possible Next Steps**\n${data.possibleNextSteps?.map((s: string) => `• ${s}`).join('\n')}`;
      return {
        mainTopic: data.mainTopic || 'Reflective Exploration',
        keyPoints: Array.isArray(data.keyPoints) ? data.keyPoints : [],
        potentialChallenges: Array.isArray(data.potentialChallenges) ? data.potentialChallenges : [],
        possibleNextSteps: Array.isArray(data.possibleNextSteps) ? data.possibleNextSteps : [],
        rawMarkdown,
      };
    }
  } catch (err: any) {
    console.warn('Session summary AI call failed or hit quota, providing synthesized summary:', err?.message || err);
  }

  // Graceful structured summary fallback when quota is saturated
  const lines = transcript.split('\n').filter(l => l.trim().length > 0);
  const samplePoints = lines.slice(0, 3).map(l => l.slice(0, 80));
  return {
    mainTopic: 'Mindful session exploring current thoughts, challenges, and personal aspirations.',
    keyPoints: samplePoints.length > 0 ? samplePoints : ['Explored key personal priorities', 'Reflected on emotional landscape and clarity'],
    potentialChallenges: ['Navigating pacing and workload balance sustainably'],
    possibleNextSteps: ['Define one small actionable milestone to move forward with confidence'],
    rawMarkdown: '### Session Summary\n\n**Main Topic**\nMindful session exploring current thoughts, challenges, and personal aspirations.\n\n**Possible Next Steps**\n• Define one small actionable milestone to move forward with confidence',
  };
}
