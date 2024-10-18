
export async function linkPreview(linkPreviewConfig: Record<string, string>, url: string): Promise<JSON> {
  const apiKey = linkPreviewConfig["API_KEY"];
  try {
    const linkPreviewUrl = `https://api.linkpreview.net/?q=${encodeURIComponent(url)}`;
    const response = await fetch(linkPreviewUrl, {
      headers: { 'X-Linkpreview-Api-Key': apiKey }
    });
    return response.json();
  } catch (error) {
    console.error(error);
    return null;
  }
}
