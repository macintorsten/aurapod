import { test, expect } from '@playwright/test';

test.describe('AuraPod - Smoke Tests', () => {
  test('should load home page successfully', async ({ page }) => {
    await page.goto('/');
    
    // Check that the app name is visible
    await expect(page.locator('text=AuraPod')).toBeVisible();
    
    // Check that the discover link exists
    await expect(page.locator('a:has-text("Discover")')).toBeVisible();
  });

  test('should display search input', async ({ page }) => {
    await page.goto('/');
    
    const searchInput = page.getByRole('textbox', { name: /Explore/i });
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toBeEditable();
  });

  test('should display trending podcasts section', async ({ page }) => {
    await page.goto('/');
    
    // Wait for trending section to load
    await expect(page.locator('h3:has-text("Trending Now")')).toBeVisible({ timeout: 10000 });
  });

  test('should have theme switcher', async ({ page }) => {
    await page.goto('/');
    
    // Check for theme buttons
    const lightButton = page.locator('button:has(i.fa-sun)');
    const darkButton = page.locator('button:has(i.fa-moon)');
    const systemButton = page.locator('button:has(i.fa-desktop)');
    
    await expect(lightButton).toBeVisible();
    await expect(darkButton).toBeVisible();
    await expect(systemButton).toBeVisible();
  });

  test('should toggle dark mode', async ({ page }) => {
    await page.goto('/');
    
    const html = page.locator('html');
    const darkButton = page.locator('button:has(i.fa-moon)');
    
    // Click dark theme button
    await darkButton.click();
    
    // Verify dark class applied
    await expect(html).toHaveClass(/dark/);
  });

  test('should navigate to archive view', async ({ page }) => {
    await page.goto('/');
    
    const archiveButton = page.locator('button:has-text("Signal Archive")');
    await archiveButton.click();
    
    // Check that archive view is active
    await expect(page.locator('h3:has-text("Incoming Waves")')).toBeVisible();
    await expect(page.locator('h3:has-text("Wave Archive")')).toBeVisible();
  });

  test('should navigate to new releases view', async ({ page }) => {
    await page.goto('/');
    
    const newReleasesButton = page.locator('button:has-text("New Releases")');
    await newReleasesButton.click();
    
    // Check that new releases view loaded
    await expect(page.locator('h3:has-text("Fresh Releases")')).toBeVisible();
  });

  test('should persist theme selection after reload', async ({ page }) => {
    await page.goto('/');
    
    const html = page.locator('html');
    const darkButton = page.locator('button:has(i.fa-moon)');
    
    // Set dark theme
    await darkButton.click();
    await expect(html).toHaveClass(/dark/);
    
    // Reload page
    await page.reload();
    
    // Verify dark theme persisted
    await expect(html).toHaveClass(/dark/);
  });

  test('should display version information', async ({ page }) => {
    await page.goto('/');
    
    // Check for version badge in sidebar
    await expect(page.locator('text=/V\\d+\\.\\d+\\.\\d+/')).toBeVisible();
  });

  test('should have functional navigation', async ({ page }) => {
    await page.goto('/');
    
    // Navigate through different views
    const discoverLink = page.locator('a:has-text("Discover")');
    const archiveButton = page.locator('button:has-text("Signal Archive")');
    const newReleasesButton = page.locator('button:has-text("New Releases")');
    
    // Go to archive
    await archiveButton.click();
    await expect(page.locator('h3:has-text("Incoming Waves")')).toBeVisible();
    
    // Go back to discover
    await discoverLink.click();
    await expect(page.getByRole('textbox', { name: /Explore/i })).toBeVisible();
    
    // Go to new releases
    await newReleasesButton.click();
    await expect(page.locator('h3:has-text("Fresh Releases")')).toBeVisible();
  });
});
