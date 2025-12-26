/**
 * Service Container for Dependency Injection
 *
 * This module provides a service container that allows injecting dependencies
 * into services for testability. Services are designed to accept their
 * dependencies as factory parameters, enabling isolated testing without
 * cascading mocks.
 *
 * Architecture:
 * - ServiceContainer interface defines all available services
 * - Create*Service functions are factory functions that accept dependencies
 * - Default exports are singleton instances using real dependencies
 * - Tests can create service instances with mocked dependencies
 *
 * For AI Agents: This pattern enables:
 * 1. Testing services independently (no mocks for unrelated services)
 * 2. Swapping implementations (e.g., different compression algorithms)
 * 3. Gradual migration from singleton pattern to DI
 * 4. Backward compatibility (existing code still works)
 *
 * @see DEVELOPMENT.md for architecture context
 * @see TESTING_GUIDE.md for testing patterns using this container
 */

import type { RssService } from './rssService';
import type { storageService } from './storageService';
import type { castService } from './castService';
import type * as packt from '../lib/packt';

/**
 * Interface describing all services available in the application.
 * Used for dependency injection and testing.
 *
 * Each service is an object with methods that implement business logic.
 */
export interface ServiceContainer {
  /** Service for fetching and parsing RSS feeds */
  rssService: RssService;
  /** Service for browser localStorage management */
  storageService: typeof storageService;
  /** Service for playback history and bookmarks */
  castService: typeof castService;
  /** Packt library for feed compression/decompression */
  packt: typeof packt;
}

/**
 * Create a service container with the given dependencies.
 *
 * Use this for testing - inject mocked dependencies:
 * ```typescript
 * const mockRssService = { fetchPodcast: vi.fn() };
 * const container = createServiceContainer({
 *   rssService: mockRssService,
 *   // ... other services
 * });
 * ```
 *
 * @param dependencies Partial service container - missing services will use defaults
 * @returns ServiceContainer with provided and default services
 */
export const createServiceContainer = (
  dependencies?: Partial<ServiceContainer>
): ServiceContainer => {
  // Import actual service implementations
  const { rssService: defaultRssService } = require('./rssService');
  const { storageService: defaultStorageService } = require('./storageService');
  const { castService: defaultCastService } = require('./castService');
  const defaultPackt = require('../lib/packt');

  return {
    rssService: dependencies?.rssService ?? defaultRssService,
    storageService: dependencies?.storageService ?? defaultStorageService,
    castService: dependencies?.castService ?? defaultCastService,
    packt: dependencies?.packt ?? defaultPackt,
  };
};
