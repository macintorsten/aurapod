import { describe, it, expect } from 'vitest';
import { parseRSS } from './parser';

describe('parser', () => {
  it('should parse basic RSS feed', () => {
    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test Podcast</title>
    <description>Test Description</description>
    <link>https://example.com</link>
    <item>
      <title>Episode 1</title>
      <enclosure url="https://example.com/ep1.mp3" />
      <description>Episode 1 description</description>
      <pubDate>Tue, 23 Dec 2025 03:00:00 +0000</pubDate>
      <duration>01:30:00</duration>
      <itunes:explicit>false</itunes:explicit>
      <guid>ep1-guid</guid>
    </item>
  </channel>
</rss>`;
    
    const result = parseRSS(rss);
    
    expect(result.title).toBe('Test Podcast');
    expect(result.description).toBe('Test Description');
    expect(result.url).toBe('https://example.com');
    expect(result.tracks).toHaveLength(1);
    expect(result.tracks[0].title).toBe('Episode 1');
    expect(result.tracks[0].url).toBe('https://example.com/ep1.mp3');
    expect(result.tracks[0].description).toBe('Episode 1 description');
    expect(result.tracks[0].duration).toBe(5400); // 1h 30m = 5400s
  });
  
  it('should parse CDATA-wrapped content and strip HTML', () => {
    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title><![CDATA[Podcast with <special> chars]]></title>
    <item>
      <title><![CDATA[Episode with "quotes" & symbols]]></title>
      <description><![CDATA[<div>Description with <b>HTML</b> tags</div>]]></description>
      <enclosure url="https://example.com/ep1.mp3" />
    </item>
  </channel>
</rss>`;
    
    const result = parseRSS(rss);
    
    expect(result.title).toBe('Podcast with <special> chars');
    expect(result.tracks[0].title).toBe('Episode with "quotes" & symbols');
    // HTML tags should be stripped from description
    expect(result.tracks[0].description).toBe('Description with HTML tags');
  });
  
  it('should parse duration in different formats', () => {
    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <item>
      <title>Episode 1</title>
      <enclosure url="https://example.com/ep1.mp3" />
      <duration>01:30:45</duration>
    </item>
    <item>
      <title>Episode 2</title>
      <enclosure url="https://example.com/ep2.mp3" />
      <duration>45:30</duration>
    </item>
  </channel>
</rss>`;
    
    const result = parseRSS(rss);
    
    expect(result.tracks[0].duration).toBe(5445); // 1h 30m 45s
    expect(result.tracks[1].duration).toBe(2730); // 45m 30s
  });
  
  it('should handle multiple items', () => {
    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <item>
      <title>Episode 1</title>
      <enclosure url="https://example.com/ep1.mp3" />
    </item>
    <item>
      <title>Episode 2</title>
      <enclosure url="https://example.com/ep2.mp3" />
    </item>
    <item>
      <title>Episode 3</title>
      <enclosure url="https://example.com/ep3.mp3" />
    </item>
  </channel>
</rss>`;
    
    const result = parseRSS(rss);
    
    expect(result.tracks).toHaveLength(3);
    expect(result.tracks[0].title).toBe('Episode 1');
    expect(result.tracks[1].title).toBe('Episode 2');
    expect(result.tracks[2].title).toBe('Episode 3');
  });
  
  it('should handle missing optional fields', () => {
    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <item>
      <title>Minimal Episode</title>
      <enclosure url="https://example.com/ep1.mp3" />
    </item>
  </channel>
</rss>`;
    
    const result = parseRSS(rss);
    
    expect(result.tracks).toHaveLength(1);
    expect(result.tracks[0].title).toBe('Minimal Episode');
    expect(result.tracks[0].url).toBe('https://example.com/ep1.mp3');
    expect(result.tracks[0].description).toBeUndefined();
    expect(result.tracks[0].duration).toBeUndefined();
  });
  
  it('should skip items without title or URL', () => {
    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <item>
      <description>No title or URL</description>
    </item>
    <item>
      <title>Valid Episode</title>
      <enclosure url="https://example.com/ep1.mp3" />
    </item>
  </channel>
</rss>`;
    
    const result = parseRSS(rss);
    
    expect(result.tracks).toHaveLength(1);
    expect(result.tracks[0].title).toBe('Valid Episode');
  });
});
