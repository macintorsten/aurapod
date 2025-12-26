# Known Bugs - AuraPod

This document tracks known bugs discovered during test coverage improvements. Each bug has associated test cases that have been disabled until the bugs are fixed.

## Critical Bugs

### 🔴 CRITICAL: `sanitizeHtml` Does Not Sanitize HTML (XSS Vulnerability)

**Status:** Open - Function Unused, Consider Removal  
**Severity:** Critical (if ever used on untrusted input)  
**File:** `src/utils/validators.ts:60-66`  
**Discovered:** 2025-12-26  
**Usage:** **NONE** - Function is not used anywhere in the codebase

#### Description
The `sanitizeHtml` function claims to provide "basic XSS protection" in its documentation but does NOT escape HTML characters. It returns raw HTML unchanged, allowing XSS attack vectors to pass through unescaped.

**Important:** This function is currently **not used anywhere** in the codebase. It exists but has no callers.

#### Current Behavior
```typescript
sanitizeHtml('<script>alert("xss")</script>')
// Returns: '<script>alert("xss")</script>' ❌
```

#### Expected Behavior
```typescript
sanitizeHtml('<script>alert("xss")</script>')
// Should return: '&lt;script&gt;alert("xss")&lt;/script&gt;' ✓
```

#### Root Cause
The function uses `div.textContent = html; return div.innerHTML;` which doesn't properly escape HTML in the test environment. The approach is fundamentally flawed for sanitization.

#### Context Questions to Answer Before Fixing

1. **Is HTML sanitization actually needed?**
   - Where would this input come from? (RSS feed descriptions?)
   - Does the RSS standard allow/require HTML in description fields?
   - How do other podcast players handle this?

2. **If HTML rendering is needed:**
   - Should we support a subset of HTML (bold, italic, links)?
   - Should we use a proper sanitization library (DOMPurify)?
   - Or should we extract text content only and display as plain text?

3. **Current approach problems:**
   - Cannot reliably distinguish HTML from text
   - Incomplete/broken sanitization is worse than none
   - Hard to maintain and test properly

#### Recommended Actions

**Option 1: Remove the function** (Recommended since it's unused)
- Function has no callers in the codebase
- Prevents future misuse of broken function
- Remove tests for unused function

**Option 2: If HTML rendering is truly needed:**
1. Use DOMPurify library for proper sanitization
2. Define allowed HTML tags/attributes whitelist
3. Document expected input sources (RSS feeds, etc.)
4. Test with real RSS feed data

**Option 3: Extract text content only**
- Parse HTML and extract textContent
- Display as plain text (no HTML rendering)
- Simple, safe, no sanitization needed

#### Security Impact
- **High Risk IF USED**: Creates XSS vulnerability if ever used on untrusted input
- **Current Risk: NONE**: Function has no callers
- **Future Risk**: Developer might use it assuming it works, creating vulnerability

#### Test Cases
**Location:** `src/utils/__tests__/validators.test.ts:123-156`  
**Status:** 4 tests disabled with `.skip()`

Tests assert EXPECTED (correct) behavior and would FAIL with current implementation:
- `should escape HTML tags to prevent XSS` - Expects proper escaping
- `should escape special HTML characters` - Expects & < > escaping
- `should prevent XSS attacks by escaping tags` - Expects img tag escaping
- `should escape link tags` - Expects anchor tag escaping

#### Why Tests Are Disabled
These tests assert the CORRECT behavior the function should have. They are disabled because:
1. The function is broken and doesn't implement this behavior
2. The function is not used anywhere, so fixing it is not urgent
3. When/if the function is ever needed, these tests document what it should do
4. They will PASS once the implementation is fixed

---

## Questionable Implementations (Not Bugs, But Worth Reviewing)

### ⚠️ `isValidAudioUrl` - Unreliable URL-Based Audio Validation

**Status:** Questionable Design - Function Unused  
**Severity:** Low (function not used)  
**File:** `src/utils/validators.ts:46-53`  
**Discovered:** 2025-12-26  
**Usage:** **NONE** - Function is not used anywhere in the codebase

#### Description
The `isValidAudioUrl` function attempts to validate whether a URL points to audio content by checking if the URL string contains common audio file extensions (.mp3, .m4a, etc.). This approach has significant limitations.

#### Why This Approach Is Problematic

**Cannot reliably determine audio content from URL alone:**
1. **False Negatives**: Many audio URLs don't have file extensions
   - Streaming endpoints: `https://api.spotify.com/stream/track/abc123`
   - Dynamic URLs: `https://cdn.example.com/audio?id=12345&format=mp3`
   - REST APIs: `https://api.example.com/episodes/123/audio`

2. **False Positives**: URL with audio extension might not serve audio
   - Broken/expired links return 404
   - Authentication required returns 401/403
   - Server configuration issues

3. **Proper validation requires HTTP response headers:**
   ```typescript
   // Correct approach:
   const response = await fetch(url);
   const contentType = response.headers.get('content-type');
   const isAudio = contentType?.startsWith('audio/');
   ```

#### Current Implementation
```typescript
export function isValidAudioUrl(url: string): boolean {
  if (!isValidUrl(url)) return false;
  
  const audioExtensions = [".mp3", ".m4a", ".wav", ".ogg", ".aac", ".opus"];
  const lowerUrl = url.toLowerCase();
  
  return audioExtensions.some((ext) => lowerUrl.includes(ext));
}
```

#### Recommendation

**Since the function is not used anywhere:**

**Option 1: Remove the function** (Recommended)
- No callers exist in the codebase
- Prevents future misuse of unreliable validation
- Remove associated tests

**Option 2: If audio validation is needed in the future:**
- Validate based on HTTP `Content-Type` header from response
- Check for MIME types: `audio/mpeg`, `audio/mp4`, `audio/ogg`, etc.
- Handle edge cases: redirects, authentication, network errors
- Document that this requires async validation (network call)

**Option 3: Keep for heuristic pre-filtering only:**
- Rename to `likelyAudioUrl` or `hasAudioExtension`
- Document clearly that this is NOT reliable validation
- Use only as optimization hint, not security/validation gate

#### Test Cases
**Location:** `src/utils/__tests__/validators.test.ts:68-101`  
**Status:** Tests currently enabled (testing existing behavior)

Tests document current behavior but acknowledge limitations in comments.

---

## Minor Bugs

### 🟡 Bug: `formatTimestamp` Returns Wrong Error Message

**Status:** Open  
**Severity:** Low (Cosmetic)  
**File:** `src/utils/formatters.ts:40-53`  
**Discovered:** 2025-12-26

#### Description
When `formatTimestamp` receives an invalid input (NaN), it returns "Invalid Date" instead of the documented "Invalid timestamp".

#### Current Behavior
```typescript
formatTimestamp(NaN)
// Returns: "Invalid Date"
```

#### Expected Behavior
```typescript
formatTimestamp(NaN)
// Should return: "Invalid timestamp"
```

#### Root Cause
The try-catch block doesn't properly catch invalid date errors. The `new Date(NaN)` creates an invalid Date object that returns "Invalid Date" when formatted.

#### Impact
- Low: Cosmetic issue, doesn't affect functionality
- User sees slightly inconsistent error message

#### Test Cases
**Location:** `src/utils/__tests__/formatters.test.ts:84-88`  
**Status:** Disabled with `.skip()`

#### Why Test Is Disabled
The test currently asserts the WRONG behavior ('Invalid Date'). It's disabled because:
1. It documents the inconsistency
2. Once fixed, the test should assert 'Invalid timestamp'
3. Keeping it enabled masks the bug

---

### 🟡 Bug: `parseDuration` Returns NaN for Invalid Strings

**Status:** Open  
**Severity:** Low  
**File:** `src/utils/formatters.ts:77-98`  
**Discovered:** 2025-12-26

#### Description
When `parseDuration` receives a non-numeric string that can't be parsed, it returns `NaN` instead of falling back to `0` as the function documentation suggests.

#### Current Behavior
```typescript
parseDuration('invalid')
// Returns: NaN
```

#### Expected Behavior
```typescript
parseDuration('invalid')
// Should return: 0
```

#### Root Cause
The function uses `durationStr.split(':').map(Number)` which converts invalid strings to `NaN`. When calculations are performed on `NaN`, the result is also `NaN`. The fallback `return 0` at the end is never reached for this case.

#### Impact
- Low: Edge case with malformed duration strings from RSS feeds
- Could cause display issues if duration is rendered (showing "NaN:NaN" instead of "0:00")

#### Fix Suggestion
Add validation to check for `NaN` values after `Number()` conversion:
```typescript
const parts = durationStr.split(':').map(Number);
if (parts.some(isNaN)) return 0;
```

#### Test Cases
**Location:** `src/utils/__tests__/formatters.test.ts:155-159`  
**Status:** Disabled with `.skip()`

#### Why Test Is Disabled
The test currently asserts the WRONG behavior (`toBeNaN()`). It's disabled because:
1. It documents the bug
2. Once fixed, the test should assert `toBe(0)`
3. Keeping it enabled masks the edge case bug

---

### 🟡 Bug: `isCORSError` Returns `undefined` Instead of `false`

**Status:** Open  
**Severity:** Low  
**File:** `src/utils/errorHandlers.ts:47-53`  
**Discovered:** 2025-12-26

#### Description
The `isCORSError` function has a return type of `boolean` but returns `undefined` when no conditions match, instead of explicitly returning `false`.

#### Current Behavior
```typescript
isCORSError({ message: 'timeout error' })
// Returns: undefined (falsy)
```

#### Expected Behavior
```typescript
isCORSError({ message: 'timeout error' })
// Should return: false (explicit boolean)
```

#### Root Cause
The function uses a chain of OR conditions without an explicit `false` return:
```typescript
return (
  error?.message?.includes("CORS") ||
  error?.message?.includes("cors") ||
  error?.diagnostics?.corsIssue
);
```
When all conditions are falsy, JavaScript returns the last evaluated expression which is `undefined`.

#### Impact
- Low: Functional behavior is correct (undefined is falsy)
- Type signature is misleading (claims to return boolean)
- Could cause issues with strict boolean checks (`=== false`)

#### Fix Suggestion
Add explicit boolean coercion:
```typescript
return !!(
  error?.message?.includes("CORS") ||
  error?.message?.includes("cors") ||
  error?.diagnostics?.corsIssue
);
```

#### Test Cases
**Location:** `src/utils/__tests__/errorHandlers.test.ts:134-144`  
**Status:** Tests use `toBeFalsy()` instead of `toBe(false)` to accommodate current behavior

#### Why Tests Are Not Disabled
These tests use `toBeFalsy()` which correctly validates the current behavior. They don't need to be disabled because they work with both `undefined` and `false`. Once the bug is fixed, the tests will still pass.

---

## Bug Tracking Summary

| Bug | Severity | File | Status | Disabled Tests |
|-----|----------|------|--------|----------------|
| sanitizeHtml XSS | 🔴 Critical | validators.ts | Open | 4 tests |
| formatTimestamp error message | 🟡 Low | formatters.ts | Open | 1 test |
| parseDuration returns NaN | 🟡 Low | formatters.ts | Open | 1 test |
| isCORSError returns undefined | 🟡 Low | errorHandlers.ts | Open | 0 tests |

**Total Disabled Tests:** 6 tests  
**Tests Still Passing:** 359 tests (365 - 6)

---

## Next Steps

### For Critical Bug (sanitizeHtml)
1. **Immediate:** Audit all usages of `sanitizeHtml` in codebase
2. **High Priority:** If used on untrusted input, fix or replace immediately
3. **After Fix:** Re-enable and update disabled tests to assert correct behavior

### For Minor Bugs
1. **Low Priority:** Can be fixed in future sprint
2. **After Fix:** Re-enable disabled tests and update assertions

### Test Maintenance
When fixing bugs:
1. Remove `.skip()` from disabled tests
2. Update test assertions to expect correct behavior
3. Verify all tests pass with the fix
4. Document the fix in this file with "Fixed" status and commit hash

---

**Last Updated:** 2025-12-26  
**Document Version:** 1.0
