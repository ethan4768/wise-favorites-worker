
export class FavoriteResult {
  title: string;
  description: string;
  image: string;
  url: string;
  tags: string[] = [];
  shared: {
    telegram: boolean;
    d1: boolean;
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