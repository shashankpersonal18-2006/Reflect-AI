import { Router, Response } from 'express';
import { AuthenticatedRequest, requireAuth } from '../auth';

const router = Router();

// Export user reflections and goals as JSON or Markdown
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const format = req.body?.format === 'markdown' ? 'markdown' : 'json';
    const sessions = req.body?.sessions || [];
    const goals = req.body?.goals || [];

    if (format === 'json') {
      const exportData = {
        exportedAt: new Date().toISOString(),
        user: {
          uid: user.uid,
          email: user.email,
          name: user.name,
        },
        metadata: {
          totalSessions: sessions.length,
          totalGoals: goals.length,
          application: 'ReflectAI — Private AI Journal & Reflection Assistant'
        },
        sessions,
        goals,
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="reflectai-export-${new Date().toISOString().split('T')[0]}.json"`);
      return res.json(exportData);
    } else {
      // Markdown format
      let md = `# ReflectAI — Personal Journal & Reflections Export\n`;
      md += `**Export Date**: ${new Date().toLocaleDateString()}\n`;
      md += `**User**: ${user.name || user.email}\n\n`;
      md += `---\n\n`;

      md += `## 1. Personal Goals (${goals.length})\n\n`;
      if (goals.length === 0) {
        md += `*No active goals recorded.*\n\n`;
      } else {
        goals.forEach((g: any) => {
          const status = g.status === 'completed' ? '[x]' : '[ ]';
          md += `- ${status} **${g.title}** (${g.progress || 0}%)\n`;
          if (g.description) {
            md += `  > ${g.description}\n`;
          }
        });
        md += `\n`;
      }

      md += `## 2. Journal Reflections (${sessions.length})\n\n`;
      if (sessions.length === 0) {
        md += `*No reflection sessions found.*\n\n`;
      } else {
        sessions.forEach((s: any, idx: number) => {
          md += `### ${idx + 1}. ${s.title || 'Untitled Session'}\n`;
          md += `*Date: ${s.createdAt ? new Date(s.createdAt).toLocaleString() : 'Unknown'} | Mood: ${s.mood || 'Unspecified'}*\n\n`;

          if (s.summary && typeof s.summary === 'object') {
            md += `#### AI Summary\n`;
            md += `**Main Topic**: ${s.summary.mainTopic || 'N/A'}\n\n`;
            if (Array.isArray(s.summary.keyPoints) && s.summary.keyPoints.length > 0) {
              md += `**Key Points**:\n`;
              s.summary.keyPoints.forEach((kp: string) => {
                md += `- ${kp}\n`;
              });
              md += `\n`;
            }
            if (Array.isArray(s.summary.possibleNextSteps) && s.summary.possibleNextSteps.length > 0) {
              md += `**Possible Next Steps**:\n`;
              s.summary.possibleNextSteps.forEach((ns: string) => {
                md += `- ${ns}\n`;
              });
              md += `\n`;
            }
          }

          if (Array.isArray(s.messages) && s.messages.length > 0) {
            md += `#### Conversation\n\n`;
            s.messages.forEach((m: any) => {
              const speaker = m.role === 'assistant' ? '🤖 ReflectAI' : '👤 Me';
              md += `**${speaker}** (${m.mode || 'Reflection'}):\n${m.content}\n\n`;
            });
          }

          md += `---\n\n`;
        });
      }

      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="reflectai-export-${new Date().toISOString().split('T')[0]}.md"`);
      return res.send(md);
    }
  } catch (error: any) {
    console.error('Error during data export:', error);
    return res.status(500).json({ error: error?.message || 'Failed to export journal data' });
  }
});

export default router;
