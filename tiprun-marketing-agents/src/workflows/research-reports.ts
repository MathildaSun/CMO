import { ResearchAgent } from '../agents/research-agent.js';
import { db } from '../lib/database/index.js';
import { sendMessage } from '../lib/integrations/slack.js';

export async function runResearchReport(params: {
  topic: string;
  includeTweets?: boolean;
  depth?: 'quick' | 'standard' | 'deep';
}) {
  const report = await ResearchAgent.process({
    topic: params.topic,
    includeTweets: params.includeTweets ?? true,
    depth: params.depth || 'standard'
  });

  for (const cu of report.competitorUpdates) {
    await db.competitorIntelligence.create({
      competitor: cu.competitor,
      updateType: 'news',
      title: cu.update,
      details: undefined,
      source: report.sources[0],
      impact: 'medium',
      ourResponse: cu.ourResponse
    });
  }

  const summary = `🧠 Research Report: ${report.topic}\n\nKey Findings:\n${report.keyFindings.slice(0, 3).map((k, i) => `${i + 1}. ${k.finding} (${k.impact})`).join('\n')}\n\nTrends: ${report.trendingTopics.slice(0, 3).join(', ') || 'n/a'}\nRecommendations: ${report.recommendations.slice(0, 2).join(' | ')}`;
  await sendMessage({ channel: 'updates', text: summary });

  return report;
}
