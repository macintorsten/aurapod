---
name: Test File Instructions
description: Testing patterns and TDD workflow
applyTo: "**/*.test.{ts,tsx}|**/*.config.{ts,js}|.github/workflows/*.yml|package.json"
---

# Testing Patterns

**Use Skill**: `test-driven-development` - Follow TDD workflow strictly.

**TDD Workflow**: Write failing test → implement minimal code → refactor → verify

**Component Tests**: Use contexts, not full app. Mock only external services.

**Service Tests**: Test with mocked dependencies via factory functions (see `services.instructions.md`).

**Hook Tests**: Use `renderHook()` from `@testing-library/react`. Wrap state updates in `act()`.

**Test Commands** (non-interactive only):
- `npm run test:unit` - Unit tests + coverage
- `npm run test:ci` - Unit + unused code (mirrors CI)
- `npm run test:all` - Full suite: unit + unused + e2e
- `npm run test:unused` - Dead code detection (ts-prune)
- ❌ NEVER: `test:watch`, `test:e2e:ui` (require interaction)

**Reference**: See `TESTING_GUIDE.md` for patterns.
