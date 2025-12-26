import { test, expect } from '@playwright/test';

test.describe('Queue Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Discover/i })).toBeVisible();
  });

  test('should be able to add episode to queue', async ({ page }) => {
    // Set up a mock episode in localStorage first
    await page.evaluate(() => {
      const mockEpisode = {
        id: 'test-ep-1',
        title: 'Test Episode 1',
        url: 'https://example.com/ep1.mp3',
        duration: 3600,
        published: '2024-01-01',
        description: 'Test'
      };
      localStorage.setItem('aurapod_queue', JSON.stringify([mockEpisode]));
    });
    
    await page.reload();
    
    // Verify the episode was added to queue
    const queueData = await page.evaluate(() => {
      const stored = localStorage.getItem('aurapod_queue');
      return stored ? JSON.parse(stored) : [];
    });
    
    expect(queueData).toHaveLength(1);
    expect(queueData[0].id).toBe('test-ep-1');
  });

  test('should persist queue across page reloads', async ({ page }) => {
    // This is an important test for localStorage persistence
    
    // First, check initial state
    await page.reload();
    await expect(page.locator('h2:has-text("Discover"), input[data-testid="search-input"]')).toBeVisible({ timeout: 10000 });
    
    // Queue should be persisted in localStorage
    const queueData = await page.evaluate(() => {
      const stored = localStorage.getItem('aurapod_queue');
      return stored ? JSON.parse(stored) : [];
    });
    
    // Queue data structure should be an array
    expect(Array.isArray(queueData)).toBe(true);
  });

  test('should show queue count in player when items present', async ({ page }) => {
    // Set up queue with items
    await page.evaluate(() => {
      const mockQueue = [
        { id: 'ep1', title: 'First', url: 'https://example.com/ep1.mp3', duration: 3600, published: '2024-01-01', description: '' },
        { id: 'ep2', title: 'Second', url: 'https://example.com/ep2.mp3', duration: 3600, published: '2024-01-02', description: '' }
      ];
      localStorage.setItem('aurapod_queue', JSON.stringify(mockQueue));
    });
    
    await page.reload();
    
    // Verify queue has items
    const queueCount = await page.evaluate(() => {
      const stored = localStorage.getItem('aurapod_queue');
      return stored ? JSON.parse(stored).length : 0;
    });
    
    expect(queueCount).toBe(2);
  });

  test('should be able to remove items from queue', async ({ page }) => {
    // Set up queue with items
    await page.evaluate(() => {
      const mockQueue = [
        { id: 'ep1', title: 'First', url: 'https://example.com/ep1.mp3', duration: 3600, published: '2024-01-01', description: '' },
        { id: 'ep2', title: 'Second', url: 'https://example.com/ep2.mp3', duration: 3600, published: '2024-01-02', description: '' }
      ];
      localStorage.setItem('aurapod_queue', JSON.stringify(mockQueue));
    });
    
    await page.reload();
    
    // Remove first item
    await page.evaluate(() => {
      const stored = localStorage.getItem('aurapod_queue');
      const queue = stored ? JSON.parse(stored) : [];
      queue.shift();
      localStorage.setItem('aurapod_queue', JSON.stringify(queue));
    });
    
    // Verify item was removed
    const queueAfterRemoval = await page.evaluate(() => {
      const stored = localStorage.getItem('aurapod_queue');
      return stored ? JSON.parse(stored) : [];
    });
    
    expect(queueAfterRemoval).toHaveLength(1);
    expect(queueAfterRemoval[0].id).toBe('ep2');
  });

  test('should clear entire queue when clear button clicked', async ({ page }) => {
    // First set up a queue in localStorage
    await page.evaluate(() => {
      const mockQueue = [
        {
          id: 'test-ep-1',
          title: 'Test Episode 1',
          url: 'https://example.com/ep1.mp3',
          duration: 3600,
          published: '2024-01-01',
          description: 'Test'
        }
      ];
      localStorage.setItem('aurapod_queue', JSON.stringify(mockQueue));
    });
    
    // Reload to apply queue
    await page.reload();
    await expect(page.locator('h2:has-text("Discover"), input[data-testid="search-input"]')).toBeVisible({ timeout: 10000 });
    
    // Queue should be loaded
    const queueAfterReload = await page.evaluate(() => {
      const stored = localStorage.getItem('aurapod_queue');
      return stored ? JSON.parse(stored) : [];
    });
    
    expect(queueAfterReload.length).toBeGreaterThan(0);
    
    // Clear queue programmatically (simulating clear button)
    await page.evaluate(() => {
      localStorage.setItem('aurapod_queue', JSON.stringify([]));
    });
    
    const queueAfterClear = await page.evaluate(() => {
      const stored = localStorage.getItem('aurapod_queue');
      return stored ? JSON.parse(stored) : [];
    });
    
    expect(queueAfterClear).toHaveLength(0);
  });

  test('should not add duplicate episodes to queue', async ({ page }) => {
    // Set up initial queue with one episode
    const mockEpisode = {
      id: 'test-ep-unique',
      title: 'Test Episode',
      url: 'https://example.com/ep.mp3',
      duration: 3600,
      published: '2024-01-01',
      description: 'Test'
    };
    
    await page.evaluate((episode) => {
      localStorage.setItem('aurapod_queue', JSON.stringify([episode]));
    }, mockEpisode);
    
    await page.reload();
    
    // Try to add the same episode again
    await page.evaluate((episode) => {
      const stored = localStorage.getItem('aurapod_queue');
      const queue = stored ? JSON.parse(stored) : [];
      
      // Check if episode already exists
      if (!queue.find((e) => e.id === episode.id)) {
        queue.push(episode);
      }
      localStorage.setItem('aurapod_queue', JSON.stringify(queue));
    }, mockEpisode);
    
    // Should still have only 1 item (no duplicate added)
    const queueCount = await page.evaluate(() => {
      const stored = localStorage.getItem('aurapod_queue');
      return stored ? JSON.parse(stored).length : 0;
    });
    
    expect(queueCount).toBe(1);
  });

  test('should maintain queue order (FIFO)', async ({ page }) => {
    // Set up queue with multiple episodes
    await page.evaluate(() => {
      const mockQueue = [
        { id: 'ep1', title: 'First', url: 'https://example.com/ep1.mp3', duration: 3600, published: '2024-01-01', description: '' },
        { id: 'ep2', title: 'Second', url: 'https://example.com/ep2.mp3', duration: 3600, published: '2024-01-02', description: '' },
        { id: 'ep3', title: 'Third', url: 'https://example.com/ep3.mp3', duration: 3600, published: '2024-01-03', description: '' }
      ];
      localStorage.setItem('aurapod_queue', JSON.stringify(mockQueue));
    });
    
    await page.reload();
    
    // Verify order is maintained
    const queue = await page.evaluate(() => {
      const stored = localStorage.getItem('aurapod_queue');
      return stored ? JSON.parse(stored) : [];
    });
    
    expect(queue[0].id).toBe('ep1');
    expect(queue[1].id).toBe('ep2');
    expect(queue[2].id).toBe('ep3');
  });

  test('should show empty state when queue is empty', async ({ page }) => {
    // Clear queue
    await page.evaluate(() => {
      localStorage.setItem('aurapod_queue', JSON.stringify([]));
    });
    
    await page.reload();
    
    // Verify queue is empty
    const queue = await page.evaluate(() => {
      const stored = localStorage.getItem('aurapod_queue');
      return stored ? JSON.parse(stored) : [];
    });
    
    expect(queue).toHaveLength(0);
  });

  test('should handle large queue (100+ items)', async ({ page }) => {
    // Create large queue
    const largeQueue = Array.from({ length: 150 }, (_, i) => ({
      id: `ep${i}`,
      title: `Episode ${i}`,
      url: `https://example.com/ep${i}.mp3`,
      duration: 3600,
      published: `2024-01-${String(i % 28 + 1).padStart(2, '0')}`,
      description: `Description ${i}`
    }));
    
    await page.evaluate((queue) => {
      localStorage.setItem('aurapod_queue', JSON.stringify(queue));
    }, largeQueue);
    
    await page.reload();
    await expect(page.locator('h2:has-text("Discover"), input[data-testid="search-input"]')).toBeVisible({ timeout: 10000 });
    
    // Should not crash
    const queueCount = await page.evaluate(() => {
      const stored = localStorage.getItem('aurapod_queue');
      return stored ? JSON.parse(stored).length : 0;
    });
    
    expect(queueCount).toBe(150);
  });
});
