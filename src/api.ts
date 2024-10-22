import { Context, Hono } from 'hono';
import { Bindings } from './bindings';
import { sendToGithub } from "./lib/github";
import { linkPreview } from './lib/link_preview';
import { getLLMResult } from "./lib/llm";
import { postToTelegram } from './lib/telegram';
import { Favorite, RequestParam } from "./model";

const api = new Hono<{ Bindings: Bindings }>()

api.post('/favorite', async (c) => {
  const params: RequestParam = await c.req.json()
  return await post(c, params)
})

async function post(c: Context<{ Bindings: Bindings }>, params: RequestParam) {
  const { url, title, description, category, timestamp, options } = params

  if (!url) {
    return c.json({ code: 400, msg: "url param required" }, 400)
  }

  const favorite = new Favorite(url, title, description, category, timestamp)

  if (!title || !description) {
    const previewResult = await linkPreview(c.env.LINKPREVEW, url)
    if ((!previewResult || !previewResult["title"]) && (!title && !description)) {
      return c.json({
        "code": 50001,
        "msg": "preview failed.",
        "data": JSON.stringify(favorite)
      })
    }
    favorite.addPreviewResult(previewResult)
  }
  
  const llmResult = await getLLMResult(c.env.OPENAI, c.env.TAGS, favorite)
  if (llmResult) {
    const overrideTitle = shouldOverrideTitle(url, c.env.OVERRIDE_TITLE_DOMAINS)
    favorite.addLLMResult(llmResult, overrideTitle)
  }

  if (options?.share?.telegram ?? true) {
    favorite.shared.telegram = await postToTelegram(c.env.TELEGRAM, favorite)
  }
  if (options?.share?.github ?? true) {
    favorite.shared.github = await sendToGithub(c.env.GITHUB, favorite)
  }

  return c.json({
    "code": 0,
    "msg": "succeeded",
    "data": favorite
  })
}

function shouldOverrideTitle(url: string, overrideTitleDomains: string[]): boolean {
  try {
    const parsedUrl = new URL(url);
    return overrideTitleDomains.some(domain => parsedUrl.hostname === domain || parsedUrl.hostname.endsWith('.' + domain));
  } catch (error) {
    return false;
  }
}

export default api