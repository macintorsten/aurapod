---
name: Component Instructions
description: Component architecture and testing patterns
applyTo: "src/components/**/*.tsx"
---

# Component Architecture

**Creating new component?** Use `brainstorming` skill first to explore design.

**Goal**: Test components in isolation without rendering full app.

**Container/Presentation Split** (for complex components):
- **Container**: State, effects, handlers, service calls
- **Presentation**: Props only, pure rendering, no logic

**Context Usage**: Use `useAppContext()`, `usePlayerContext()`, `useUIContext()` instead of prop drilling.

**Testing**: Test presentation components with mocked context values. Test containers verify state management logic.
