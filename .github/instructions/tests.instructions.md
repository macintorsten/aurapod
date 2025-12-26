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
- `npm run type:check` - TypeScript type checking
- `npm run test:unit` - Unit tests + coverage
- `npm run test:ci` - Type check + unit + unused (mirrors CI)
- `npm run test:all` - Full suite: type + unit + unused + e2e
- `npm run test:unused` - Dead code detection (ts-prune)
- ❌ NEVER: `test:watch`, `test:e2e:ui` (require interaction)

**Non-Interactive Execution** (agents only):
- Do not run commands that block or serve indefinitely (no `test:watch`, preview servers, etc.).
- Playwright HTML reporter must not auto-open; rely on config `open: 'never'`.
- In CI, use `npm run test:all` (exits immediately); avoid `--ui`.
- If a command could hang, output the command for the user instead of executing it.

**Reference**: See `TESTING_GUIDE.md` for patterns.
