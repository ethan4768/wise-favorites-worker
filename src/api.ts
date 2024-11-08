import { Context, Hono } from "hono";
import { Bindings } from "./bindings";
import { sendToGithub } from "./lib/github";
import { linkPreview } from "./lib/link_preview";
import { getLLMResult } from "./lib/llm";
import { postToTelegram } from "./lib/telegram";
import { Favorite, RequestParam } from "./model";
import { slugify } from "./utils/slugify";

const api = new Hono<{ Bindings: Bindings }>();

api.post("/favorite", async c => {
  const params: RequestParam = await c.req.json();
  return await post(c, params);
});

async function post(c: Context<{ Bindings: Bindings }>, params: RequestParam) {
  const { url, title, description, timestamp, options } = params;

  if (!url) {
    return c.json({ code: 400, msg: "url param required" }, 400);
  }

  const favorite = new Favorite(url, title, description, timestamp, options);

  if (!title || !description) {
    const previewResult = await linkPreview(c.env.LINKPREVEW, url);
    console.log(previewResult);
    if ((!previewResult || !previewResult["title"]) && !title && !description) {
      return c.json({
        code: 50001,
        msg: "preview failed.",
        data: JSON.stringify(favorite),
      });
    }
    favorite.addPreviewResult(previewResult);
  }

  const llmResult = await getLLMResult(c.env.OPENAI, c.env.TAGS, favorite);
  if (llmResult) {
    favorite.addLLMResult(llmResult);
  }

  if (!favorite.slug) {
    favorite.slug = slugify(favorite.title);
  }

  if (options?.share?.telegram ?? true) {
    favorite.shared.telegram = await postToTelegram(c.env.TELEGRAM, favorite);
  }
  if (options?.share?.github ?? true) {
    favorite.shared.github = await sendToGithub(c.env.GITHUB, favorite);
  }

  return c.json({
    code: 0,
    msg: "succeeded",
    data: favorite,
  });
}

export default api;
