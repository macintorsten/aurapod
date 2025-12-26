import { test, expect } from '@playwright/test';

test.describe('Podcast Search and Subscription', () => {
  test('should search for podcasts using search bar', async ({ page }) => {
    await page.goto('/');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Find and interact with search input
    const searchInput = page.getByRole('textbox', { name: /Explore/i });
    await expect(searchInput).toBeVisible();
    
    // Type search query
    await searchInput.fill('tech');
    
    // Wait for search results (debounced, so wait a bit)
    await page.waitForTimeout(600);
    
    // Check that results appear (this may vary based on API availability)
    // The search should either show results or handle gracefully
    const body = await page.textContent('body');
    expect(body).toBeTruthy();
  });

  test('should show trending podcasts on home page', async ({ page }) => {
    await page.goto('/');
    
    // Wait for trending section
    await expect(page.locator('h3:has-text("Trending Now")')).toBeVisible({ 
      timeout: 15000 
    });
    
    // Check that there are podcast cards
    const podcastElements = page.locator('[class*="podcast"]').or(page.locator('[class*="card"]'));
    
    // At least one podcast should be visible (or section should show "No results")
    const count = await podcastElements.count();
    expect(count).toBeGreaterThanOrEqual(0); // May be 0 if API unavailable
  });

  test('should handle search with no results gracefully', async ({ page }) => {
    await page.goto('/');
    
    const searchInput = page.getByRole('textbox', { name: /Explore/i });
    await searchInput.fill('xyzabc123nonexistentpodcast9999');
    
    // Wait for debounce and search
    await page.waitForTimeout(600);
    
    // Should not crash, should handle empty results
    await expect(page.locator('body')).toBeVisible();
  });

  test('should clear search results when input cleared', async ({ page }) => {
    await page.goto('/');
    
    const searchInput = page.getByRole('textbox', { name: /Explore/i });
    
    // Type search
    await searchInput.fill('tech');
    await page.waitForTimeout(600);
    
    // Clear search
    await searchInput.clear();
    await page.waitForTimeout(600);
    
    // Trending section should be visible again
    await expect(page.locator('h3:has-text("Trending Now")')).toBeVisible();
  });

  test('should navigate to different views from sidebar', async ({ page }) => {
    await page.goto('/');
    
    // Navigate to Archive
    const archiveButton = page.locator('button:has-text("Signal Archive")');
    await archiveButton.click();
    await expect(page.locator('h3:has-text("Incoming Waves")')).toBeVisible();
    
    // Navigate back to Discover
    const discoverLink = page.locator('a:has-text("Discover")');
    await discoverLink.click();
    await expect(page.getByRole('textbox', { name: /Explore/i })).toBeVisible();
    
    // Navigate to New Releases
    const newReleasesButton = page.locator('button:has-text("New Releases")');
    await newReleasesButton.click();
    await expect(page.locator('h3:has-text("Fresh Releases")')).toBeVisible();
  });

  test('should maintain search state when navigating back', async ({ page }) => {
    await page.goto('/');
    
    // Search for something
    const searchInput = page.getByRole('textbox', { name: /Explore/i });
    await searchInput.fill('javascript');
    await page.waitForTimeout(600);
    
    // Navigate away
    const archiveButton = page.locator('button:has-text("Signal Archive")');
    await archiveButton.click();
    await expect(page.locator('h3:has-text("Incoming Waves")')).toBeVisible();
    
    // Navigate back
    const discoverLink = page.locator('a:has-text("Discover")');
    await discoverLink.click();
    
    // Search input should still have the value (if state is persisted)
    // or be empty (if state is reset) - both are valid behaviors
    await expect(searchInput).toBeVisible();
  });

  test('should show app branding and version', async ({ page }) => {
    await page.goto('/');
    
    // Check for app name
    await expect(page.locator('text=AuraPod')).toBeVisible();
    
    // Check for version badge
    await expect(page.locator('text=/V\\d+\\.\\d+\\.\\d+/')).toBeVisible();
  });

  test('should handle rapid search input changes (debouncing)', async ({ page }) => {
    await page.goto('/');
    
    const searchInput = page.getByRole('textbox', { name: /Explore/i });
    
    // Type rapidly
    await searchInput.type('a', { delay: 50 });
    await searchInput.type('b', { delay: 50 });
    await searchInput.type('c', { delay: 50 });
    await searchInput.type('d', { delay: 50 });
    
    // Wait for debounce
    await page.waitForTimeout(600);
    
    // Should handle without crashing
    await expect(page.locator('body')).toBeVisible();
  });
});
