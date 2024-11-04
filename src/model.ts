import { parse } from "date-fns";
import { z } from "zod";

export type RequestParam = {
  url: string;
  title?: string;
  description: string;
  timestamp: string;
  options?: {
    arsp: boolean; // Automatically retrieve and summarize posts
    share: {
      telegram: boolean;
      github: boolean;
    };
  };
};

export class Favorite {
  url: string;
  title: string;
  slug: string;
  description: string;
  arsp: boolean;
  image: string;
  tags: string[] = [];
  shared: {
    telegram?: boolean;
    github?: boolean;
  };
  timestamp: Date;

  constructor(
    url: string,
    title: string = "",
    description = "",
    timestamp: string,
    options: Record<string, any>,
  ) {
    this.url = url;
    this.title = title;
    this.description = description;
    if (timestamp) {
      const formatString = "yyyy-MM-dd HH:mm:ss.SSS";
      this.timestamp = parse(timestamp, formatString, new Date());
    } else {
      this.timestamp = new Date();
    }
    this.arsp = options?.arsp ?? false;
    this.shared = { telegram: false, github: false };
  }

  addPreviewResult(previewResult: JSON) {
    if (!this.title) {
      this.title = previewResult["title"];
    }
    if (!this.description) {
      this.description = previewResult["description"];
    }
    this.image = previewResult["image"];
    if (previewResult["url"]) {  // 有些页面会被 forbidden
      this.url = previewResult["url"];
    }
  }

  addLLMResult(llmResult: LLMResult) {
    this.tags = [...this.tags, ...llmResult.tags];
    this.slug = llmResult.slug;
    this.title = llmResult.improved_title;
    this.description = llmResult.improved_description;
  }
}

export const LLMResultSchema = z.object({
  tags: z.array(z.string()),
  slug: z.string(),
  improved_title: z.string(),
  improved_description: z.string(),
});

export type LLMResult = z.infer<typeof LLMResultSchema>;
