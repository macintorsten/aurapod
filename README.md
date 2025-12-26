# AuraPod

[![Test](https://github.com/macintorsten/aurapod/actions/workflows/test.yml/badge.svg)](https://github.com/macintorsten/aurapod/actions/workflows/test.yml)
[![Deploy](https://github.com/macintorsten/aurapod/actions/workflows/deploy.yml/badge.svg)](https://github.com/macintorsten/aurapod/actions/workflows/deploy.yml)

![AuraPod Screenshot](auropod_screenshot.png)

A client-side podcast player web application built to run entirely in your browser.

**⚠️ Under Heavy Development**  
This project is in active development and is expected to have bugs, particularly related to CORS (Cross-Origin Resource Sharing) issues when fetching podcast feeds.

## Try It Out

🔗 **[Test AuraPod on GitHub Pages](https://macintorsten.github.io/aurapod/)**

## Development

**Prerequisites:** Node.js

1. Install dependencies:
   ```bash
   npm install
   ```
2. Run the dev server:
   ```bash
   npm run dev
   ```

## Testing

### Running Tests Locally

**Unit Tests (Vitest):**
```bash
# Run all unit tests once
npm test

# Run with coverage report
npm run test:unit

# Watch mode for development (re-runs tests on file changes)
npm run test:watch
```

**End-to-End Tests (Playwright):**
```bash
# Run E2E tests (builds the app first)
npm run test:e2e

# Run E2E tests with UI for debugging
npm run test:e2e:ui
```

If E2E fails locally due to missing browsers, run:
```bash
npx playwright install chromium
```

### Type Checking

**TypeScript Type Checking:**
```bash
# Check for TypeScript errors without building
npx tsc --noEmit

# Build the project (includes type checking)
npm run build
```

### Pre-commit Hooks

The project uses Husky and lint-staged to automatically run checks before each commit:

- **TypeScript type checking** - Catches type errors before they reach CI
- **Related unit tests** - Runs tests for files you've changed

These checks run automatically when you commit. If they fail, the commit will be blocked until issues are fixed.

**To bypass pre-commit hooks** (not recommended):
```bash
git commit --no-verify
```

**Best Practice**: Run `npx tsc --noEmit` and `npm test` before pushing to catch issues early.

For detailed testing patterns and best practices, see [TESTING_GUIDE.md](TESTING_GUIDE.md).
