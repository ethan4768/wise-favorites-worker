import { TZDate } from "@date-fns/tz";
import { format, formatISO } from "date-fns";
import { Buffer } from 'node:buffer';
import { Favorite } from "../model";

export async function sendToGithub(githubConfig: Record<string, string>, favorite: Favorite): Promise<boolean> {
  const accessToken = githubConfig["ACCESS_TOKEN"]
  const owner = githubConfig["OWNER"]
  const repo = githubConfig["REPO"]

  if (!accessToken || !owner || !repo) {
    return false
  }

  try {
    const filePath = getFilepath(favorite)
    const response = await getContentOrCreate({ accessToken, owner, repo, filePath: filePath });
    const data = await response.json()
    const content = Buffer.from(data.content ?? "", 'base64').toString();

    const message = getCommitMessage(favorite)
    const newContent = toFavoriteGithubFormat(owner, repo, favorite)
    const updatedContent = Buffer.from(`${newContent}\n${content}`).toString('base64');

    const writeResult = await writeContent({ accessToken, owner, repo, filePath, previousSha: data.sha, message: message, content: updatedContent })
    if (writeResult.ok) {
      return true
    } else {
      console.error(writeResult)
    }
  } catch (error) {
    console.error(error)
  }
  return false
}

async function getContentOrCreate({ accessToken, owner, repo, filePath }) {
  let response = await getContent({ accessToken, owner, repo, filePath });

  // create if not exists
  if (response.status === 404) {
    console.log(`[rest-api] ${filePath} does not exist. Create new one`);
    const writeResult = await writeContent({ accessToken, owner, repo, filePath, previousSha: undefined, message: `[skip actions]CreatePath: ${filePath}`, content: "" });
    if (!writeResult.ok) {
      throw new Error("create-contents-failed");
    }
  }

  // 重新获取一次，因为要获取 sha
  return getContent({ accessToken, owner, repo, filePath });
}

async function writeContent({ accessToken, owner, repo, filePath, previousSha, message, content }) {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;

  return fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'wise-favorites-worker',
    },
    body: JSON.stringify({
      message: message,
      sha: previousSha,
      content: content
    })
  });
}

async function getContent({ accessToken, owner, repo, filePath }) {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;

  return fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'wise-favorites-worker',
    }
  });
}

function getFilepath(favorite: Favorite) {
  // posts 每月一个单独目录
  // tools 只有一个
  switch (favorite.category) {
    case "post":
      const currentMonth = format(favorite.timestamp, 'yyyy-MM');
      return `posts/${currentMonth}/README.md`
    case "tool":
      return 'tools/README.md'
    default:
      return ''
  }
}

function getCommitMessage(favorite: Favorite) {
  const dateWithTimeZone = new TZDate(favorite.timestamp, "Asia/Shanghai");
  const commitBody = {
    title: favorite.title,
    url: favorite.url,
    tags: favorite.tags,
    description: favorite.description,
    timestamp: formatISO(dateWithTimeZone)
  }
  const skipActions = favorite.category == "post" ? '' : '[skip actions]'  // skip actions
  return `${skipActions}[API]${favorite.category}: ${favorite.title}\n\n${JSON.stringify(commitBody)}`
}

function toFavoriteGithubFormat(owner: string, repo: string, favorite: Favorite) {
  const dateStr = format(favorite.timestamp, 'yyyy-MM-dd');
  const hashTags = favorite.tags
    .map(tag => {
      const tagSearch = encodeURIComponent(`repo:${owner}/${repo} #${tag}`)
      return `[#${tag}](https://github.com/search?q=${tagSearch}&type=code)`
    })
    .join(' ');
  const dateWithTimeZone = new TZDate(favorite.timestamp, "Asia/Shanghai");
  return `- (${dateStr}) [${favorite.title}](${favorite.url}) 
  * title: ${favorite.title}
  * url: ${favorite.url}
  * tags: ${hashTags}
  * description: ${favorite.description}
  * timestamp: ${formatISO(dateWithTimeZone)}
`
}
