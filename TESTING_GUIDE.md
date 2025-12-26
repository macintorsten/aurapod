# Testing Guide

Project-specific testing patterns for AuraPod. Focus on isolated testing and TDD workflow.

## Quick Reference

| Test Type | Location | Pattern | Key Point |
|---|---|---|---|
| **Components** | `src/components/__tests__/` | Wrap in Context providers | No full app mount |
| **Services** | `src/services/__tests__/` | Use factory with mocked deps | No cascading mocks |
| **Hooks** | `src/hooks/__tests__/` | `renderHook()` + `act()` | Mock storage/services |
| **E2E** | `e2e/` | Playwright full flows | Real app behavior |

## Component Testing

**Pattern**: Test with minimal context, not full app.

```typescript
// Provide only needed context
render(
  <PlaybackContext.Provider value={mockPlayback}>
    <EpisodeItem episode={mockEpisode} />
  </PlaybackContext.Provider>
);

expect(screen.getByText('Episode Title')).toBeInTheDocument();
```

**Key Points**:
- Mock context values, not Context itself
- Test behavior (clicks, renders), not implementation
- Use `userEvent` for interactions

## Service Testing

**Pattern**: Factory functions with dependency injection.

```typescript
// Mock dependencies
const mockRssService = { fetchPodcast: vi.fn() };
const mockPackt = { compressFeed: vi.fn(), decompressFeed: vi.fn() };

// Create service with mocks
const service = createShareService({
  rssService: mockRssService,
  packt: mockPackt,
});

// Test the service
const result = service.encode(feed);
expect(mockPackt.compressFeed).toHaveBeenCalled();
```

**Key Points**:
- Use `createServiceName()` factories defined in each service file
- No cascading mocks - inject what you need
- Test service contract, not internals

## Hook Testing

**Pattern**: `renderHook()` with mocked dependencies.

```typescript
// Mock storage service
vi.mock('../../services/storageService', () => ({
  storageService: {
    getQueue: vi.fn(() => []),
    saveQueue: vi.fn(),
  },
}));

const { result } = renderHook(() => useQueue());

act(() => {
  result.current.addToQueue(episode);
});

expect(result.current.queue).toContainEqual(episode);
```

**Key Point**: Wrap state updates in `act()`.

## Testing Audio Components

**Challenge**: JSDOM doesn't implement the Audio API, so components that create `new Audio()` will fail.

**Solution**: Create a MockAudio class that simulates the Audio API behavior.

```typescript
// In your test file
class MockAudio {
  src = '';
  currentTime = 0;
  duration = 100;
  playbackRate = 1;
  paused = true;
  
  private listeners: Record<string, Array<(event?: any) => void>> = {};
  
  async play() {
    this.paused = false;
    this.trigger('play');
    return Promise.resolve();
  }
  
  pause() {
    this.paused = true;
    this.trigger('pause');
  }
  
  addEventListener(event: string, handler: (event?: any) => void) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(handler);
    
    // Auto-trigger loadedmetadata for tests
    if (event === 'loadedmetadata') {
      setTimeout(() => handler(), 0);
    }
  }
  
  removeEventListener(event: string, handler: (event?: any) => void) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(h => h !== handler);
    }
  }
  
  // Helper for tests to simulate events
  trigger(event: string, data?: any) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(handler => handler(data));
    }
  }
}

// Apply mock globally
global.Audio = MockAudio as any;
```

**Key Points**:
- Implement `play()`, `pause()`, `addEventListener()`, `removeEventListener()`
- Auto-trigger `loadedmetadata` event for tests (avoids waiting for real load)
- Expose `trigger()` method to simulate events like `timeupdate`, `ended`, etc.
- See `PlayerContainer.test.tsx` for full example

**Example Usage**:
```typescript
const { result } = render(<PlayerContainer {...props} />);

// Audio element is created internally
const audio = result.container.querySelector('audio'); // Won't exist in MockAudio
// Instead, test behavior through user interactions

// Simulate time updates
const mockAudio = (global.Audio as any).instance; // If you track instances
mockAudio.currentTime = 30;
mockAudio.trigger('timeupdate');

await waitFor(() => {
  expect(props.onProgress).toHaveBeenCalledWith(30, 100);
});
```

## TDD Workflow

1. **Write failing test** - Define expected behavior
2. **Implement minimal code** - Make test pass
3. **Refactor** - Improve while keeping tests green
4. **Verify** - Run full suite

```bash
npm run test:watch  # Development
npm run test:unit   # Pre-commit
```

## Common Issues

**Component needs Context**: Wrap in provider, don't mock Context itself.

**Service mock not called**: Pass mock to factory function, not to singleton.

**Hook test hangs**: Wrap state updates in `act()`.

## Commands

```bash
npm run test          # Run unit tests once
npm run test:unit     # Unit tests with coverage
npm run type:check    # TypeScript type checking
npm run test:ci       # Type check + unit + unused code (mirrors CI)
npm run test:all      # Full suite: type + unit + unused + e2e (mirrors CI completely)
npm run test:unused   # Detect unused exports (ts-prune)
npm run test:watch    # Watch mode (interactive, development only)
npm run test:e2e      # E2E tests
npm run test:e2e:ui   # E2E with UI (interactive, development only)
```

**For AI agents**: Always use non-interactive commands (`test:ci`, `test:all`) to avoid hanging.

**Local CI mirror**: Run `npm run test:ci` before pushing to catch issues early. This runs the same checks as CI.

---

**Project-specific patterns only. See `.github/instructions/` for file-type specific guidance.**
