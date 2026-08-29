import { Router, Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest, requireAuth } from '../auth';
import {
  generateContentWithFallback,
  generateStreamWithFallback,
  getSystemInstructionForMode,
  generateSessionTitle,
  detectMoodAndTheme,
  detectPotentialGoal,
  generateSessionSummary,
} from '../gemini';

const router = Router();

const chatSchema = z.object({
  sessionId: z.string().optional(),
  message: z.string().min(1, 'Message cannot be empty').max(10000, 'Message exceeds 10,000 character limit'),
  mode: z.enum(['Reflect', 'Brainstorm', 'Summarize', 'Solve a Problem', 'Plan', 'Ask Gemini']).default('Reflect'),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().max(10000),
  })).optional().default([]),
  stream: z.boolean().optional().default(false),
  isFirstMessage: z.boolean().optional().default(false),
});

// Chat endpoint (supports streaming or single response)
router.post('/chat', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rawBody = (req.body && typeof req.body === 'object') ? req.body : {};
    const parseResult = chatSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Invalid input', details: parseResult.error.issues });
    }

    const { message, mode, history, stream, isFirstMessage } = parseResult.data;

    const contents = [
      ...history.map((h) => ({
        role: h.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: h.content }],
      })),
      { role: 'user', parts: [{ text: message }] },
    ];

    const systemInstruction = getSystemInstructionForMode(mode);

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      let fullResponseText = '';
      let modelUsed = 'gemini-3.6-flash';

      try {
        const streamGen = generateStreamWithFallback({
          contents,
          systemInstruction,
        });

        for await (const chunk of streamGen) {
          modelUsed = chunk.modelUsed;
          fullResponseText += chunk.text;
          res.write(`data: ${JSON.stringify({ type: 'chunk', text: chunk.text, modelUsed })}\n\n`);
        }

        // Fast zero-quota mood & goal detection + title generation on first message
        const moodInfo = detectMoodAndTheme(message);
        const detectedGoal = detectPotentialGoal(message);
        const generatedTitle = isFirstMessage ? await generateSessionTitle(message) : null;

        res.write(`data: ${JSON.stringify({
          type: 'done',
          text: fullResponseText,
          modelUsed,
          generatedTitle,
          moodInfo,
          detectedGoal,
        })}\n\n`);
        res.end();
      } catch (streamErr: any) {
        console.error('Streaming error in chat route:', streamErr);
        const errMessage = streamErr?.message || 'Generation error';
        res.write(`data: ${JSON.stringify({ type: 'error', error: errMessage })}\n\n`);
        res.end();
      }
    } else {
      const { text, modelUsed } = await generateContentWithFallback({ contents, systemInstruction });
      const moodInfo = detectMoodAndTheme(message);
      const detectedGoal = detectPotentialGoal(message);
      const generatedTitle = isFirstMessage ? await generateSessionTitle(message) : null;

      return res.json({
        text,
        modelUsed,
        generatedTitle,
        moodInfo,
        detectedGoal,
      });
    }
  } catch (error: any) {
    console.error('Error in /api/ai/chat:', error);
    return res.status(500).json({ error: error?.message || 'Failed to process AI chat reflection' });
  }
});

// Summarize session endpoint
router.post('/summarize', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const transcript = req.body?.transcript;
    if (!transcript || typeof transcript !== 'string') {
      return res.status(400).json({ error: 'Transcript string is required' });
    }

    const summary = await generateSessionSummary(transcript);
    return res.json(summary);
  } catch (error: any) {
    console.error('Error in /api/ai/summarize:', error);
    return res.status(500).json({ error: error?.message || 'Failed to generate session summary' });
  }
});

// Brainstorm endpoint
router.post('/brainstorm', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prompt = req.body?.prompt;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Brainstorm prompt string is required' });
    }

    const systemInstruction = getSystemInstructionForMode('Brainstorm');
    const { text, modelUsed } = await generateContentWithFallback({
      systemInstruction,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      temperature: 0.8,
    });

    return res.json({ text, modelUsed });
  } catch (error: any) {
    console.error('Error in /api/ai/brainstorm:', error);
    return res.status(500).json({ error: error?.message || 'Failed to brainstorm ideas' });
  }
});

// Auto-Title endpoint
router.post('/title', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const text = req.body?.text;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required for titling' });
    }
    const title = await generateSessionTitle(text);
    return res.json({ title });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Failed to generate title' });
  }
});

// Insights generation endpoint across reflections
router.post('/insights', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const snippets = req.body?.snippets;
    if (!Array.isArray(snippets) || snippets.length === 0) {
      return res.json({
        mostDiscussedTopics: [
          { topic: 'Mindful Reflection', count: 1, percentage: 100 }
        ],
        commonThemes: ['Consistency', 'Self-Awareness', 'Goal Alignment'],
        recentInsights: [
          'Setting small, continuous milestones builds sustainable self-trust.'
        ],
        lastGeneratedAt: new Date().toISOString(),
      });
    }

    const prompt = `Analyze these personal reflection snippets:
${snippets.slice(0, 15).map((s, i) => `[Entry ${i + 1}]: ${s.slice(0, 300)}`).join('\n\n')}

Synthesize the data into this exact JSON format:
{
  "mostDiscussedTopics": [
    {"topic": "Productivity", "count": 4, "percentage": 40},
    {"topic": "Learning & Tech", "count": 3, "percentage": 30}
  ],
  "commonThemes": ["Time Management", "Consistency", "Routine Simplification"],
  "recentInsights": [
    "Breaking large goals into smaller tasks may make your routine easier to maintain.",
    "Acknowledging creative fatigue early helps prevent burnout."
  ]
}
IMPORTANT: Present these as observational themes, not clinical judgments. Output ONLY valid JSON.`;

    const { text } = await generateContentWithFallback({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      temperature: 0.3,
    });

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[0]);
      return res.json({
        mostDiscussedTopics: data.mostDiscussedTopics || [],
        commonThemes: data.commonThemes || [],
        recentInsights: data.recentInsights || [],
        lastGeneratedAt: new Date().toISOString(),
      });
    }

    return res.json({
      mostDiscussedTopics: [{ topic: 'Daily Clarity', count: 1, percentage: 100 }],
      commonThemes: ['Focus', 'Perspective'],
      recentInsights: ['Reflecting regularly turns experiences into wisdom.'],
      lastGeneratedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error in /api/ai/insights:', error);
    return res.status(500).json({ error: error?.message || 'Failed to synthesize reflection insights' });
  }
});

export default router;
