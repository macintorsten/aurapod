# Task: Improve Test Coverage & Quality for AuraPod

## Context
AuraPod is a podcast player React app with 55.12% test coverage (190 tests passing). I want to significantly improve testing quality and coverage through research-driven improvements.

## Your Mission
**Research the codebase first, then propose and implement improvements.** Don't assume - investigate.

## Goals
1. **Increase coverage to 75%+** in critical paths (services, hooks, components)
2. **Add E2E tests** for core user flows (currently only 5 E2E tests exist)
3. **Identify untested edge cases** through code analysis
4. **Improve test quality** - find brittle or shallow tests

## Available Skills
You have these skills available - USE THEM:
- `systematic-debugging` - When tests fail unexpectedly
- `test-driven-development` - When adding new test coverage
- `code-review` - To audit existing test quality
- `verification-before-completion` - Before claiming coverage targets met

## Research Phase (Do This First)
1. **Run coverage report** - Identify files with <50% coverage
2. **Analyze test patterns** - Look at existing tests in `**/__tests__/`
3. **Review E2E tests** - Check what flows are tested in `e2e/`
4. **Find critical paths** - Which services/hooks are most important?
5. **Check untested branches** - What error handlers aren't tested?

## Discovery Questions to Answer
- Which files have 0% coverage that should be tested?
- What user flows have no E2E coverage?
- Are async operations and error states tested?
- Are edge cases (empty states, network errors) covered?
- Which components have integration tests vs unit tests?

## Implementation Approach
1. Start with **low-hanging fruit** (high-impact, easy wins)
2. Focus on **critical paths first** (player, queue, RSS parsing)
3. Add **E2E tests** for 3-5 core user flows
4. Document testing patterns as you discover them

## Handling Bugs Discovered During Testing

**If you discover bugs while adding tests:**

### Approach 1: Document and Continue (Preferred for Coverage Goal)
1. **Document the bug** - Create clear bug report with:
   - What the bug is
   - How to reproduce
   - Expected vs actual behavior
   - Test that exposes it
2. **Write failing test** - Capture the bug in a test
3. **Skip the test** - Use `test.skip()` or `it.skip()` to mark it
4. **Continue coverage work** - Don't get derailed
5. **Report at end** - List all bugs found for separate fixing session

### Approach 2: Fix Critical Bugs Immediately
**Only if the bug:**
- Blocks other test work
- Is a data corruption risk
- Is trivial to fix (<5 min)
- Affects core functionality being tested

### Decision Tree
```
Discover bug while testing
  ↓
Is it blocking other tests?
  ├─ Yes → Fix it now
  └─ No → Is it a 1-line fix?
      ├─ Yes → Fix it now
      └─ No → Document and continue
```

### Documentation Format for Bugs Found
```markdown
## Bugs Discovered

### Bug: Player doesn't handle empty episode URL
- **File:** PlayerContext.tsx
- **Test:** `Player.test.tsx:145` (currently skipped)
- **Impact:** Error thrown instead of graceful handling
- **Fix needed:** Add URL validation before loadMedia()
```

**Goal:** Keep momentum on coverage work, don't get sidetracked by bug-fixing unless necessary.

## Constraints
- All existing tests must continue passing (190/190)
- Follow existing test patterns (see `TESTING_GUIDE.md`)
- Use TDD skill when appropriate
- Don't test implementation details - test behavior
- Mock external dependencies (network, audio, storage)

## Deliverables
1. Coverage increased to 75%+ (measured)
2. 5-10 new E2E tests for critical flows
3. Documentation of any new testing patterns discovered
4. List of bugs found (if any) with skipped tests
5. List of remaining gaps (if any) for future work

## Starting Point
Run coverage first, analyze the output, then create a plan based on what you discover. Let the codebase guide your priorities.
