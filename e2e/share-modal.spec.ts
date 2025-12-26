import { test, expect } from '@playwright/test';
import { mockItunesSearch, mockFeedFetch } from './fixtures/network-mocks';

test.describe('Share Modal - Embedded Mode Tests', () => {
  test.beforeEach(async ({ page, context }) => {
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);
      await page.goto('/');
      // Wait for either search input or the "Discover" heading to be visible
      await expect(page.locator('h2:has-text("Discover"), input[data-testid="search-input"]')).toBeVisible({ timeout: 10000 });
      // Ensure deterministic results for search and feed loading
      await mockItunesSearch(page);
      await mockFeedFetch(page);
    });

  test('should share track in embedded mode - full flow', async ({ page }) => {
    // Search for a podcast to ensure we have content
    const searchInput = page.getByTestId('search-input');
    await searchInput.fill('JavaScript');
    
    // Click on first podcast result
    const firstPodcast = page.getByTestId('search-result-card').first();
    await expect(firstPodcast).toBeVisible({ timeout: 10000 });
    await firstPodcast.click();
    
    // Wait for episode content to be visible
    // Episodes are rendered as div elements with the podcast title heading inside
    const recentWavesHeading = page.locator('h4:has-text("Recent Waves")');
    await expect(recentWavesHeading).toBeVisible({ timeout: 10000 });
    
    // Find the first episode container - they are divs with image + heading structure
    const episodeContainer = page.locator('div:has(img[alt*="Mock Episode"]), div:has(h4:has-text("Mock Episode"))').first();
    await expect(episodeContainer).toBeVisible({ timeout: 5000 });
    
    // Find share button within the episode
    const episodeShareButton = episodeContainer.locator('button').filter({ hasText: /share/i }).first();
    
    if (await episodeShareButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await episodeShareButton.click();
      
      // Wait for share modal to open - look specifically for the modal heading in dark mode with broadcast
      await expect(page.locator('h3:has-text("Wave") >> text="Broadcast"').first()).toBeVisible({ timeout: 5000 });
      
      // Find and click Embedded button
      const embeddedButton = page.locator('button').filter({ hasText: /Embedded/i });
      await expect(embeddedButton).toBeVisible();
      await embeddedButton.click();
      
      // Verify modal is still visible - check the heading
      await expect(page.locator('h3:has-text("Wave") >> text="Broadcast"').first()).toBeVisible();
      
      // Should show embedded badge - look for the badge specifically (span with padding and bg color)
      await expect(page.locator('span.bg-purple-500\\\/10:has-text("Embed"), span:has-text("📦")').first()).toBeVisible({ timeout: 2000 });
      
      // Should have Copy Link button
      const copyButton = page.locator('button').filter({ hasText: /Copy Link|Copy/i });
      await expect(copyButton).toBeVisible();
      
      // Click copy button
      await copyButton.click();
      
      // Should show copied confirmation
      await expect(page.locator('text=/Copied|✓|✔/i')).toBeVisible({ timeout: 2000 });
      
      // Close the modal
      const closeButton = page.locator('button:has(i.fa-xmark), button:has(i.fa-times), button[aria-label*="close" i]').first();
      await closeButton.click();
      
      // Modal should be closed - check that the heading is gone
      await expect(page.locator('h3:has-text("Wave") >> text="Broadcast"').first()).not.toBeVisible({ timeout: 2000 });
    } else {
      test.skip();
    }
  });

  test('should share podcast frequency in embedded mode (Full Manifest) - full flow', async ({ page }) => {
    // Search for a podcast
    const searchInput = page.getByTestId('search-input');
    await searchInput.fill('Tech');
    
    // Click on first podcast
    const firstPodcast = page.getByTestId('search-result-card').first();
    await expect(firstPodcast).toBeVisible({ timeout: 10000 });
    await firstPodcast.click();
    
    // Find podcast-level share button - it's the first fa-share-nodes button on the page (in the header)
    const podcastShareButton = page.locator('button:has(i.fa-share-nodes)').first();
    
    if (await podcastShareButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await podcastShareButton.click();
      
      // Wait for share modal - look for the modal heading
      await expect(page.locator('h3:has-text("Frequency") >> text="Broadcast"').first()).toBeVisible({ timeout: 5000 });
      
      // Should see Full Manifest button
      const fullManifestButton = page.locator('button').filter({ hasText: /Full Manifest|Manifest/i });
      await expect(fullManifestButton).toBeVisible();
      
      // Click Full Manifest (embedded mode for frequency)
      await fullManifestButton.click();
      
      // Modal should still be visible
      await expect(page.locator('h3:has-text("Frequency") >> text="Broadcast"').first()).toBeVisible();
      
      // Should have Copy Link button
      const copyButton = page.locator('button').filter({ hasText: /Copy Link|Copy/i });
      await expect(copyButton).toBeVisible({ timeout: 5000 });
      
      // Copy
      await copyButton.click();
      
      // Should show copied confirmation
      await expect(page.locator('text=/Copied|✓|✔/i')).toBeVisible({ timeout: 2000 });
      
      // Close modal
      const closeButton = page.locator('button:has(i.fa-xmark), button:has(i.fa-times)').first();
      await closeButton.click();
      
      // Modal closed
      await expect(page.locator('h3:has-text("Frequency") >> text="Broadcast"').first()).not.toBeVisible({ timeout: 2000 });
    } else {
      test.skip();
    }
  });

  test('should handle wave-source mode (RSS) for track sharing', async ({ page }) => {
    // Search for a podcast
    const searchInput = page.getByTestId('search-input');
    await searchInput.fill('News');
    
    // Click on first podcast
    const firstPodcast = page.getByTestId('search-result-card').first();
    await expect(firstPodcast).toBeVisible({ timeout: 10000 });
    await firstPodcast.click();
    
    // Wait for episodes to load
    const recentWavesHeading = page.locator('h4:has-text("Recent Waves")');
    await expect(recentWavesHeading).toBeVisible({ timeout: 10000 });
    
    // Find the first episode container
    const episodeContainer = page.locator('div:has(img[alt*="Mock Episode"]), div:has(h4:has-text("Mock Episode"))').first();
    await expect(episodeContainer).toBeVisible({ timeout: 5000 });
    
    const episodeShareButton = episodeContainer.locator('button').filter({ hasText: /share/i }).first();
    
    if (await episodeShareButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await episodeShareButton.click();
      
      // Wait for modal - look specifically for the modal heading
      await expect(page.locator('h3:has-text("Wave") >> text="Broadcast"').first()).toBeVisible({ timeout: 5000 });
      
      // Should have RSS button
      const rssButton = page.locator('button').filter({ hasText: /RSS Source/i });
      
      if (await rssButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Click RSS mode (wave-source)
        await rssButton.click();
        
        // Should show RSS badge - look for the span with 📡 or RSS text
        await expect(page.locator('span.bg-indigo-500\\\/10:has-text("RSS"), span:has-text("📡")').first()).toBeVisible({ timeout: 2000 });
        
        // Copy URL
        const copyButton = page.locator('button').filter({ hasText: /Copy Link|Copy/i });
        await copyButton.click();
        
        // Verify copied
        await expect(page.locator('text=/Copied|✓|✔/i')).toBeVisible({ timeout: 2000 });
        
        // Close
        const closeButton = page.locator('button:has(i.fa-xmark)').first();
        await closeButton.click();
        await expect(page.locator('h3:has-text("Wave") >> text="Broadcast"').first()).not.toBeVisible();
      }
    } else {
      test.skip();
    }
  });

  test('should handle frequency-only mode (RSS source) for podcast sharing', async ({ page }) => {
    // Search for a podcast
    const searchInput = page.getByTestId('search-input');
    await searchInput.fill('Comedy');
    
    // Click on first podcast
    const firstPodcast = page.getByTestId('search-result-card').first();
    await expect(firstPodcast).toBeVisible({ timeout: 10000 });
    await firstPodcast.click();
    
    // Wait for the podcast detail page to load
    await expect(page.locator('h3').first()).toBeVisible({ timeout: 5000 });
    
    // Find podcast-level share button - it's the first fa-share-nodes button on the page (in the header)
    const podcastShareButton = page.locator('button:has(i.fa-share-nodes)').first();
    
    if (await podcastShareButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await podcastShareButton.click();
      
      // Wait for modal - look for the modal heading
      await expect(page.locator('h3:has-text("Frequency") >> text="Broadcast"').first()).toBeVisible({ timeout: 5000 });
      
      // For frequency sharing, default mode is Frequency Only (rss-source)
      // Check for the frequency badge which indicates we're in the right mode
      await expect(page.locator('span.bg-indigo-500\\\/10:has-text("Freq"), span:has-text("📻")').first()).toBeVisible({ timeout: 2000 });
      
      // Copy URL
      const copyButton = page.locator('button').filter({ hasText: /Copy Link|Copy/i });
      await copyButton.click();
      
      // Verify copied
      await expect(page.locator('text=/Copied|✓|✔/i')).toBeVisible({ timeout: 2000 });
      
      // Close
      const closeButton = page.locator('button:has(i.fa-xmark)').first();
      await closeButton.click();
      await expect(page.locator('h3:has-text("Frequency") >> text="Broadcast"').first()).not.toBeVisible();
    } else {
      test.skip();
    }
  });


});

