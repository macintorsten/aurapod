import { Feed, Track } from './types';

// Use browser's native DOMParser
const DOMParserImpl: typeof DOMParser = typeof DOMParser !== 'undefined' ? DOMParser : null as any;

/**
 * Strip HTML tags from a string using DOM textContent
 */
function stripHtml(html: string): string {
  if (!html) return '';
  
  if (!DOMParserImpl) {
    throw new Error('DOMParser is required for HTML stripping');
  }
  
  // Parse as HTML and extract text content
  const doc = new DOMParserImpl().parseFromString(
    `<!DOCTYPE html><html><body>${html}</body></html>`,
    'text/html'
  );
  
  // Get text content from body, which automatically strips all HTML tags
  return doc.body?.textContent?.trim() || '';
}

/**
 * Get text content from an element, handling CDATA and trimming whitespace
 * Also handles happy-dom's quirk where some XML elements like <link> are treated as HTML void elements
 */
function getTextContent(element: Element | null): string | null {
  if (!element) return null;
  
  // Use textContent - CDATA is preprocessed before parsing
  let text = element.textContent?.trim() || '';
  
  // Happy-dom treats <link> as an HTML element (self-closing), causing the text content
  // to become a sibling text node instead of a child. Check for this case.
  if (text === '' && element.nextSibling && element.nextSibling.nodeType === 3) {
    text = element.nextSibling.nodeValue?.trim() || '';
  }
  
  return text !== '' ? text : null;
}

/**
 * Parse duration string (HH:MM:SS or MM:SS or seconds) to seconds
 * @param duration - Duration string
 * @returns Duration in seconds
 */
function parseDuration(duration: string): number {
  if (!duration) return 0;
  
  // Check if it contains colons (time format)
  if (duration.includes(':')) {
    const parts = duration.split(':').map(p => parseInt(p) || 0);
    if (parts.length === 3) {
      // HH:MM:SS
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      // MM:SS
      return parts[0] * 60 + parts[1];
    }
  }
  
  // Otherwise treat as seconds
  return parseInt(duration) || 0;
}

/**
 * Parse date string to Unix timestamp (seconds)
 * @param dateStr - Date string (RFC 2822 format)
 * @returns Unix timestamp in seconds
 */
function parseDate(dateStr: string): number {
  return Math.floor(new Date(dateStr).getTime() / 1000);
}

/**
 * Parse RSS XML content into a Feed using DOMParser
 * @param xmlContent - RSS XML string
 * @returns Parsed Feed object
 */
export function parseRSS(xmlContent: string): Feed {
  if (!DOMParserImpl) {
    throw new Error('DOMParser is not available. This library requires a browser environment or linkedom for Node.js.');
  }
  
  // Happy-dom has issues with CDATA in XML mode
  // Preprocess to extract CDATA content before parsing
  xmlContent = xmlContent.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, (match, content) => {
    // Escape XML special characters in CDATA content
    return content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  });
  
  const parser = new DOMParserImpl();
  const doc = parser.parseFromString(xmlContent, 'text/xml');
  
  // Check for parsing errors
  const parserError = doc.querySelector('parsererror');
  if (parserError) {
    throw new Error('Failed to parse RSS feed: Invalid XML');
  }

  const feed: Feed = {
    title: null,
    description: null,
    url: null,
    tracks: [],
  };
  
  // Extract feed metadata from channel
  const channel = doc.querySelector('channel');
  if (channel) {
    feed.title = getTextContent(channel.querySelector('title'));
    feed.description = getTextContent(channel.querySelector('description'));
    
    // Try multiple ways to get the link
    // Happy-dom has a bug where <link> is treated as HTML element (self-closing)
    // so text content becomes a sibling instead of child
    const linkElement = channel.querySelector('link');
    if (linkElement) {
      feed.url = getTextContent(linkElement);
      // If still null, try href attribute
      if (!feed.url) {
        feed.url = linkElement.getAttribute('href');
      }
      // If still null, check nextSibling text node (happy-dom quirk)
      if (!feed.url && linkElement.nextSibling?.nodeType === 3) {
        const text = linkElement.nextSibling.nodeValue?.trim();
        if (text) feed.url = text;
      }
    }
  }

  // Extract all items
  const items = doc.querySelectorAll('item');
  
  for (const item of items) {
    const track: Track = {};
    
    // Extract title
    track.title = getTextContent(item.querySelector('title'));
    
    // Extract enclosure URL (audio file)
    const enclosure = item.querySelector('enclosure');
    if (enclosure) {
      track.url = enclosure.getAttribute('url');
    }
    
    // Extract description and strip HTML tags
    const descElement = item.querySelector('description');
    if (descElement) {
      const rawDesc = getTextContent(descElement);
      if (rawDesc) {
        track.description = stripHtml(rawDesc);
      }
    }
    
    // Extract publication date
    const pubDateText = getTextContent(item.querySelector('pubDate'));
    if (pubDateText) {
      track.date = parseDate(pubDateText);
    }
    
    // Extract duration (iTunes namespace)
    // Try multiple selectors for duration element
    let durationElement = item.querySelector('duration') || 
                         item.querySelector('itunes\\:duration');
    
    // If we still don't have it, iterate through all children and check tag names
    if (!durationElement) {
      const children = item.children;
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        const tagName = (child.tagName || child.localName || '').toLowerCase();
        // Check for duration in the tag name (handles both <duration> and <itunes:duration>)
        if (tagName === 'duration' || tagName.includes('duration')) {
          durationElement = child;
          break;
        }
      }
    }
    
    const durationText = getTextContent(durationElement);
    if (durationText) {
      track.duration = parseDuration(durationText);
    }
    
    // Only add track if it has at least a title or URL
    if (track.title || track.url) {
      feed.tracks.push(track);
    }
  }
  
  return feed;
}
