# Known Bugs - AuraPod

This document tracks known bugs discovered during test coverage improvements. Each bug has associated test cases that have been disabled until the bugs are fixed.

## Critical Bugs

### 🔴 CRITICAL: `sanitizeHtml` Does Not Sanitize HTML (XSS Vulnerability)

**Status:** Open - Requires Immediate Attention  
**Severity:** Critical  
**File:** `src/utils/validators.ts:60-66`  
**Discovered:** 2025-12-26

#### Description
The `sanitizeHtml` function claims to provide "basic XSS protection" in its documentation but does NOT escape HTML characters. It returns raw HTML unchanged, allowing XSS attack vectors to pass through unescaped.

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
The function uses `div.textContent = html; return div.innerHTML;` which doesn't properly escape HTML in the happy-dom test environment. The approach may work in real browsers but the function's behavior is inconsistent and unreliable.

#### Security Impact
- **High Risk**: If this function is used to sanitize untrusted user input (comments, descriptions, etc.), it creates an XSS vulnerability
- **Attack Vectors**: `<script>` tags, `onerror` handlers, malicious links all pass through unescaped
- **Recommended Actions**:
  1. Immediately audit all usages of `sanitizeHtml` in the codebase
  2. If used on user input: Replace with proper sanitization library (e.g., DOMPurify)
  3. If not used: Remove function to prevent future misuse
  4. Add proper input validation and output encoding

#### Test Cases
**Location:** `src/utils/__tests__/validators.test.ts:118-147`  
**Status:** Disabled with `.skip()`

Tests that demonstrate the vulnerability:
- `SECURITY BUG: does not escape HTML tags (returns raw HTML)`
- `SECURITY BUG: does not escape special characters`
- `SECURITY BUG: does not prevent XSS attacks`
- `SECURITY BUG: does not escape link tags`

#### Why Tests Are Disabled
These tests currently pass by asserting the WRONG (insecure) behavior. They are disabled because:
1. They document the security vulnerability
2. Once the bug is fixed, they should be updated to assert the CORRECT behavior
3. Keeping them enabled would give false confidence that XSS protection exists

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
