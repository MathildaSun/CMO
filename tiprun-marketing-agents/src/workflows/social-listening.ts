import { SocialListeningAgent, type RawMention } from '../agents/social-listening-agent.js';
import { db } from '../lib/database/index.js';
import { scrapeTweets } from '../lib/integrations/apify.js';
import { sendMessage } from '../lib/integrations/slack.js';

export async function runDailySocialListening(date?: string) {
  const today = date || new Date().toISOString().split('T')[0];

  const brandMentions = await scrapeTweets({
    searchTerms: ['TipRun', 'tiprun.io', '@TipRun_Markets', '@tiprun_markets'],
    maxTweets: 80,
    sort: 'Latest'
  });

  const competitorMentions = await scrapeTweets({
    searchTerms: ['Dream11', 'MPL fantasy', 'Polymarket cricket', 'Kalshi cricket', '#IPL2026'],
    maxTweets: 120,
    sort: 'Latest'
  });

  const analysis = await SocialListeningAgent.analyze({
    brandMentions: brandMentions as RawMention[],
    competitorMentions: competitorMentions as RawMention[],
    date: today
  });

  await db.socialListeningReports.create({
    reportDate: today,
    brandMentions: analysis.brandMentions.total,
    sentimentPositive: analysis.brandMentions.positive,
    sentimentNeutral: analysis.brandMentions.neutral,
    sentimentNegative: analysis.brandMentions.negative,
    sentimentScore: analysis.sentimentScore,
    topMentions: analysis.topMentions,
    competitorActivity: analysis.competitorActivity,
    trendingTopics: analysis.trendingTopics,
    alerts: analysis.alerts,
    recommendations: analysis.recommendations,
    fullReport: analysis.fullReport
  });

  const summaryMessage = `📊 Daily Social Listening Report - ${today}\n\nBrand Mentions: ${analysis.brandMentions.total}\n• Positive: ${analysis.brandMentions.positive}\n• Neutral: ${analysis.brandMentions.neutral}\n• Negative: ${analysis.brandMentions.negative}\n\nSentiment Score: ${analysis.sentimentScore}/10\n\nTop Trends: ${analysis.trendingTopics.slice(0, 3).join(', ') || 'n/a'}\n\n${analysis.alerts.length > 0 ? `⚠️ Alerts: ${analysis.alerts.length}` : '✅ No alerts' }\n\nRecommendations:\n${analysis.recommendations.slice(0, 3).map((r, i) => `${i + 1}. ${r}`).join('\n')}`;

  await sendMessage({ channel: 'updates', text: summaryMessage });

  for (const alert of analysis.alerts) {
    await sendMessage({ channel: 'alerts', text: `⚠️ Alert: ${alert.type}\n${alert.details}\n\nRecommended: ${alert.recommendedAction}` });
  }

  return analysis;
}
