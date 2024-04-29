import { CommaSeparatedListOutputParser } from "@langchain/core/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { ChatOpenAI } from "@langchain/openai";
import { Hono } from 'hono';

const app = new Hono()

class FavoriteResult {
  title: string;
  description: string;
  image: string;
  url: string;
  tags: string[] = [];
  shared: {
    telegram: boolean;
  };
  constructor(url: string) {
    this.url = url;
  }

  addPreviewResult(previewResult: JSON) {
    this.title = previewResult["title"]
    this.description = previewResult["description"]
    this.image = previewResult["image"]
    this.url = previewResult["url"]
  }

  addTags(tags: string[]) {
    this.tags = [...this.tags, ...tags]
  }

  toTelegramMessage(): string {
    const hashTags = this.tags.map(tag => `#${tag.replace(/ /g, '-')}`).join(' ');
    return `${hashTags}\n\nURL:\n${this.url}\n\nDescription:\n${this.description}\n`
  }
}

app.post('/favorite', async (c) => {
  const requestJson = await c.req.json()
  const url = requestJson["url"]
  return await favorite(c, url)
})

export const favorite = async (c, url) => {
  if (!url) {
    return c.json({ code: 400, msg: "url param required" }, 400)
  }

  const result = new FavoriteResult(url = url)

  const previewResult = await linkPreview(c.env.LINKPREVEW, url)
  if (!previewResult || !previewResult["title"]) {
    return c.json({
      "code": 50001,
      "msg": "preview failed.",
      "data": JSON.stringify(result)
    })
  }
  result.addPreviewResult(previewResult)

  const tags = await aiTags(c.env.OPENAI, c.env.TAGS, JSON.stringify(previewResult))
  if (tags) {
    result.addTags(tags)
  }

  const telegramResult = await postToTelegram(c.env.TELEGRAM, result.toTelegramMessage())
  result.shared = { "telegram": telegramResult }
  return c.json({
    "code": 0,
    "msg": "succeeded",
    "data": result
  })
}

export const linkPreview = async (linkPreviewConfig, url: string): Promise<JSON> => {
  const apiKey = linkPreviewConfig["API_KEY"]
  try {
    const linkPreviewUrl = `https://api.linkpreview.net/?q=${encodeURIComponent(url)}`
    const response = await fetch(linkPreviewUrl, {
      headers: { 'X-Linkpreview-Api-Key': apiKey }
    });
    return response.json()
  } catch (error) {
    console.error(error)
    return null;
  }
}

export const aiTags = async (openAIConfig, presetTags, linkPreviewFormat) => {
  const model = new ChatOpenAI(
    { apiKey: openAIConfig["API_KEY"], model: openAIConfig["MODEL"] },
    { baseURL: openAIConfig["BASE_PATH"] }
  );
  try {
    const parser = new CommaSeparatedListOutputParser();
    const prompt = new PromptTemplate({
      template: "What tags would you suggest me to add to this post? Select 2-5 items with the highest relevance from the list: {preset_tags} \n{format_instructions}\n{post}\n",
      inputVariables: ["preset_tags", "post"],
      partialVariables: { "format_instructions": parser.getFormatInstructions() },
    });

    const chain = RunnableSequence.from([
      prompt,
      model,
      parser,
    ]);

    console.log(parser.getFormatInstructions())
    const response = await chain.invoke({ "preset_tags": presetTags, "post": linkPreviewFormat });
    return response;
  } catch (error) {
    console.error(error)
    return null;
  }
}

export const postToTelegram = async (telegramConfig, message) => {
  const botToken = telegramConfig.BOT_TOKEN
  const channelId = telegramConfig.CHANNEL_ID

  if (!botToken || !channelId) {
    return false
  }

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        "chat_id": channelId,
        "text": message,
        // "parse_mode": "Markdown"
      }),
    });
    return response.status == 200
  } catch (error) {
    console.error(error)
    return false
  }
}

export default app