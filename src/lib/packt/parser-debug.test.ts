import { describe, it, expect } from 'vitest';
import { parseRSS } from './parser';

describe('parser debug', () => {
  it('debug link parsing', () => {
    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test</title>
    <link>https://example.com</link>
  </channel>
</rss>`;
    
    const result = parseRSS(rss);
    console.log('Feed URL:', JSON.stringify(result.url));
    console.log('Feed:', JSON.stringify(result, null, 2));
  });

  it('debug duration parsing', () => {
    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <item>
      <title>Episode</title>
      <enclosure url="https://example.com/ep1.mp3" />
      <itunes:duration>01:30:45</itunes:duration>
    </item>
  </channel>
</rss>`;
    
    const result = parseRSS(rss);
    console.log('Duration:', result.tracks[0]?.duration);
    console.log('Track:', JSON.stringify(result.tracks[0], null, 2));
  });

  it('debug CDATA parsing', () => {
    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title><![CDATA[Podcast with <special> chars]]></title>
  </channel>
</rss>`;
    
    const result = parseRSS(rss);
    console.log('Title:', JSON.stringify(result.title));
  });
});
