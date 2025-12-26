---
name: Service Layer Instructions
description: Dependency injection pattern for services
applyTo: "src/services/**/*Service.ts"
---

# Service Layer Pattern

**Before modifying**: Use `test-driven-development` skill - write tests first.

Services use dependency injection for testability:

```typescript
// Create factory function accepting dependencies
export const createMyService = (deps: { otherService: typeof otherService }) => ({
  myMethod: () => deps.otherService.doSomething()
});

// Export default instance for backward compatibility
export const myService = createMyService({ otherService });
```

**Testing**: Create test instances with mocked dependencies via `createMyService()` - no cascading mocks needed.

**Container**: Import `ServiceContainer` type from `src/services/container.ts` for type safety.
