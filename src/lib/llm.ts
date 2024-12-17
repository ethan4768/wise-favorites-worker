import OpenAI from "openai";
import { Favorite, LLMResult } from "../model";
import { slugify } from "../utils/slugify";

export async function getLLMResult(
  openAIConfig: Record<string, string>,
  presetTags: string[],
  favorite: Favorite
): Promise<LLMResult> {
  if (!openAIConfig["BASE_PATH"] || !openAIConfig["API_KEY"]) {
    return null
  }

  const openai = new OpenAI({
    baseURL: openAIConfig["BASE_PATH"],
    apiKey: openAIConfig["API_KEY"],
  });

  const systemPrompt = `
generate tags, slug, an improved title, an improved description, an improved content based on given URL, title, description and content

tags: Select 2-5 of the most relevant tags from the following preset list: ${presetTags}, and feel free to add more if needed, every tag should not have any hyphens
slug: url friendly
improved_title: Respond in Chinese, retain proper nouns such as prompt, AI, LLM, should be no longer than 60 words
improved_description: Respond in Chinese, retain proper nouns such as prompt, AI, LLM, should be no longer than 160 words
improved_content: Generate improved content if content not provided, respond in Chinese, retain proper nouns such as prompt, AI, LLM, as detailed as possible, without missing any information

Respond directly in JSON format, without using Markdown code blocks or any other formatting, the JSON schema should include tags, slug, improved_title, improved_description
Example:
{
  "tags": ["AI", "dev", "tool", "writing"],
  "slug": "effective-prompt-engineering",
  "improved_title": "微软开源 OmniParser：解析和识别屏幕上可交互图标的工具",
  "improved_description": "微软开源了一款可以解析和识别屏幕上可交互图标的工具：OmniParser，它能准确的识别出用户界面中的可交互图标，在解析方面优于 GPT-4V",
  "improved_content": "微软开源了一款可以解析和识别屏幕上可交互图标的工具：OmniParser，它能准确的识别出用户界面中的可交互图标，在解析方面优于 GPT-4V\n特点：\n1、双重识别能力，能找出界面上所有可以点击的地方，具备语义理解能力，能理解按钮或图标的具体功能\n2、可以作为插件，与 Phi-3.5-V、Llama-3.2-V 以及其他模型结合使用\n3、支持结构化输出，除了识别屏幕上的元素，还能将这些元素转换成结构化的数据\ngithub：https://github.com/microsoft/OmniParser\n项目：https://microsoft.github.io/OmniParser/"
}
`;

  const userMessage = `
url: ${favorite.url}
title: ${favorite.title}
description: ${favorite.description}
content: 
---
${favorite.content}
`;

  try {
    const completion = await openai.chat.completions.create({
      model: openAIConfig["MODEL"],
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userMessage,
        },
      ],
      response_format: { type: "json_object" },
    });

    const response = completion.choices[0].message.content;
    console.log(response);
    const result: LLMResult = JSON.parse(response);
    result.tags = (result.tags ?? [])
      .map(tag => slugify(tag)) // 将空格替换为 -
      .filter(tag => tag.length <= 20); // 过滤掉字符数超过 20 的 tag；防止某些大模型给出不标准的答案
    return result;
  } catch (e) {
    console.error("Cannot request llm, ", e.message);
  }
}
