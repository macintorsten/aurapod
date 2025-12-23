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

1. Unit tests (Vitest):
   ```bash
   npm run test:unit
   ```
2. Watch mode:
   ```bash
   npm run test:watch
   ```
3. End-to-end tests (Playwright):
   ```bash
   npm run test:e2e
   ```

If E2E fails locally due to missing browsers, run:
```bash
npx playwright install chromium
```
