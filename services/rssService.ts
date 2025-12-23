
import { Podcast, Episode } from '../types';

/**
 * Robust helper to find tags by name, including namespaced ones
 */
const findTag = (parent: Element | Document, tagName: string): Element | null => {
  let node = parent.getElementsByTagName(tagName)[0];
  if (node) return node;

  const localName = tagName.split(':').pop() || "";
  node = parent.getElementsByTagName(localName)[0];
  if (node) return node;

  const allElements = parent.querySelectorAll('*');
  for (let i = 0; i < allElements.length; i++) {
    const el = allElements[i];
    if (el.tagName.toLowerCase() === tagName.toLowerCase() || 
        el.tagName.toLowerCase() === localName.toLowerCase() ||
        el.localName.toLowerCase() === localName.toLowerCase()) {
      return el;
    }
  }
  return null;
};

const getTagContent = (parent: Element | Document, tagName: string): string => {
  return findTag(parent, tagName)?.textContent?.trim() || "";
};

const getTagAttr = (parent: Element | Document, tagName: string, attr: string): string => {
  return findTag(parent, tagName)?.getAttribute(attr) || "";
};

/**
 * Formats the raw XML string into our Podcast/Episode objects.
 */
const parseRssXml = (text: string, originalUrl: string): { podcast: Podcast, episodes: Episode[] } => {
  const parser = new DOMParser();
  const xml = parser.parseFromString(text, "text/xml");
  
  const parserError = xml.getElementsByTagName("parsererror")[0];
  if (parserError) {
    throw new Error("The content returned is not valid XML.");
  }

  const channel = xml.querySelector("channel");
  if (!channel) throw new Error("Invalid RSS: <channel> element not found.");

  const title = getTagContent(channel, "title") || "Untitled Podcast";
  const description = getTagContent(channel, "description") || "";
  
  let image = getTagAttr(channel, "itunes:image", "href") || 
              channel.querySelector("image url")?.textContent || 
              channel.querySelector("image")?.getAttribute("href") ||
              "https://images.unsplash.com/photo-1478737270239-2fccd27ee8fb?w=800&auto=format&fit=crop&q=60";

  const author = getTagContent(channel, "itunes:author") || 
                 getTagContent(channel, "author") || "Unknown Author";

  const podcastId = btoa(originalUrl.replace(/[^\x00-\x7F]/g, "")).substring(0, 16);

  const podcast: Podcast = {
    id: podcastId,
    title,
    description,
    image,
    feedUrl: originalUrl,
    author,
  };

  const episodeElements = Array.from(xml.querySelectorAll("item"));
  const episodes: Episode[] = episodeElements.map(el => {
    const enclosure = el.querySelector("enclosure");
    const audioUrl = enclosure?.getAttribute("url") || "";
    const duration = getTagContent(el, "itunes:duration") || "0:00";
    const epImage = getTagAttr(el, "itunes:image", "href") || image;

    return {
      id: getTagContent(el, "guid") || audioUrl || Math.random().toString(36).substring(2, 12),
      podcastId: podcast.id,
      title: getTagContent(el, "title") || "Untitled Episode",
      description: getTagContent(el, "description") || "",
      pubDate: getTagContent(el, "pubDate") || "",
      audioUrl,
      duration,
      link: getTagContent(el, "link") || "",
      image: epImage,
    };
  }).filter(ep => ep.audioUrl);

  return { podcast, episodes };
};

export const rssService = {
  /**
   * Search for podcasts using the iTunes Search API.
   */
  searchPodcasts: async (term: string): Promise<Podcast[]> => {
    if (!term || term.length < 2) return [];
    
    try {
      const response = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=podcast&limit=15`);
      if (!response.ok) throw new Error("Search API failed");
      
      const data = await response.json();
      return data.results.map((item: any) => ({
        id: item.collectionId.toString(),
        title: item.collectionName,
        author: item.artistName,
        image: item.artworkUrl600 || item.artworkUrl100,
        feedUrl: item.feedUrl,
        description: "",
      }));
    } catch (err) {
      console.error("iTunes Search Error:", err);
      return [];
    }
  },

  /**
   * Fetches the current top podcasts from Apple Charts.
   * Fixed by using a CORS proxy.
   */
  getTrendingPodcasts: async (): Promise<Podcast[]> => {
    try {
      // 1. Get IDs of top podcasts using a proxy
      const trendingUrl = 'https://itunes.apple.com/us/rss/toppodcasts/limit=12/json';
      const proxyUrl = `https://corsproxy.io/?url=${encodeURIComponent(trendingUrl)}`;
      
      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error("Failed to fetch trending chart");
      const data = await response.json();
      const entries = data.feed?.entry || [];
      const ids = entries.map((e: any) => e.id.attributes['im:id']).join(',');
      
      if (!ids) return [];

      // 2. Lookup IDs to get full metadata including RSS feedUrl using a proxy
      const lookupUrl = `https://itunes.apple.com/lookup?id=${ids}`;
      const lookupProxyUrl = `https://corsproxy.io/?url=${encodeURIComponent(lookupUrl)}`;
      const lookupResponse = await fetch(lookupProxyUrl);
      if (!lookupResponse.ok) throw new Error("Failed to lookup podcast metadata");
      const lookupData = await lookupResponse.json();
      
      return lookupData.results.map((item: any) => ({
        id: item.collectionId.toString(),
        title: item.collectionName,
        author: item.artistName,
        image: item.artworkUrl600 || item.artworkUrl100,
        feedUrl: item.feedUrl,
        description: "",
      }));
    } catch (err) {
      console.error("Trending podcasts error:", err);
      return [];
    }
  },

  fetchPodcast: async (url: string): Promise<{ podcast: Podcast, episodes: Episode[] }> => {
    const sanitizedUrl = url.trim();
    if (!sanitizedUrl || !sanitizedUrl.startsWith('http')) {
      throw new Error("Please enter a valid URL.");
    }

    // Attempt 1: Direct Fetch
    try {
      const response = await fetch(sanitizedUrl, { signal: AbortSignal.timeout(5000) });
      if (response.ok) {
        const text = await response.text();
        return parseRssXml(text, sanitizedUrl);
      }
    } catch (e) {
      console.log("Direct fetch failed, trying proxies...");
    }

    // Attempt 2: CORS Proxy Fallbacks
    const proxies = [
      { url: `https://corsproxy.io/?url=${encodeURIComponent(sanitizedUrl)}`, type: 'raw' },
      { url: `https://api.allorigins.win/get?url=${encodeURIComponent(sanitizedUrl)}`, type: 'json' },
      { url: `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(sanitizedUrl)}`, type: 'raw' }
    ];

    let lastError: any = null;

    for (const proxy of proxies) {
      try {
        const response = await fetch(proxy.url, { signal: AbortSignal.timeout(10000) });
        if (!response.ok) continue;

        if (proxy.type === 'json') {
          const data = await response.json();
          if (data.contents) {
            return parseRssXml(data.contents, sanitizedUrl);
          }
        } else {
          const text = await response.text();
          if (text) return parseRssXml(text, sanitizedUrl);
        }
      } catch (err: any) {
        lastError = err;
      }
    }

    throw new Error(
      lastError?.name === 'AbortError' 
        ? "The request timed out."
        : "CORS Access Denied: This podcast host blocks external players. Try another podcast."
    );
  }
};
