import OpenAI from "openai";
import { Favorite, LLMResult } from "../model";


export async function getLLMResult(openAIConfig: Record<string, string>, presetTags: string[], favorite: Favorite): Promise<LLMResult> {
  const openai = new OpenAI({
    baseURL: openAIConfig["BASE_PATH"],
    apiKey: openAIConfig["API_KEY"]
  });

  const systemPrompt = `
    generate tags and an improved title based on given URL, title, and description.

    tags: Select 2-5 of the most relevant tags from the following preset list: ${presetTags}, and feel free to add more if needed. 
    improved_title: Respond in Chinese, should be no longer than 30 words

    Respond directly in JSON format, without using Markdown code blocks or any other formatting, the JSON schema should include tags, improved_title.
    Example:
    {
      "tags": ["AI", "dev", "tool", "writing"],
      "improved_title": "Effective Prompt Engineering"
    }
  `

  const userMessage = `
    url: ${favorite.url}
    title: ${favorite.title}
    description: ${favorite.description}
  `

  try {
    const completion = await openai.chat.completions.create({
      model: openAIConfig["MODEL"],
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: userMessage
        },
      ],
      response_format: { "type": "json_object" },
    });

    const response = completion.choices[0].message.content;
    console.log(response);
    const result: LLMResult = JSON.parse(response)
    result.tags = (result.tags ?? [])
      .map(tag => tag.replace(/\s+/g, '-')) // 将空格替换为 -
      .filter(tag => tag.length <= 20); // 过滤掉字符数超过 20 的 tag；防止某些大模型给出不标准的答案
    return result
  } catch (e) {
    console.error("An error occurred: ", e.message);
  }
}
