
import { Podcast, Episode } from '../types';
import { APP_CONFIG } from '../config';

/**
 * Interfaces for external data providers
 */
export interface SearchProvider {
  search(term: string): Promise<Podcast[]>;
}

export interface DiscoveryProvider {
  getTrending(): Promise<Podcast[]>;
}

/**
 * Robust fetch helper that cycles through configured proxies on failure
 */
const fetchWithProxy = async (targetUrl: string, isJson: boolean = false): Promise<string | any> => {
  const sanitizedUrl = targetUrl.trim();
  const failures: string[] = [];
  
  // Try direct fetch first for speed
  try {
    const directRes = await fetch(sanitizedUrl, { signal: AbortSignal.timeout(3000) });
    if (directRes.ok) return isJson ? await directRes.json() : await directRes.text();
    failures.push(`Direct: ${directRes.status} ${directRes.statusText}`);
  } catch (e: any) {
    failures.push(`Direct: ${e.message || 'Blocked/Timeout'}`);
  }

  for (const proxyBase of APP_CONFIG.proxyUrls) {
    try {
      const proxyUrl = `${proxyBase}${encodeURIComponent(sanitizedUrl)}`;
      const response = await fetch(proxyUrl, { signal: AbortSignal.timeout(10000) });
      
      if (!response.ok) {
        failures.push(`${proxyBase}: HTTP ${response.status}`);
        continue;
      }

      // Handle AllOrigins specific JSON wrapper
      if (proxyBase.includes('allorigins')) {
        const data = await response.json();
        const content = data.contents;
        if (!content) {
          failures.push(`${proxyBase}: Empty wrapper contents`);
          continue;
        }
        return isJson ? (typeof content === 'string' ? JSON.parse(content) : content) : content;
      }

      return isJson ? await response.json() : await response.text();
    } catch (err: any) {
      failures.push(`${proxyBase}: ${err.message || 'Error'}`);
      continue;
    }
  }
  
  const error = new Error(`Connection failed. Exhausted all available retrieval methods.`);
  (error as any).diagnostics = {
    url: sanitizedUrl,
    attempts: failures,
    timestamp: new Date().toISOString()
  };
  throw error;
};

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
    const snippet = text.trim().substring(0, 200).toLowerCase();
    const isHtml = snippet.includes('<!doctype html') || snippet.includes('<html');
    if (isHtml) throw new Error("Invalid format. The link returned a webpage instead of a feed.");
    throw new Error("The broadcast signal is corrupted or invalid XML.");
  }

  const channel = xml.querySelector("channel");
  if (!channel) throw new Error("Invalid RSS: <channel> element not found.");

  const title = getTagContent(channel, "title") || "Untitled Broadcast";
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

/**
 * Default Implementation using iTunes API
 */
class ItunesProvider implements SearchProvider, DiscoveryProvider {
  async search(term: string): Promise<Podcast[]> {
    if (!term || term.length < 2) return [];
    try {
      const url = `${APP_CONFIG.providers.itunes.searchUrl}?term=${encodeURIComponent(term)}&entity=podcast&limit=15`;
      const data = await fetchWithProxy(url, true);
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
  }

  async getTrending(): Promise<Podcast[]> {
    try {
      const trendingUrl = APP_CONFIG.providers.itunes.trendingUrl;
      const data = await fetchWithProxy(trendingUrl, true);

      const entries = data.feed?.entry || [];
      const ids = entries.map((e: any) => e.id.attributes['im:id']).join(',');
      
      if (!ids) return [];

      const lookupUrl = `${APP_CONFIG.providers.itunes.lookupUrl}?id=${ids}`;
      const lookupData = await fetchWithProxy(lookupUrl, true);
      
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
  }
}

const defaultProvider = new ItunesProvider();

export const rssService = {
  searchPodcasts: (term: string) => defaultProvider.search(term),
  getTrendingPodcasts: () => defaultProvider.getTrending(),

  fetchPodcast: async (url: string): Promise<{ podcast: Podcast, episodes: Episode[] }> => {
    const text = await fetchWithProxy(url, false);
    return parseRssXml(text, url);
  }
};
