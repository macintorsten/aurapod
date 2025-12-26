import { test, expect } from '@playwright/test';
import { shareService, Feed } from '../src/services/shareService';

test.describe('Shared Content - Virtual Podcasts', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('textbox', { name: /Explore/i })).toBeVisible();
  });

  test('should display shared single track as virtual podcast', async ({ page }) => {
    // Create a shared single track
    const feed: Feed = {
      title: 'Test Shared Podcast',
      description: null,
      url: null,
      tracks: [{
        title: 'Test Shared Episode',
        url: 'https://example.com/test-audio.mp3',
        description: 'This is a test shared episode',
        date: null,
        duration: null
      }]
    };

    const encoded = shareService.encode(feed);
    await page.goto(`/#/?s=${encoded}`);
    
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
    const feed: Feed = {
      title: 'Shared Multi-Episode Podcast',
      description: 'A collection of shared episodes',
      url: null,
      tracks: [
        {
          title: 'Episode 1',
          url: 'https://example.com/ep1.mp3',
          description: 'First episode',
          date: Math.floor(new Date('2025-01-01').getTime() / 1000),
          duration: 1800
        },
        {
          title: 'Episode 2',
          url: 'https://example.com/ep2.mp3',
          description: 'Second episode',
          date: Math.floor(new Date('2025-01-02').getTime() / 1000),
          duration: 2700
        }
      ]
    };

    const encoded = shareService.encode(feed);
    await page.goto(`/#/?s=${encoded}`);
    
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
    const feed: Feed = {
      title: 'Playable Podcast',
      description: null,
      url: null,
      tracks: [{
        title: 'Playable Shared Episode',
        url: 'https://example.com/audio.mp3',
        description: null,
        date: null,
        duration: null
      }]
    };

    const encoded = shareService.encode(feed);
    await page.goto(`/#/?s=${encoded}`);
    
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
    
    // Should redirect to home page without crashing
    await expect(page.locator('h2:has-text("Discover")')).toBeVisible({ timeout: 5000 });
  });

  test('should preserve shared content across page navigation', async ({ page }) => {
    // Create shared content
    const feed: Feed = {
      title: 'Persistent Podcast',
      description: null,
      url: null,
      tracks: [{
        title: 'Persistent Episode',
        url: 'https://example.com/persistent.mp3',
        description: null,
        date: null,
        duration: null
      }]
    };

    const encoded = shareService.encode(feed);
    await page.goto(`/#/?s=${encoded}`);
    
    // Verify content is displayed
    await expect(page.locator('text=Shared Content')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('h3:has-text("Persistent Podcast")')).toBeVisible();

    // Navigate away to home
    await page.locator('a:has-text("Discover")').click();
    await expect(page.locator('h2:has-text("Discover")')).toBeVisible();

    // Navigate back
    await page.goBack();

    // Content should still be visible
    await expect(page.locator('text=Shared Content')).toBeVisible();
    await expect(page.locator('h3:has-text("Persistent Podcast")')).toBeVisible();
  });

  test('should display virtual podcast description correctly', async ({ page }) => {
    const feed: Feed = {
      title: 'Descriptive Podcast',
      description: 'This is a detailed description of the shared podcast content.',
      url: null,
      tracks: [{
        title: 'Episode 1',
        url: 'https://example.com/ep1.mp3',
        description: null,
        date: null,
        duration: null
      }]
    };

    const encoded = shareService.encode(feed);
    await page.goto(`/#/?s=${encoded}`);
    
    // Check that description is displayed
    await expect(page.locator('text=This is a detailed description')).toBeVisible({ timeout: 5000 });
  });

  test('should show default values for missing shared content fields', async ({ page }) => {
    // Create minimal shared data
    const feed: Feed = {
      title: null,
      description: null,
      url: null,
      tracks: [{
        title: 'Minimal Episode',
        url: 'https://example.com/minimal.mp3',
        description: null,
        date: null,
        duration: null
      }]
    };

    const encoded = shareService.encode(feed);
    await page.goto(`/#/?s=${encoded}`);
    
    // Should show default podcast title
    await expect(page.locator('text=Shared Track')).toBeVisible({ timeout: 5000 });

    // Should still display the episode
    await expect(page.locator('text=Minimal Episode')).toBeVisible();
  });
});
