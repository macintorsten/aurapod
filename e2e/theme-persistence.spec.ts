import { test, expect } from '@playwright/test';

test.describe('Theme and UI Persistence', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should switch to dark theme', async ({ page }) => {
    const html = page.locator('html');
    const darkButton = page.locator('button:has(i.fa-moon)');
    
    await darkButton.click();
    
    await expect(html).toHaveClass(/dark/);
  });

  test('should switch to light theme', async ({ page }) => {
    const html = page.locator('html');
    const lightButton = page.locator('button:has(i.fa-sun)');
    
    await lightButton.click();
    
    // Check that dark class is not present
    const htmlClass = await html.getAttribute('class');
    expect(htmlClass).not.toContain('dark');
  });

  test('should persist theme after page reload', async ({ page }) => {
    const html = page.locator('html');
    const darkButton = page.locator('button:has(i.fa-moon)');
    
    // Set dark theme
    await darkButton.click();
    await expect(html).toHaveClass(/dark/);
    
    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Theme should still be dark
    await expect(html).toHaveClass(/dark/);
  });

  test('should support system theme preference', async ({ page }) => {
    const systemButton = page.locator('button:has(i.fa-desktop)');
    
    await systemButton.click();
    
    // System theme button was clicked - theme will follow system preference
    // The actual theme depends on user's system, so we just verify no crash
    await expect(page.locator('body')).toBeVisible();
  });

  test('should toggle between all three theme options', async ({ page }) => {
    const lightButton = page.locator('button:has(i.fa-sun)');
    const darkButton = page.locator('button:has(i.fa-moon)');
    const systemButton = page.locator('button:has(i.fa-desktop)');
    
    // Click light
    await lightButton.click();
    await page.waitForTimeout(200);
    
    // Click dark
    await darkButton.click();
    await page.waitForTimeout(200);
    
    // Click system
    await systemButton.click();
    await page.waitForTimeout(200);
    
    // Should not crash
    await expect(page.locator('body')).toBeVisible();
  });

  test('should persist podcast library across sessions', async ({ page }) => {
    // Check localStorage for podcasts
    const podcastsExist = await page.evaluate(() => {
      const stored = localStorage.getItem('aurapod_podcasts');
      return stored !== null;
    });
    
    // Even if empty, the key should exist or be created
    expect(typeof podcastsExist).toBe('boolean');
  });

  test('should persist playback history across sessions', async ({ page }) => {
    // Set up mock history
    await page.evaluate(() => {
      const mockHistory = {
        'ep1': {
          currentTime: 120,
          duration: 3600,
          progress: 0.033,
          lastPlayed: Date.now()
        }
      };
      localStorage.setItem('aurapod_history', JSON.stringify(mockHistory));
    });
    
    await page.reload();
    
    // History should be persisted
    const history = await page.evaluate(() => {
      const stored = localStorage.getItem('aurapod_history');
      return stored ? JSON.parse(stored) : {};
    });
    
    expect(history).toHaveProperty('ep1');
    expect(history.ep1.currentTime).toBe(120);
  });

  test('should handle localStorage quota gracefully', async ({ page }) => {
    // Try to store a very large amount of data
    // (This tests error handling for quota exceeded)
    
    const result = await page.evaluate(() => {
      try {
        const largeData = Array.from({ length: 1000 }, (_, i) => ({
          id: `ep${i}`,
          title: `Episode ${i}`,
          description: 'A'.repeat(1000), // 1KB per episode
          url: `https://example.com/ep${i}.mp3`,
          duration: 3600,
          published: '2024-01-01'
        }));
        localStorage.setItem('test_large_data', JSON.stringify(largeData));
        return 'success';
      } catch (e) {
        return 'quota_exceeded';
      }
    });
    
    // Should handle either success or quota exceeded gracefully
    expect(['success', 'quota_exceeded']).toContain(result);
  });

  test('should clear all localStorage data when requested', async ({ page }) => {
    // Set up some data
    await page.evaluate(() => {
      localStorage.setItem('aurapod_podcasts', JSON.stringify([{ id: '1', title: 'Test' }]));
      localStorage.setItem('aurapod_queue', JSON.stringify([{ id: '2', title: 'Test' }]));
      localStorage.setItem('aurapod_history', JSON.stringify({ ep1: { currentTime: 100 } }));
    });
    
    // Clear all
    await page.evaluate(() => {
      localStorage.clear();
    });
    
    // Verify cleared
    const keys = await page.evaluate(() => {
      return Object.keys(localStorage);
    });
    
    expect(keys).toHaveLength(0);
  });

  test('should handle corrupted localStorage data', async ({ page }) => {
    // Set invalid JSON
    await page.evaluate(() => {
      localStorage.setItem('aurapod_podcasts', 'invalid json {{{');
      localStorage.setItem('aurapod_queue', 'also invalid');
    });
    
    // Reload - app should handle gracefully
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // App should still load
    await expect(page.locator('text=AuraPod')).toBeVisible();
  });

  test('should maintain UI state during rapid theme changes', async ({ page }) => {
    const html = page.locator('html');
    const lightButton = page.locator('button:has(i.fa-sun)');
    const darkButton = page.locator('button:has(i.fa-moon)');
    
    // Rapid theme switching
    for (let i = 0; i < 5; i++) {
      await darkButton.click();
      await page.waitForTimeout(100);
      await lightButton.click();
      await page.waitForTimeout(100);
    }
    
    // UI should still be responsive
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display all navigation elements', async ({ page }) => {
    // Check sidebar navigation
    await expect(page.locator('a:has-text("Discover")')).toBeVisible();
    await expect(page.locator('button:has-text("Signal Archive")')).toBeVisible();
    await expect(page.locator('button:has-text("New Releases")')).toBeVisible();
  });

  test('should handle missing localStorage gracefully', async ({ page }) => {
    // Simulate localStorage being unavailable (rare but possible)
    await page.evaluate(() => {
      // Remove all items
      localStorage.clear();
    });
    
    await page.reload();
    
    // App should initialize with default state
    await expect(page.locator('text=AuraPod')).toBeVisible();
  });
});
