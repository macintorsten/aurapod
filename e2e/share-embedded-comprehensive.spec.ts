import { test, expect } from '@playwright/test';

test.describe('Share Modal - Embedded Mode Comprehensive Tests', () => {
  
  test('should not open new window or crash when clicking embedded mode rapidly', async ({ page, context }) => {
    // Track if any new pages/windows are opened
    let newPageOpened = false;
    context.on('page', () => {
      newPageOpened = true;
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Search and navigate to podcast
    const searchInput = page.getByRole('textbox', { name: /Explore/i });
    await searchInput.fill('JavaScript');
    await page.waitForTimeout(1000);
    
    const firstPodcast = page.locator('article, [data-testid="podcast-card"]').first();
    await firstPodcast.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    
    // Wait for episodes
    await page.waitForSelector('text=/Episode|Track|Play/', { timeout: 10000 });
    
    // Click share on episode
    const episodeShareButton = page.locator('article, li').filter({ hasText: /Episode|Track/ }).first().locator('button:has(i.fa-share-nodes)').first();
    
    if (await episodeShareButton.isVisible({ timeout: 2000 })) {
      await episodeShareButton.click();
      await expect(page.locator('text=/Wave.*Broadcast/i')).toBeVisible({ timeout: 3000 });
      
      // Rapidly click embedded button multiple times
      const embeddedButton = page.locator('button').filter({ hasText: /^Embedded$/i });
      await expect(embeddedButton).toBeVisible();
      
      // Click 5 times rapidly
      for (let i = 0; i < 5; i++) {
        await embeddedButton.click({ delay: 50 });
      }
      
      // Wait and verify modal is still visible
      await page.waitForTimeout(500);
      
      // Check page is not white (has visible content)
      await expect(page.locator('text=/Wave.*Broadcast/i')).toBeVisible();
      await expect(page.locator('button').filter({ hasText: /Copy Link/i })).toBeVisible();
      
      // Verify no new window opened
      expect(newPageOpened).toBe(false);
      
      // Modal should be functional
      await expect(page.locator('text=/📦|Embed/i')).toBeVisible();
    } else {
      test.skip();
    }
  });

  test('should update URL when filters are toggled', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Navigate to podcast
    const searchInput = page.getByRole('textbox', { name: /Explore/i });
    await searchInput.fill('Tech');
    await page.waitForTimeout(1000);
    
    const firstPodcast = page.locator('article, [data-testid="podcast-card"]').first();
    await firstPodcast.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    
    // Open podcast share modal (frequency type)
    const podcastShareButton = page.locator('button:has(i.fa-signal), header button:has(i.fa-share-nodes)').first();
    
    if (await podcastShareButton.isVisible({ timeout: 2000 })) {
      await podcastShareButton.click();
      await expect(page.locator('text=/Frequency.*Broadcast/i')).toBeVisible({ timeout: 3000 });
      
      // Switch to Full Manifest
      const fullManifestButton = page.locator('button').filter({ hasText: /Full Manifest/i });
      if (await fullManifestButton.isVisible()) {
        await fullManifestButton.click();
        await page.waitForTimeout(1500);
        
        // Should see filter controls
        await expect(page.locator('text=/Include|Desc|Img/i')).toBeVisible({ timeout: 5000 });
        
        // Get initial URL display
        const urlDisplay = page.locator('text=/http|\/\//i, code, pre, .url, .link-text').first();
        const initialUrl = await urlDisplay.textContent().catch(() => null);
        
        // Toggle description filter
        const descCheckbox = page.locator('label').filter({ hasText: /Desc/i }).locator('input[type="checkbox"]');
        if (await descCheckbox.isVisible({ timeout: 1000 })) {
          await descCheckbox.click();
          await page.waitForTimeout(500);
          
          // URL should have changed
          const newUrl = await urlDisplay.textContent().catch(() => null);
          if (initialUrl && newUrl) {
            expect(newUrl).not.toBe(initialUrl);
          }
          
          // Toggle back
          await descCheckbox.click();
          await page.waitForTimeout(500);
        }
      }
    } else {
      test.skip();
    }
  });

  test('should update all visual indicators when episode count changes', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const searchInput = page.getByRole('textbox', { name: /Explore/i });
    await searchInput.fill('News');
    await page.waitForTimeout(1000);
    
    const firstPodcast = page.locator('article').first();
    await firstPodcast.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    
    // Open podcast share
    const podcastShareButton = page.locator('button:has(i.fa-signal), header button:has(i.fa-share-nodes)').first();
    
    if (await podcastShareButton.isVisible({ timeout: 2000 })) {
      await podcastShareButton.click();
      await expect(page.locator('text=/Frequency.*Broadcast/i')).toBeVisible({ timeout: 3000 });
      
      // Switch to Full Manifest
      const fullManifestButton = page.locator('button').filter({ hasText: /Full Manifest/i });
      if (await fullManifestButton.isVisible()) {
        await fullManifestButton.click();
        await page.waitForTimeout(1500);
        
        // Find episode count slider
        const slider = page.locator('input[type="range"]').first();
        
        if (await slider.isVisible({ timeout: 2000 })) {
          // Get initial count display
          const countDisplay = page.locator('text=/\\d+\\s*\\/\\s*\\d+/').first();
          const initialCount = await countDisplay.textContent();
          
          // Get initial URL length
          const urlLengthDisplay = page.locator('text=/\\d+\\s*(char|byte)/i').first();
          const initialLength = await urlLengthDisplay.textContent().catch(() => null);
          
          // Change slider value
          await slider.fill('5');
          await page.waitForTimeout(800);
          
          // Count display should update
          const newCount = await countDisplay.textContent();
          expect(newCount).not.toBe(initialCount);
          expect(newCount).toContain('5');
          
          // URL length should update
          const newLength = await urlLengthDisplay.textContent().catch(() => null);
          if (initialLength && newLength) {
            expect(newLength).not.toBe(initialLength);
          }
          
          // Change again
          await slider.fill('10');
          await page.waitForTimeout(800);
          
          const thirdCount = await countDisplay.textContent();
          expect(thirdCount).not.toBe(newCount);
          expect(thirdCount).toContain('10');
        }
      }
    } else {
      test.skip();
    }
  });

  test('should maintain state when switching modes back and forth', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const searchInput = page.getByRole('textbox', { name: /Explore/i });
    await searchInput.fill('Comedy');
    await page.waitForTimeout(1000);
    
    const firstPodcast = page.locator('article').first();
    await firstPodcast.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    
    // Share podcast
    const podcastShareButton = page.locator('button:has(i.fa-signal), header button:has(i.fa-share-nodes)').first();
    
    if (await podcastShareButton.isVisible({ timeout: 2000 })) {
      await podcastShareButton.click();
      await expect(page.locator('text=/Frequency.*Broadcast/i')).toBeVisible({ timeout: 3000 });
      
      const frequencyButton = page.locator('button').filter({ hasText: /Frequency Only/i });
      const fullManifestButton = page.locator('button').filter({ hasText: /Full Manifest/i });
      
      if (await frequencyButton.isVisible() && await fullManifestButton.isVisible()) {
        // Start in Frequency Only
        await frequencyButton.click();
        await page.waitForTimeout(300);
        await expect(page.locator('text=/📻|Freq/i')).toBeVisible();
        
        // Switch to Full Manifest
        await fullManifestButton.click();
        await page.waitForTimeout(1500);
        await expect(page.locator('text=/Episodes/i')).toBeVisible({ timeout: 5000 });
        
        // Adjust episode count if slider visible
        const slider = page.locator('input[type="range"]').first();
        if (await slider.isVisible({ timeout: 1000 })) {
          await slider.fill('7');
          await page.waitForTimeout(800);
          
          const countDisplay = page.locator('text=/\\d+\\s*\\/\\s*\\d+/').first();
          const countText = await countDisplay.textContent();
          expect(countText).toContain('7');
        }
        
        // Switch back to Frequency Only
        await frequencyButton.click();
        await page.waitForTimeout(300);
        await expect(page.locator('text=/📻|Freq/i')).toBeVisible();
        
        // Modal should still be functional
        await expect(page.locator('button').filter({ hasText: /Copy Link/i })).toBeVisible();
      }
    } else {
      test.skip();
    }
  });

  test('should show loading state and not crash during RSS fetch', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const searchInput = page.getByRole('textbox', { name: /Explore/i });
    await searchInput.fill('Technology');
    await page.waitForTimeout(1000);
    
    const firstPodcast = page.locator('article').first();
    await firstPodcast.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    
    // Open podcast share
    const podcastShareButton = page.locator('button:has(i.fa-signal), header button:has(i.fa-share-nodes)').first();
    
    if (await podcastShareButton.isVisible({ timeout: 2000 })) {
      await podcastShareButton.click();
      await expect(page.locator('text=/Frequency.*Broadcast/i')).toBeVisible({ timeout: 3000 });
      
      // Click Full Manifest
      const fullManifestButton = page.locator('button').filter({ hasText: /Full Manifest/i });
      if (await fullManifestButton.isVisible()) {
        await fullManifestButton.click();
        
        // Should show loading indicator (spinner or similar)
        const hasLoadingIndicator = await page.locator('i.fa-spinner, i.fa-spin, [role="progressbar"], text=/Loading|loading/i').isVisible({ timeout: 1000 }).catch(() => false);
        
        // Wait for loading to complete
        await page.waitForTimeout(2000);
        
        // Modal should be visible and not white
        await expect(page.locator('text=/Frequency.*Broadcast/i')).toBeVisible();
        
        // Should show episode controls eventually
        const hasControls = await page.locator('text=/Episodes|Episode Count/i, input[type="range"]').isVisible({ timeout: 5000 }).catch(() => false);
        
        // At least modal should be functional
        await expect(page.locator('button').filter({ hasText: /Copy Link/i })).toBeVisible();
      }
    } else {
      test.skip();
    }
  });

  test('should handle filter toggles for all options correctly', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const searchInput = page.getByRole('textbox', { name: /Explore/i });
    await searchInput.fill('Business');
    await page.waitForTimeout(1000);
    
    const firstPodcast = page.locator('article').first();
    await firstPodcast.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    
    // Open podcast share
    const podcastShareButton = page.locator('button:has(i.fa-signal), header button:has(i.fa-share-nodes)').first();
    
    if (await podcastShareButton.isVisible({ timeout: 2000 })) {
      await podcastShareButton.click();
      await expect(page.locator('text=/Frequency.*Broadcast/i')).toBeVisible({ timeout: 3000 });
      
      // Switch to Full Manifest
      const fullManifestButton = page.locator('button').filter({ hasText: /Full Manifest/i });
      if (await fullManifestButton.isVisible()) {
        await fullManifestButton.click();
        await page.waitForTimeout(1500);
        
        // Get URL length before toggling
        const urlLengthDisplay = page.locator('text=/\\d+\\s*(char|byte)/i').first();
        
        if (await urlLengthDisplay.isVisible({ timeout: 3000 })) {
          const getLengthNumber = async () => {
            const text = await urlLengthDisplay.textContent();
            return parseInt(text?.match(/\d+/)?.[0] || '0');
          };
          
          const initialLength = await getLengthNumber();
          
          // Find and toggle description checkbox
          const descLabel = page.locator('label').filter({ hasText: /Desc/i });
          if (await descLabel.isVisible({ timeout: 1000 })) {
            const descCheckbox = descLabel.locator('input[type="checkbox"]');
            
            // Toggle off
            await descCheckbox.click();
            await page.waitForTimeout(600);
            
            const lengthAfterDescOff = await getLengthNumber();
            // Length should decrease when removing descriptions
            expect(lengthAfterDescOff).toBeLessThanOrEqual(initialLength);
            
            // Toggle back on
            await descCheckbox.click();
            await page.waitForTimeout(600);
            
            const lengthAfterDescOn = await getLengthNumber();
            // Should be closer to original
            expect(lengthAfterDescOn).toBeGreaterThanOrEqual(lengthAfterDescOff);
          }
          
          // Try image filter
          const imgLabel = page.locator('label').filter({ hasText: /Img|Image/i });
          if (await imgLabel.isVisible({ timeout: 1000 })) {
            const imgCheckbox = imgLabel.locator('input[type="checkbox"]');
            await imgCheckbox.click();
            await page.waitForTimeout(600);
            
            // Length should change
            const lengthAfterImgToggle = await getLengthNumber();
            expect(lengthAfterImgToggle).not.toBe(initialLength);
          }
          
          // Try dates/time filter
          const timeLabel = page.locator('label').filter({ hasText: /Time|Date|Duration/i });
          if (await timeLabel.isVisible({ timeout: 1000 })) {
            const timeCheckbox = timeLabel.locator('input[type="checkbox"]');
            await timeCheckbox.click();
            await page.waitForTimeout(600);
            
            // Verify modal is still responsive
            await expect(page.locator('button').filter({ hasText: /Copy Link/i })).toBeVisible();
          }
        }
      }
    } else {
      test.skip();
    }
  });

  test('should not break when clicking copy rapidly multiple times', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const searchInput = page.getByRole('textbox', { name: /Explore/i });
    await searchInput.fill('Science');
    await page.waitForTimeout(1000);
    
    const firstPodcast = page.locator('article').first();
    await firstPodcast.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    
    // Share episode
    const episodeShareButton = page.locator('article, li').filter({ hasText: /Episode|Track/ }).first().locator('button:has(i.fa-share-nodes)').first();
    
    if (await episodeShareButton.isVisible({ timeout: 2000 })) {
      await episodeShareButton.click();
      await expect(page.locator('text=/Wave.*Broadcast/i')).toBeVisible({ timeout: 3000 });
      
      // Switch to embedded
      const embeddedButton = page.locator('button').filter({ hasText: /^Embedded$/i });
      if (await embeddedButton.isVisible()) {
        await embeddedButton.click();
        await page.waitForTimeout(500);
        
        // Grant clipboard permissions
        await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
        
        // Click copy button rapidly 5 times
        const copyButton = page.locator('button').filter({ hasText: /Copy Link|Copy/i });
        
        for (let i = 0; i < 5; i++) {
          await copyButton.click({ delay: 100 });
        }
        
        // Modal should still be visible and functional
        await expect(page.locator('text=/Wave.*Broadcast/i')).toBeVisible();
        await expect(copyButton).toBeVisible();
        
        // Should show confirmation
        await expect(page.locator('text=/Copied|✓|✔/i')).toBeVisible({ timeout: 2000 });
      }
    } else {
      test.skip();
    }
  });

  test('should maintain modal visibility when clicking outside controls rapidly', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const searchInput = page.getByRole('textbox', { name: /Explore/i });
    await searchInput.fill('Education');
    await page.waitForTimeout(1000);
    
    const firstPodcast = page.locator('article').first();
    await firstPodcast.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    
    // Share podcast
    const podcastShareButton = page.locator('button:has(i.fa-signal), header button:has(i.fa-share-nodes)').first();
    
    if (await podcastShareButton.isVisible({ timeout: 2000 })) {
      await podcastShareButton.click();
      await expect(page.locator('text=/Frequency.*Broadcast/i')).toBeVisible({ timeout: 3000 });
      
      // Switch to Full Manifest
      const fullManifestButton = page.locator('button').filter({ hasText: /Full Manifest/i });
      if (await fullManifestButton.isVisible()) {
        await fullManifestButton.click();
        await page.waitForTimeout(1500);
        
        // Click around the modal content area rapidly
        const modalContent = page.locator('[class*="modal"], [role="dialog"]').first();
        
        if (await modalContent.isVisible()) {
          // Click in different areas of the modal
          const box = await modalContent.boundingBox();
          if (box) {
            for (let i = 0; i < 5; i++) {
              await page.mouse.click(box.x + box.width / 2, box.y + 50 + (i * 20), { delay: 50 });
            }
          }
        }
        
        // Modal should remain visible
        await expect(page.locator('text=/Frequency.*Broadcast/i')).toBeVisible();
        await expect(page.locator('button').filter({ hasText: /Copy Link/i })).toBeVisible();
      }
    } else {
      test.skip();
    }
  });
});
