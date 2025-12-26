---
name: Test File Instructions
description: Testing patterns and TDD workflow
applyTo: "**/*.test.{ts,tsx}"
---

# Testing Patterns

**Use Skill**: `test-driven-development` - Follow TDD workflow strictly.

**TDD Workflow**: Write failing test → implement minimal code → refactor → verify

**Component Tests**: Use contexts, not full app. Mock only external services.

**Service Tests**: Test with mocked dependencies via factory functions (see `services.instructions.md`).

**Hook Tests**: Use `renderHook()` from `@testing-library/react`. Wrap state updates in `act()`.

**Reference**: See `TESTING_GUIDE.md` for detailed patterns and examples.
