import { TZDate } from "@date-fns/tz";
import { format, formatISO } from "date-fns";
import { Buffer } from "node:buffer";
import { Favorite } from "../model";

export async function sendToGithub(
  githubConfig: Record<string, string>,
  favorite: Favorite,
): Promise<boolean> {
  const accessToken = githubConfig["ACCESS_TOKEN"];
  const owner = githubConfig["OWNER"];
  const repo = githubConfig["REPO"];

  if (!accessToken || !owner || !repo) {
    return false;
  }

  try {
    const filePath = getFilepath(favorite);
    const response = await getContentOrCreate({
      accessToken,
      owner,
      repo,
      filePath: filePath,
    });
    const data = await response.json();
    const content = Buffer.from(data.content ?? "", "base64").toString();

    const message = getCommitMessage(favorite);
    const newContent = generateFileContent(favorite);
    const updatedContent = Buffer.from(`${newContent}\n${content}`).toString(
      "base64",
    );

    const writeResult = await writeContent({
      accessToken,
      owner,
      repo,
      filePath,
      previousSha: data.sha,
      message: message,
      content: updatedContent,
    });
    if (writeResult.ok) {
      return true;
    } else {
      console.error(writeResult);
    }
  } catch (error) {
    console.error(error);
  }
  return false;
}

async function getContentOrCreate({ accessToken, owner, repo, filePath }) {
  let response = await getContent({ accessToken, owner, repo, filePath });

  // create if not exists
  if (response.status === 404) {
    console.log(`[rest-api] ${filePath} does not exist, create it`);
    const writeResult = await writeContent({
      accessToken,
      owner,
      repo,
      filePath,
      previousSha: undefined,
      message: `[skip ci]create file: ${filePath}`,
      content: "",
    });
    if (!writeResult.ok) {
      throw new Error("create-contents-failed");
    }
  }

  // 重新获取一次，因为更新需要 sha
  return getContent({ accessToken, owner, repo, filePath });
}

async function writeContent({
                              accessToken,
                              owner,
                              repo,
                              filePath,
                              previousSha,
                              message,
                              content,
                            }) {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;

  return fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "X-GitHub-Api-Version": "2022-11-28",
      Accept: "application/vnd.github+json",
      "User-Agent": "wise-favorites-worker",
    },
    body: JSON.stringify({
      message: message,
      sha: previousSha,
      content: content,
    }),
  });
}

async function getContent({ accessToken, owner, repo, filePath }) {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;

  return fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "X-GitHub-Api-Version": "2022-11-28",
      Accept: "application/vnd.github+json",
      "User-Agent": "wise-favorites-worker",
    },
  });
}

function getFilepath(favorite: Favorite) {
  const currentMonth = format(favorite.timestamp, "yyyy-MM");
  return `src/content/bookmarks/${currentMonth}/${favorite.slug}.md`;
}

function getCommitMessage(favorite: Favorite) {
  const body = getJSON(favorite);
  const arsp = favorite.arsp ?? false;
  const actionFlag = arsp ? "[ARSP]" : "[skip actions]";
  return `[API][bookmark]${actionFlag} ${favorite.title}\n\n${JSON.stringify(body)}`;
}

function generateFileContent(favorite: Favorite) {
  const metadata = favorite.arsp
    ? `[原文链接](${favorite.url}) | [原文内容](../raw/${favorite.slug}) | [AI 总结](../summary/${favorite.slug})`
    : `[原文链接](${favorite.url})`;

  return `---
title: ${favorite.title}
slug: ${favorite.slug}
description: ${favorite.description}
tags: \n${favorite.tags.map(tag => `  - ${tag}`).join('\n')}
pubDatetime: ${formatISO(new TZDate(favorite.timestamp, "Asia/Shanghai"))}
ogImage: ${favorite.image}
---

${metadata}

---

${favorite.content}
`;
}

function getJSON(favorite: Favorite) {
  const dateWithTimeZone = new TZDate(favorite.timestamp, "Asia/Shanghai");
  return {
    title: favorite.title,
    url: favorite.url,
    slug: favorite.slug,
    description: favorite.description,
    tags: favorite.tags,
    image: favorite.image,
    timestamp: formatISO(dateWithTimeZone),
  };
}