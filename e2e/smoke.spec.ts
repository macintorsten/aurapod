import { test, expect } from '@playwright/test';
import { mockAllItunes, mockFeedFetch } from './fixtures/network-mocks';

test.describe('AuraPod - Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    await mockAllItunes(page);
    await mockFeedFetch(page);
  });
  test('should load home page successfully', async ({ page }) => {
    await page.goto('/');
    
    // Check that the app name is visible
    await expect(page.locator('text=AuraPod')).toBeVisible();
    
    // Check that the discover link exists
    await expect(page.locator('a:has-text("Discover")')).toBeVisible();
  });

  test('should display search input', async ({ page }) => {
    await page.goto('/');
    
    const searchInput = page.getByTestId('search-input');
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toBeEditable();
  });

  test('should display trending podcasts section', async ({ page }) => {
    await page.goto('/');
    
    // Wait for trending section to load
    await expect(page.locator('h3:has-text("Trending Now")')).toBeVisible({ timeout: 10000 });
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
    await expect(page.getByTestId('search-input')).toBeVisible();
    
    // Go to new releases
    await newReleasesButton.click();
    await expect(page.locator('h3:has-text("Fresh Releases")')).toBeVisible();
  });
});
