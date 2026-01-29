import TelegramBot from 'node-telegram-bot-api';

const token = process.env.TELEGRAM_BOT_TOKEN as string;
const bot = new TelegramBot(token, { polling: false });

const CHANNELS = {
  announcements: '@TipRunAnnouncement'
} as const;

export async function sendChannelMessage(params: {
  channel?: string;
  text: string;
  parseMode?: 'HTML' | 'Markdown';
}): Promise<{ messageId: number }> {
  const result = await bot.sendMessage(params.channel || CHANNELS.announcements, params.text, {
    parse_mode: params.parseMode || 'HTML'
  });
  return { messageId: result.message_id };
}

export async function sendPhoto(params: {
  channel?: string;
  photoUrl: string;
  caption?: string;
}): Promise<{ messageId: number }> {
  const result = await bot.sendPhoto(params.channel || CHANNELS.announcements, params.photoUrl, {
    caption: params.caption,
    parse_mode: 'HTML'
  });
  return { messageId: result.message_id };
}
