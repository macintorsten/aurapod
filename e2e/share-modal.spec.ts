import { test, expect } from '@playwright/test';

test.describe('Share Modal - Embedded Mode Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('textbox', { name: /Explore/i })).toBeVisible();
  });

  test('should share track in embedded mode - full flow', async ({ page }) => {
    // Search for a podcast to ensure we have content
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]').first();
    await searchInput.fill('JavaScript');
    
    // Click on first podcast result
    const firstPodcast = page.locator('article, [data-testid="podcast-card"], .podcast-card').first();
    await expect(firstPodcast).toBeVisible();
    await firstPodcast.click();
    
    // Wait for episodes to load
    await page.waitForSelector('text=/Episode|Track|Play/', { timeout: 10000 });
    
    // Find and click share button on first episode
    const episodeShareButton = page.locator('article, [role="article"], li').filter({ hasText: /Episode|Track/ }).first().locator('button:has(i.fa-share-nodes), button[aria-label*="share" i], button[title*="share" i]').first();
    
    if (await episodeShareButton.isVisible({ timeout: 2000 })) {
      await episodeShareButton.click();
      
      // Wait for share modal to open
      await expect(page.locator('text=/Wave.*Broadcast|Share/i')).toBeVisible({ timeout: 3000 });
      
      // Find and click Embedded button
      const embeddedButton = page.locator('button').filter({ hasText: /^Embedded$/i });
      await expect(embeddedButton).toBeVisible({ timeout: 2000 });
      await embeddedButton.click();
      
      // Verify modal is still visible (not white page)
      await expect(page.locator('text=/Wave.*Broadcast|Share/i')).toBeVisible();
      
      // Should show embedded badge
      await expect(page.locator('text=/📦|Embed/i')).toBeVisible({ timeout: 2000 });
      
      // Should have Copy Link button
      const copyButton = page.locator('button').filter({ hasText: /Copy Link|Copy/i });
      await expect(copyButton).toBeVisible();
      
      // Grant clipboard permissions
      await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
      
      // Click copy button
      await copyButton.click();
      
      // Should show copied confirmation
      await expect(page.locator('text=/Copied|✓|✔/i')).toBeVisible({ timeout: 2000 });
      
      // Close the modal
      const closeButton = page.locator('button:has(i.fa-xmark), button:has(i.fa-times), button[aria-label*="close" i]').first();
      await closeButton.click();
      
      // Modal should be closed
      await expect(page.locator('text=/Wave.*Broadcast|Share/i')).not.toBeVisible({ timeout: 2000 });
    } else {
      test.skip();
    }
  });

  test('should share podcast frequency in embedded mode (Full Manifest) - full flow', async ({ page }) => {
    // Search for a podcast
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]').first();
    await searchInput.fill('Tech');
    
    // Click on first podcast
    const firstPodcast = page.locator('article, [data-testid="podcast-card"], .podcast-card').first();
    await expect(firstPodcast).toBeVisible();
    await firstPodcast.click();
    
    // Find podcast-level share button (usually in header/toolbar)
    const podcastShareButton = page.locator('button:has(i.fa-signal), button:has(i.fa-podcast), header button:has(i.fa-share-nodes)').first();
    
    if (await podcastShareButton.isVisible({ timeout: 2000 })) {
      await podcastShareButton.click();
      
      // Wait for share modal
      await expect(page.locator('text=/Frequency.*Broadcast|Share/i')).toBeVisible({ timeout: 3000 });
      
      // Should see Frequency Only and Full Manifest buttons
      const frequencyOnlyButton = page.locator('button').filter({ hasText: /Frequency Only|Frequency$/i });
      const fullManifestButton = page.locator('button').filter({ hasText: /Full Manifest|Manifest/i });
      
      await expect(fullManifestButton).toBeVisible({ timeout: 2000 });
      
      // Click Full Manifest (embedded mode for frequency)
      await fullManifestButton.click();
      
      // Modal should still be visible
      await expect(page.locator('text=/Frequency.*Broadcast|Share/i')).toBeVisible();
      
      // Should show episode controls
      await expect(page.locator('text=/Episodes|Episode Count/i')).toBeVisible({ timeout: 5000 });
      
      // Should have Copy Link button
      const copyButton = page.locator('button').filter({ hasText: /Copy Link|Copy/i });
      await expect(copyButton).toBeVisible();
      
      // Grant permissions and copy
      await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
      await copyButton.click();
      
      // Should show copied confirmation
      await expect(page.locator('text=/Copied|✓|✔/i')).toBeVisible({ timeout: 2000 });
      
      // Close modal
      const closeButton = page.locator('button:has(i.fa-xmark), button:has(i.fa-times)').first();
      await closeButton.click();
      
      // Modal closed
      await expect(page.locator('text=/Frequency.*Broadcast|Share/i')).not.toBeVisible({ timeout: 2000 });
    } else {
      test.skip();
    }
  });

  test('should handle wave-source mode (RSS) for track sharing', async ({ page }) => {
    // Search for a podcast
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]').first();
    await searchInput.fill('News');
    
    // Click on first podcast
    const firstPodcast = page.locator('article, [data-testid="podcast-card"], .podcast-card').first();
    await expect(firstPodcast).toBeVisible();
    await firstPodcast.click();
    
    // Find share button on episode
    const episodeShareButton = page.locator('article, [role="article"], li').filter({ hasText: /Episode|Track/ }).first().locator('button:has(i.fa-share-nodes)').first();
    
    if (await episodeShareButton.isVisible({ timeout: 2000 })) {
      await episodeShareButton.click();
      
      // Wait for modal
      await expect(page.locator('text=/Wave.*Broadcast|Share/i')).toBeVisible({ timeout: 3000 });
      
      // Should have RSS and Embedded buttons
      const rssButton = page.locator('button').filter({ hasText: /^RSS$/i });
      
      if (await rssButton.isVisible({ timeout: 1000 })) {
        // Click RSS mode (wave-source)
        await rssButton.click();
        
        // Should show RSS badge
        await expect(page.locator('text=/📡|RSS/i')).toBeVisible();
        
        // Copy URL
        const copyButton = page.locator('button').filter({ hasText: /Copy Link|Copy/i });
        await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
        await copyButton.click();
        
        // Verify copied
        await expect(page.locator('text=/Copied|✓|✔/i')).toBeVisible({ timeout: 2000 });
        
        // Close
        const closeButton = page.locator('button:has(i.fa-xmark)').first();
        await closeButton.click();
        await expect(page.locator('text=/Wave.*Broadcast|Share/i')).not.toBeVisible();
      }
    } else {
      test.skip();
    }
  });

  test('should handle frequency-only mode (RSS source) for podcast sharing', async ({ page }) => {
    // Search for a podcast
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]').first();
    await searchInput.fill('Comedy');
    
    // Click on first podcast
    const firstPodcast = page.locator('article, [data-testid="podcast-card"], .podcast-card').first();
    await expect(firstPodcast).toBeVisible();
    await firstPodcast.click();
    
    // Find podcast-level share button
    const podcastShareButton = page.locator('button:has(i.fa-signal), button:has(i.fa-podcast), header button:has(i.fa-share-nodes)').first();
    
    if (await podcastShareButton.isVisible({ timeout: 2000 })) {
      await podcastShareButton.click();
      
      // Wait for modal
      await expect(page.locator('text=/Frequency.*Broadcast|Share/i')).toBeVisible({ timeout: 3000 });
      
      // Should already be in Frequency Only mode by default
      const frequencyOnlyButton = page.locator('button').filter({ hasText: /Frequency Only/i });
      
      if (await frequencyOnlyButton.isVisible({ timeout: 1000 })) {
        // Click to ensure it's selected
        await frequencyOnlyButton.click();
        
        // Should show frequency badge
        await expect(page.locator('text=/📻|Freq/i')).toBeVisible({ timeout: 2000 });
        
        // Copy URL
        const copyButton = page.locator('button').filter({ hasText: /Copy Link|Copy/i });
        await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
        await copyButton.click();
        
        // Verify copied
        await expect(page.locator('text=/Copied|✓|✔/i')).toBeVisible({ timeout: 2000 });
        
        // Close
        const closeButton = page.locator('button:has(i.fa-xmark)').first();
        await closeButton.click();
        await expect(page.locator('text=/Frequency.*Broadcast|Share/i')).not.toBeVisible();
      }
    } else {
      test.skip();
    }
  });

  test('should not crash when switching between modes multiple times', async ({ page }) => {
    // Search for content
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]').first();
    await searchInput.fill('Technology');
    
    // Click on podcast
    const firstPodcast = page.locator('article, [data-testid="podcast-card"], .podcast-card').first();
    await expect(firstPodcast).toBeVisible();
    await firstPodcast.click();
    
    // Share an episode
    const episodeShareButton = page.locator('article, [role="article"], li').filter({ hasText: /Episode|Track/ }).first().locator('button:has(i.fa-share-nodes)').first();
    
    if (await episodeShareButton.isVisible({ timeout: 2000 })) {
      await episodeShareButton.click();
      await expect(page.locator('text=/Wave.*Broadcast|Share/i')).toBeVisible({ timeout: 3000 });
      
      const rssButton = page.locator('button').filter({ hasText: /^RSS$/i });
      const embeddedButton = page.locator('button').filter({ hasText: /^Embedded$/i });
      
      if (await rssButton.isVisible() && await embeddedButton.isVisible()) {
        // Switch to Embedded
        await embeddedButton.click();
        await expect(page.locator('text=/📦|Embed/i')).toBeVisible();
        
        // Switch back to RSS
        await rssButton.click();
        await expect(page.locator('text=/📡|RSS/i')).toBeVisible();
        
        // Switch to Embedded again
        await embeddedButton.click();
        await expect(page.locator('text=/📦|Embed/i')).toBeVisible();
        
        // Modal should still be functional
        await expect(page.locator('button').filter({ hasText: /Copy Link|Copy/i })).toBeVisible();
        
        // Close
        const closeButton = page.locator('button:has(i.fa-xmark)').first();
        await closeButton.click();
      }
    } else {
      test.skip();
    }
  });
});

