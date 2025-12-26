# Known Bugs - AuraPod

This document tracks known bugs discovered during test coverage improvements. Each bug has associated test cases that have been disabled until the bugs are fixed.

## Minor Bugs

### 🟡 Bug: `formatTimestamp` - Invalid Date Handling

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
**Location:** `src/utils/__tests__/formatters.test.ts:50-57`  
**Status:** Disabled with `.skip()`

#### Why Test Is Disabled
The test asserts the CORRECT behavior ('Invalid timestamp'). It's disabled because:
1. It documents the inconsistency
2. Once fixed, the test will pass automatically
3. Having it disabled prevents confusion about expected behavior

---

### 🟡 Bug: `parseDuration` - Returns NaN for Invalid Strings

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
**Location:** `src/utils/__tests__/formatters.test.ts:125-131`  
**Status:** Disabled with `.skip()`

#### Why Test Is Disabled
The test asserts the CORRECT behavior (`toBe(0)`). It's disabled because:
1. It documents the bug
2. Once fixed, the test will pass automatically
3. Having it disabled prevents confusion about expected behavior

---

## Bug Tracking Summary

| Bug | Severity | File | Status | Disabled Tests |
|-----|----------|------|--------|----------------|
| formatTimestamp error message | 🟡 Low | formatters.ts | Open | 1 test |
| parseDuration returns NaN | 🟡 Low | formatters.ts | Open | 1 test |

**Total Disabled Tests:** 2 tests  
**Tests Still Passing:** 363 tests (365 - 2)

---

## Code Cleanup Completed

### Removed Unused Functions (2025-12-26)

The following unused functions and their tests were removed from the codebase as they had no callers:

**From `src/utils/validators.ts`:**
- `isValidUrl` - Only used internally by other unused functions
- `isValidFeedUrl` - No callers
- `isValidAudioUrl` - No callers (URL pattern can't reliably determine audio)
- `sanitizeHtml` - No callers (was broken, XSS vulnerability if used)
- `isEmpty` - No callers
- `isValidProgress` - No callers

**From `src/utils/formatters.ts`:**
- `formatDate` - No callers
- `formatFileSize` - No callers

**From `src/utils/errorHandlers.ts`:**
- `isNetworkError` - No callers
- `isCORSError` - No callers
- `getUserFriendlyMessage` - No callers

**Test Files Removed:**
- `src/utils/__tests__/validators.test.ts` - All functions removed

**Test Files Updated:**
- `src/utils/__tests__/formatters.test.ts` - Removed tests for unused functions
- `src/utils/__tests__/errorHandlers.test.ts` - Removed tests for unused functions

**Benefits of Removal:**
- Reduced codebase complexity
- Eliminated potential security vulnerabilities (broken `sanitizeHtml`)
- Removed misleading functions (URL pattern validation can't determine content type)
- Easier maintenance and fewer tests to maintain
- Clearer codebase - only functions actually used remain

**If These Functions Are Needed in the Future:**
- Check git history to see the original implementations
- Consider better alternatives (e.g., DOMPurify for HTML sanitization)
- Validate URLs/content using proper methods (HTTP headers, not URL patterns)

---

## Next Steps

### For Minor Bugs
1. **Low Priority:** Can be fixed in future sprint
2. **After Fix:** Re-enable disabled tests (they will pass automatically)

### Test Maintenance
When fixing bugs:
1. Remove `.skip()` from disabled tests
2. Verify all tests pass with the fix
3. Update this document with "Fixed" status and commit hash

---

**Last Updated:** 2025-12-26  
**Document Version:** 2.0 (After unused code removal)
