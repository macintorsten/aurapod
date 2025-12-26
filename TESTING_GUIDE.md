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
- Use `createServiceName()` factories (see `src/services/container.ts`)
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
npm run test:unit      # Run once
npm run test:watch     # Watch mode
npm run test:e2e       # End-to-end tests
```

---

**Project-specific patterns only. See `.github/instructions/` for file-type specific guidance.**
