import type { Page } from '@playwright/test';

export async function mockItunesSearch(page: Page) {
  await page.route('https://itunes.apple.com/search*', async (route) => {
    const url = new URL(route.request().url());
    const term = url.searchParams.get('term') || '';
    const makeItem = (id: number) => ({
      collectionId: id,
      collectionName: `${term || 'Mock'} Podcast ${String.fromCharCode(64 + id)}`,
      artistName: `Mock Artist ${id}`,
      artworkUrl600: 'https://via.placeholder.com/600',
      artworkUrl100: 'https://via.placeholder.com/100',
      feedUrl: `https://example.com/mock-feed-${id}.xml`,
    });
    const payload = {
      resultCount: 3,
      results: [makeItem(1), makeItem(2), makeItem(3)]
    };
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(payload),
    });
  });
}

export async function mockFeedFetch(page: Page) {
  await page.route('https://example.com/*.xml', async (route) => {
    const rss = `<?xml version="1.0" encoding="UTF-8"?>
    <rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
      <channel>
        <title>Mock Feed</title>
        <description>Mock description</description>
        <itunes:image href="https://via.placeholder.com/300" />
        <item>
          <title>Mock Episode 1</title>
          <guid>ep1</guid>
          <enclosure url="https://example.com/audio1.mp3" type="audio/mpeg" />
          <itunes:duration>1200</itunes:duration>
        </item>
        <item>
          <title>Mock Episode 2</title>
          <guid>ep2</guid>
          <enclosure url="https://example.com/audio2.mp3" type="audio/mpeg" />
          <itunes:duration>1800</itunes:duration>
        </item>
      </channel>
    </rss>`;
    await route.fulfill({
      status: 200,
      contentType: 'application/rss+xml',
      body: rss,
    });
  });

  // Also mock audio files HEAD/GET to avoid 404s during player interactions
  await page.route('https://example.com/*.mp3', async (route) => {
    await route.fulfill({ status: 200, contentType: 'audio/mpeg', body: '' });
  });
}

export async function mockItunesTrending(page: Page) {
  await page.route('https://itunes.apple.com/us/rss/toppodcasts/limit=*', async (route) => {
    // Minimal RSS JSON feed response with entries containing ids
    const payload = {
      feed: {
        entry: [
          { id: { attributes: { 'im:id': '1111' } } },
          { id: { attributes: { 'im:id': '2222' } } },
          { id: { attributes: { 'im:id': '3333' } } }
        ]
      }
    };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) });
  });
}

export async function mockItunesLookup(page: Page) {
  await page.route('https://itunes.apple.com/lookup*', async (route) => {
    const url = new URL(route.request().url());
    const ids = (url.searchParams.get('id') || '').split(',').filter(Boolean);
    const results = ids.map((id, idx) => ({
      collectionId: Number(id) || (1000 + idx),
      collectionName: `Trending Podcast ${idx + 1}`,
      artistName: `Trending Artist ${idx + 1}`,
      artworkUrl600: 'https://via.placeholder.com/600',
      artworkUrl100: 'https://via.placeholder.com/100',
      feedUrl: `https://example.com/mock-trending-${idx + 1}.xml`
    }));
    const payload = { resultCount: results.length, results };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) });
  });
}

export async function mockAllItunes(page: Page) {
  await mockItunesSearch(page);
  await mockItunesTrending(page);
  await mockItunesLookup(page);
}
