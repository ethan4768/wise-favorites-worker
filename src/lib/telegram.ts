import { Favorite } from "../model";

export async function postToTelegram(telegramConfig: Record<string, string>, result: Favorite): Promise<boolean> {
  const botToken = telegramConfig.BOT_TOKEN;
  const channelId = telegramConfig.CHANNEL_ID;

  if (!botToken || !channelId) {
    return false;
  }

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        "chat_id": channelId,
        "text": getTelegramMessage(result),
        // "parse_mode": "Markdown"
      }),
    });
    return response.status == 200;
  } catch (error) {
    console.error(error);
    return false;
  }
}

function getTelegramMessage(favorite: Favorite): string {
  const hashTags = favorite.tags.map(tag => `#${tag.replace(/ /g, '-')}`).join(' ');
  return `${hashTags}\n\nURL:\n${favorite.url}\n\nDescription:\n${favorite.description}\n`
}