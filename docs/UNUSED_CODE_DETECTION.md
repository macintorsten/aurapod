# Unused Code Detection Guide

This document describes how to identify and remove unused code in the AuraPod codebase.

## Quick Start

**Manual detection (no installation required):**
```bash
# Check all functions in a file
for func in isValidUrl isValidFeedUrl sanitizeHtml; do
  echo "=== $func ==="
  grep -r "\b$func\b" --include="*.ts" --include="*.tsx" src/ | grep -v test | grep -v "export function $func" | wc -l
done
```

**Automated detection (recommended for CI/CD):**
```bash
npm install --save-dev ts-prune
npx ts-prune
```

## Automated Detection Methods

### Method 1: Using ts-prune (Recommended)

[ts-prune](https://github.com/nadeesha/ts-prune) finds unused exports in TypeScript projects.

**Installation:**
```bash
npm install --save-dev ts-prune
```

**Usage:**
```bash
npx ts-prune
```

**Add to package.json:**
```json
{
  "scripts": {
    "check:unused": "ts-prune"
  }
}
```

### Method 2: Manual grep-based script

Create `scripts/check-unused.sh`:
```bash
#!/bin/bash
# Check for unused exports in utils

echo "Checking src/utils for unused functions..."

for file in src/utils/*.ts; do
  if [[ "$file" == *"test"* ]]; then
    continue
  fi
  
  echo "=== $(basename $file) ==="
  grep "export function" "$file" | sed 's/export function \([a-zA-Z]*\).*/\1/' | \
  while read func; do
    count=$(grep -r "\b$func\b" --include="*.ts" --include="*.tsx" src/ | \
            grep -v "test" | \
            grep -v "export function $func" | \
            wc -l)
    if [ "$count" -eq 0 ]; then
      echo "  ⚠️  $func: UNUSED"
    else
      echo "  ✓  $func: $count usage(s)"
    fi
  done
done
```

## CI/CD Integration

### Add GitHub Actions workflow

Create `.github/workflows/code-quality.yml`:

```yaml
name: Code Quality

on:
  pull_request:
    branches: [ main ]

jobs:
  unused-code:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Check for unused exports (warning only)
        continue-on-error: true
        run: |
          npm install -g ts-prune
          npx ts-prune
```

### Add to existing test workflow

Add to your test workflow:
```yaml
      - name: Check for unused code
        run: npm run check:unused
```

## Package.json Scripts

Add these scripts to `package.json`:
```json
{
  "scripts": {
    "check:unused": "ts-prune",
    "check:unused:grep": "bash scripts/check-unused.sh"
  }
}
```

## Recent Cleanup (2025-12-26)

### Removed Unused Functions

**From src/utils/validators.ts (entire file):**
- `isValidUrl` - Only used internally by other unused functions
- `isValidFeedUrl` - No callers, URL pattern can't determine feed
- `isValidAudioUrl` - No callers, URL pattern can't determine audio type
- `sanitizeHtml` - No callers, XSS vulnerability
- `isEmpty` - No callers
- `isValidProgress` - No callers

**From src/utils/formatters.ts:**
- `formatDate` - No callers
- `formatFileSize` - No callers

**From src/utils/errorHandlers.ts:**
- `isNetworkError` - No callers
- `isCORSError` - No callers
- `getUserFriendlyMessage` - No callers

### Impact

- **Lines removed:** ~180 lines of code, ~130 test lines
- **Tests reduced:** 365 → 289 tests (-76 tests)
- **Security:** Eliminated `sanitizeHtml` XSS vulnerability
- **Maintenance:** Simpler codebase, fewer tests to maintain
- **Bundle size:** Smaller production bundle

## Best Practices

### 1. Regular Checks
- Run before each release
- Review during refactoring
- Check after feature removal

### 2. Safe Removal
1. Verify truly unused (check dynamic imports, external usage)
2. Remove tests along with code
3. Document removal in git commit
4. Update KNOWN_BUGS.md or CHANGELOG

### 3. Prevention
- **Code review:** Flag unused code in PRs
- **Test coverage:** If no tests exist, function might be unused
- **TypeScript:** Enable `noUnusedLocals` and `noUnusedParameters`
- **ESLint:** Add unused variable warnings

### 4. Exceptions (Keep These)
- Public API exports (if this is a library)
- Documented future features (with TODO/FIXME comments)
- Test utilities in `test-utils/`
- Development-only utilities (clearly marked)

## TypeScript Configuration

Add to `tsconfig.json`:
```json
{
  "compilerOptions": {
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

Use `_paramName` for intentionally unused parameters.

## ESLint Configuration

Add to `.eslintrc.js`:
```javascript
module.exports = {
  rules: {
    '@typescript-eslint/no-unused-vars': ['warn', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
    }],
  },
};
```

## Summary

**Recommended workflow:**
1. Install: `npm install --save-dev ts-prune`
2. Add script: `"check:unused": "ts-prune"` to package.json
3. Run manually before releases: `npm run check:unused`
4. Optional: Add to CI/CD as non-blocking check
5. Review and remove unused code regularly

**Benefits:**
- Smaller bundle size
- Easier maintenance
- Fewer bugs
- Clearer intent
- Better performance

---

**Last Updated:** 2025-12-26  
**Cleanup Initiative:** Removed 11 unused functions and their tests
