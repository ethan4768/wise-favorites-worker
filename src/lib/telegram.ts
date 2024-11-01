import { Favorite } from "../model";

export async function postToTelegram(
  telegramConfig: Record<string, string>,
  result: Favorite
): Promise<boolean> {
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
        chat_id: channelId,
        text: toTelegramFormat(result),
        // "parse_mode": "Markdown"
      }),
    });
    return response.status == 200;
  } catch (error) {
    console.error(error);
    return false;
  }
}

function toTelegramFormat(favorite: Favorite): string {
  const hashTags = favorite.tags
    .map(tag => `#${tag.replace(/ /g, "-")}`)
    .join(" ");
  const fixupXUrl = favorite.url
    .replace("x.com", "fixupx.com")
    .replace("twitter.com", "fxtwitter.com");
  return `${hashTags}\n\nURL:\n${fixupXUrl}\n\nTitle:\n${favorite.title}\n\nDescription:\n${favorite.description}\n`;
}
