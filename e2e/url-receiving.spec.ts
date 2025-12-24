import { test, expect } from '@playwright/test';

test.describe('URL Receiving - Share Modes', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home first
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should handle frequency mode URL (RSS feed only)', async ({ page }) => {
    // Simulate frequency mode: /#/podcast/feedUrl
    const feedUrl = 'https://example.com/test-feed.xml';
    await page.goto(`/#/podcast/${encodeURIComponent(feedUrl)}`);
    
    // Should show loading state
    await expect(page.locator('text=Tuning Signal')).toBeVisible({ timeout: 2000 });
    
    // Note: In real app, this would load the podcast
    // For smoke test, we just verify the route is recognized
  });

  test('should handle wave-source mode URL (RSS feed + episode)', async ({ page }) => {
    // Simulate wave-source mode: /#/podcast/feedUrl/episode/episodeId
    const feedUrl = 'https://example.com/test-feed.xml';
    const episodeId = 'episode-123';
    await page.goto(`/#/podcast/${encodeURIComponent(feedUrl)}/episode/${encodeURIComponent(episodeId)}`);
    
    // Should show loading state
    await expect(page.locator('text=Tuning Signal')).toBeVisible({ timeout: 2000 });
  });

  test('should handle embedded-payload mode URL (query param)', async ({ page }) => {
    // Create a simple test payload
    const testData = {
      shareType: 'track',
      shareMode: 'embedded-payload',
      t: 'Test Episode',
      u: 'https://example.com/audio.mp3',
      st: 'Test Podcast',
    };
    
    // Manually encode (simplified for test - in real app use shareService.encode)
    const json = JSON.stringify(testData);
    const encoded = btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    
    await page.goto(`/#/?s=${encoded}`);
    
    // Should navigate to home (embedded payload gets processed)
    await page.waitForLoadState('networkidle');
    
    // Verify we're on home page
    await expect(page.locator('h2:has-text("Discover")')).toBeVisible();
  });

  test('should handle query params in hash fragment', async ({ page }) => {
    // Test that ?s= parameter is correctly processed from hash fragment
    await page.goto('/#/?s=test123');
    
    await page.waitForLoadState('networkidle');
    
    // The app processes the param and navigates to home
    // Verify we're on a valid page (not an error page)
    await expect(page.locator('h2:has-text("Discover")')).toBeVisible();
  });

  test('should handle malformed share URLs gracefully', async ({ page }) => {
    // Test with invalid encoded data
    await page.goto('/#/?s=invalid_base64_$$$$');
    
    await page.waitForLoadState('networkidle');
    
    // Should still show home page (error handled gracefully)
    await expect(page.locator('h2:has-text("Discover")')).toBeVisible();
  });

  test('should decode URL-encoded feed URLs correctly', async ({ page }) => {
    // Test with a URL that has special characters
    const feedUrl = 'https://example.com/feed.xml?id=123&type=podcast';
    const encoded = encodeURIComponent(feedUrl);
    
    await page.goto(`/#/podcast/${encoded}`);
    
    // Should attempt to load (will show loading state)
    await expect(page.locator('text=Tuning Signal')).toBeVisible({ timeout: 2000 });
  });
});
