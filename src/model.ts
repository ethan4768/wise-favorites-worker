import { parse } from "date-fns";
import { z } from "zod";

export type RequestParam = {
  url: string,
  title?: string,
  description: string,
  category: string,
  timestamp: string,
  options?: {
    share: {
      telegram: boolean,
      github: boolean
    }
  }
}

export class Favorite {
  url: string;
  title: string;
  category: string;
  description: string;
  image: string;
  tags: string[] = [];
  shared: {
    telegram?: boolean;
    github?: boolean;
  };
  timestamp: Date

  constructor(url: string, title: string = "", description = "", category: string, timestamp: string) {
    this.url = url;
    this.title = title;
    this.description = description;
    this.category = category || "post";
    if (timestamp) {
      const formatString = "yyyy-MM-dd HH:mm:ss.SSS";
      this.timestamp = parse(timestamp, formatString, new Date());
    } else {
      this.timestamp = new Date()
    }
    this.shared = { telegram: false, github: false }
  }

  addPreviewResult(previewResult: JSON) {
    if (!this.title) {
      this.title = previewResult["title"]
    }
    if (!this.description) {
      this.description = previewResult["description"]
    }
    this.image = previewResult["image"]
    this.url = previewResult["url"]
  }

  addLLMResult(llmResult: LLMResult, overrideTitle: boolean) {
    this.tags = [...this.tags, ...llmResult.tags]
    if (overrideTitle) {
      this.title = llmResult.improved_title
    }
  }
}

export const LLMResultSchema = z.object({
  tags: z.array(z.string()),
  improved_title: z.string(),
});

export type LLMResult = z.infer<typeof LLMResultSchema>;
