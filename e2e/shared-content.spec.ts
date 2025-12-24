import { test, expect } from '@playwright/test';
import { shareService, SharedData } from '../src/services/shareService';

test.describe('Shared Content - Virtual Podcasts', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should display shared single track as virtual podcast', async ({ page }) => {
    // Create a shared single track
    const sharedData: SharedData = {
      shareType: 'track',
      shareMode: 'embedded-payload',
      t: 'Test Shared Episode',
      u: 'https://example.com/test-audio.mp3',
      d: 'This is a test shared episode',
      st: 'Test Shared Podcast',
      si: 'https://example.com/podcast-image.jpg',
    };

    const encoded = shareService.encode(sharedData);
    await page.goto(`/#/?s=${encoded}`);
    
    // Wait for navigation to shared podcast view
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500); // Give time for navigation

    // Should show "Shared Content" badge instead of "Broadcast Verified"
    await expect(page.locator('text=Shared Content')).toBeVisible({ timeout: 5000 });

    // Should display podcast title
    await expect(page.locator('h3:has-text("Test Shared Podcast")')).toBeVisible();

    // Should display the shared episode in the episode list
    await expect(page.getByRole('main').getByRole('heading', { name: 'Test Shared Episode' })).toBeVisible();

    // Should NOT show subscribe button for virtual podcast
    await expect(page.locator('button:has-text("SUBSCRIBE")')).not.toBeVisible();

    // Episode should NOT auto-play
    // Check that player is not visible or in playing state
    const playerButton = page.locator('button:has(i.fa-pause)');
    await expect(playerButton).not.toBeVisible();
  });

  test('should display shared manifest as virtual podcast with multiple episodes', async ({ page }) => {
    // Create a shared manifest with multiple episodes
    const sharedData: SharedData = {
      shareType: 'rss',
      shareMode: 'full-manifest',
      pt: 'Shared Multi-Episode Podcast',
      pi: 'https://example.com/podcast.jpg',
      pd: 'A collection of shared episodes',
      episodes: [
        {
          id: 'ep1',
          title: 'Episode 1',
          audioUrl: 'https://example.com/ep1.mp3',
          description: 'First episode',
          duration: '30:00',
          pubDate: '2025-01-01',
        },
        {
          id: 'ep2',
          title: 'Episode 2',
          audioUrl: 'https://example.com/ep2.mp3',
          description: 'Second episode',
          duration: '45:00',
          pubDate: '2025-01-02',
        },
      ],
    };

    const encoded = shareService.encode(sharedData);
    await page.goto(`/#/?s=${encoded}`);
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Should show "Shared Content" badge
    await expect(page.locator('text=Shared Content')).toBeVisible({ timeout: 5000 });

    // Should display podcast title
    await expect(page.locator('h3:has-text("Shared Multi-Episode Podcast")')).toBeVisible();

    // Should display both episodes
    await expect(page.locator('text=Episode 1')).toBeVisible();
    await expect(page.locator('text=Episode 2')).toBeVisible();

    // Should NOT show subscribe button
    await expect(page.locator('button:has-text("SUBSCRIBE")')).not.toBeVisible();

    // Episodes should NOT auto-play
    const playerButton = page.locator('button:has(i.fa-pause)');
    await expect(playerButton).not.toBeVisible();
  });

  test('should allow playing episodes from shared content', async ({ page }) => {
    // Create a shared single track
    const sharedData: SharedData = {
      shareType: 'track',
      shareMode: 'embedded-payload',
      t: 'Playable Shared Episode',
      u: 'https://example.com/audio.mp3',
      st: 'Playable Podcast',
    };

    const encoded = shareService.encode(sharedData);
    await page.goto(`/#/?s=${encoded}`);
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Find and click the play button on the episode
    const playButton = page.locator('button:has(i.fa-play)').first();
    await expect(playButton).toBeVisible({ timeout: 5000 });
    
    // Click play button
    await playButton.click();

    // Player should now be visible with the episode (check in player area)
    const playerHeading = page.locator('text=Playable Shared Episode').last();
    await expect(playerHeading).toBeVisible();
  });

  test('should handle invalid shared data gracefully', async ({ page }) => {
    // Navigate with invalid encoded data
    await page.goto('/#/?s=invalid_data_123');
    
    await page.waitForLoadState('networkidle');

    // Should redirect to home page without crashing
    await expect(page.locator('h2:has-text("Discover")')).toBeVisible({ timeout: 5000 });
  });

  test('should preserve shared content across page navigation', async ({ page }) => {
    // Create shared content
    const sharedData: SharedData = {
      shareType: 'track',
      shareMode: 'embedded-payload',
      t: 'Persistent Episode',
      u: 'https://example.com/persistent.mp3',
      st: 'Persistent Podcast',
    };

    const encoded = shareService.encode(sharedData);
    await page.goto(`/#/?s=${encoded}`);
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Verify content is displayed
    await expect(page.locator('text=Shared Content')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('h3:has-text("Persistent Podcast")')).toBeVisible();

    // Navigate away to home
    await page.locator('a:has-text("Discover")').click();
    await expect(page.locator('h2:has-text("Discover")')).toBeVisible();

    // Navigate back
    await page.goBack();
    await page.waitForLoadState('networkidle');

    // Content should still be visible
    await expect(page.locator('text=Shared Content')).toBeVisible();
    await expect(page.locator('h3:has-text("Persistent Podcast")')).toBeVisible();
  });

  test('should display virtual podcast description correctly', async ({ page }) => {
    const sharedData: SharedData = {
      shareType: 'rss',
      shareMode: 'full-manifest',
      pt: 'Descriptive Podcast',
      pd: 'This is a detailed description of the shared podcast content.',
      pi: 'https://example.com/podcast.jpg',
      episodes: [{
        id: 'ep1',
        title: 'Episode 1',
        audioUrl: 'https://example.com/ep1.mp3',
      }],
    };

    const encoded = shareService.encode(sharedData);
    await page.goto(`/#/?s=${encoded}`);
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Check that description is displayed
    await expect(page.locator('text=This is a detailed description')).toBeVisible({ timeout: 5000 });
  });

  test('should show default values for missing shared content fields', async ({ page }) => {
    // Create minimal shared data
    const sharedData: SharedData = {
      shareType: 'track',
      shareMode: 'embedded-payload',
      t: 'Minimal Episode',
      u: 'https://example.com/minimal.mp3',
    };

    const encoded = shareService.encode(sharedData);
    await page.goto(`/#/?s=${encoded}`);
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Should show default podcast title
    await expect(page.locator('text=Shared Track')).toBeVisible({ timeout: 5000 });

    // Should still display the episode
    await expect(page.locator('text=Minimal Episode')).toBeVisible();
  });
});
