# PageURL Misattribution Bug - Test Documentation

## Problem Description

PageViewTiming events (FCP, CLS, INP) are being attributed to the **current page URL** at harvest time instead of the **original page URL** at page load time. When soft navigations occur before the harvest interval, all timing events get mis-attributed to the wrong page.

## Root Cause

**Location:** Multiple vitals files missing the pageUrl fix that LCP already has

The fix was applied to LCP in commit `04eb09fb27fb9d49dcb4a37cc503619217e9fafd` (Sept 18, 2025) but was not applied to other vital metrics.

### Fixed (in v1.298.0)
- ✅ **Largest Contentful Paint (LCP)** - `src/common/vitals/largest-contentful-paint.js`

### Still Broken
- ❌ **First Contentful Paint (FCP)** - `src/common/vitals/first-contentful-paint.js`
- ❌ **Cumulative Layout Shift (CLS)** - `src/common/vitals/cumulative-layout-shift.js`
- ❌ **Interaction to Next Paint (INP)** - `src/common/vitals/interaction-to-next-paint.js`

### Not Applicable
- **First Paint (FP)** - Uses PerformanceObserver directly, no attribution object available
- **First Input Delay (FID)** - Deprecated in web-vitals v4, replaced by INP

## How the Bug Manifests

1. **Page Load** at `/groceries/en-GB/slots`
   - Agent loads and captures initial location
   - FCP, CLS, INP events are collected
   - Harvest scheduled for 30 seconds later

2. **Soft Navigation** (before harvest, e.g., at 15 seconds)
   - SPA framework: `history.pushState({}, '', '/groceries/en-GB/shop/...')`
   - `window.location` changes to new URL

3. **Harvest** (30s after page load)
   - Harvester reads `window.location.href` → `/shop/...`
   - Sends `?ref=/groceries/en-GB/shop/...`
   - Backend attributes ALL PageViewTiming events to `/shop` instead of `/slots`

## The Fix

The fix applied to LCP should be applied to FCP, CLS, and INP:

```javascript
// In largest-contentful-paint.js (already fixed):
if (attribution.navigationEntry) attrs.pageUrl = cleanURL(attribution.navigationEntry.name)
```

This works because `navigationEntry.name` preserves the original URL from the browser's PerformanceNavigationTiming API, preventing mis-attribution when soft navigations occur.

## Failing Tests

This branch includes failing unit tests that demonstrate the issue:

### Test Files Modified:
1. `tests/unit/common/vitals/first-contentful-paint.test.js`
2. `tests/unit/common/vitals/cumulative-layout-shift.test.js`
3. `tests/unit/common/vitals/interaction-to-next-paint.test.js`

### Test Pattern:
Each test verifies that when `attribution.navigationEntry.name` is provided by web-vitals, the pageUrl should be:
1. Extracted from `navigationEntry.name`
2. Cleaned (query params and hash removed)
3. Included in the `attrs` object

### Running the Tests:

```bash
# Run all vitals tests
npm test -- --testPathPattern=tests/unit/common/vitals

# Run specific failing tests
npm test -- --testPathPattern=first-contentful-paint.test.js
npm test -- --testPathPattern=cumulative-layout-shift.test.js
npm test -- --testPathPattern=interaction-to-next-paint.test.js
```

## Expected Test Results

**Before Fix:** All three new tests should FAIL with error like:
```
Expected: "https://example.com/original-page"
Received: undefined
```

**After Fix:** All tests should PASS once the pageUrl fix is applied to FCP, CLS, and INP.

## Impact

- **Sample Size "Drop":** Events aren't lost—they're mis-attributed to wrong pages
- **FCP Regression:** Good vitals from fast pages attributed to wrong pages, skewing metrics
- **Why Worse in v1.278.0+:** Centralized harvesting increased interval from 10s to 30s, giving 3x more time for soft navs to occur

## References

- **GitHub Issue:** https://github.com/newrelic/newrelic-browser-agent/issues/1566
- **LCP Fix Commit:** `04eb09fb27fb9d49dcb4a37cc503619217e9fafd`
- **Investigation Doc:** `/Users/uk45821071/repo/mfe-orchestrator/NEW_RELIC_UPGRADE_INVESTIGATION.md`
