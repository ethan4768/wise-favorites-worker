import {CommaSeparatedListOutputParser} from "@langchain/core/output_parsers";
import {PromptTemplate} from "@langchain/core/prompts";
import {RunnableSequence} from "@langchain/core/runnables";
import {ChatOpenAI} from "@langchain/openai";
import {Context, Hono} from 'hono';
import {Bindings} from './bindings'
import {randomId} from "./lib/id";
import {FavoriteResult} from "./model";

const api = new Hono<{ Bindings: Bindings }>()

api.post('/favorite', async (c) => {
  const requestJson = await c.req.json()
  const url = requestJson["url"]
  return await favorite(c, url)
})

export async function favorite(c: Context<{ Bindings: Bindings }>, url: string) {
  if (!url) {
    return c.json({code: 400, msg: "url param required"}, 400)
  }

  const result = new FavoriteResult(url)

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

  const d1Result = await saveToDB(c.env.DB, result);

  result.shared = {telegram: telegramResult, d1: d1Result}

  return c.json({
    "code": 0,
    "msg": "succeeded",
    "data": result
  })

}

export async function linkPreview(linkPreviewConfig: Record<string, string>, url: string): Promise<JSON> {
  const apiKey = linkPreviewConfig["API_KEY"]
  try {
    const linkPreviewUrl = `https://api.linkpreview.net/?q=${encodeURIComponent(url)}`
    const response = await fetch(linkPreviewUrl, {
      headers: {'X-Linkpreview-Api-Key': apiKey}
    });
    return response.json()
  } catch (error) {
    console.error(error)
    return null;
  }
}

export async function aiTags(openAIConfig: Record<string, string>, presetTags: string[], linkPreviewFormat: string): Promise<string[]> {
  const model = new ChatOpenAI(
    {apiKey: openAIConfig["API_KEY"], model: openAIConfig["MODEL"]},
    {baseURL: openAIConfig["BASE_PATH"]}
  );
  try {
    const parser = new CommaSeparatedListOutputParser();
    const prompt = new PromptTemplate({
      template: "What tags would you suggest me to add to this post? Select 2-5 items with the highest relevance from the list: {preset_tags} \n{format_instructions}\n{post}\n",
      inputVariables: ["preset_tags", "post"],
      partialVariables: {"format_instructions": parser.getFormatInstructions()},
    });

    const chain = RunnableSequence.from([
      prompt,
      model,
      parser,
    ]);

    console.log(parser.getFormatInstructions())
    return await chain.invoke({"preset_tags": presetTags, "post": linkPreviewFormat});
  } catch (error) {
    console.error(error)
    return null;
  }
}

export async function postToTelegram(telegramConfig: Record<string, string>, message: string): Promise<boolean> {
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

export async function saveToDB(db: D1Database, result: FavoriteResult): Promise<boolean> {
  const favoriteId = randomId()
  const favoriteSql = 'INSERT INTO favorite ("id", "url", "title", "description", "image") VALUES (?, ?, ?, ?, ?)'
  const favoriteTagSql = 'INSERT INTO "favorite_tags" ("favorite_id", "tag") VALUES (?, ?)'
  const favoriteTagBinds = result.tags.map(tag => [favoriteId, tag])
  try {
    let favoriteStmt = db.prepare(favoriteSql).bind(favoriteId, result.url, result.title, result.description, result.image)
    const favoriteTagStmt = db.prepare(favoriteTagSql)
    const favoriteTagStatements = favoriteTagBinds.map(bind => favoriteTagStmt.bind(...bind))
    const results = await db.batch([favoriteStmt, ...favoriteTagStatements])

    return results.every(r => r.success);
  } catch (e) {
    console.error(e)
    return false
  }
}

export default api