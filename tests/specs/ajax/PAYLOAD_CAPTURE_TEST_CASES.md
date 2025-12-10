# Ajax Payload Capture Test Case Matrix

## Test Configurations

### Loader Types
- **loader: 'full'** - Produces standalone ajax events in AjaxRequest harvest
- **loader: 'spa' + feature_flags: ['soft_nav']** - Produces ajax events as children of BrowserInteraction events

### Capture Payload Modes
- **'off'** - Never capture payloads
- **'all'** - Always capture payloads (success and failure)
- **'failures'** - Only capture payloads on failures (4xx, 5xx, GraphQL errors)

### Content Types
- **Human-readable**: text/*, application/json, application/xml, application/graphql
- **Binary/Non-readable**: image/*, video/*, audio/*, application/octet-stream, application/pdf

### Request Methods
- **XHR**: XMLHttpRequest API
- **Fetch**: Fetch API

---

## XHR Payload Capture Test Cases

| # | Test Case | Loader | Capture Mode | HTTP Status | Content-Type | Mock Endpoint | Expected Behavior | Payload Attributes Expected |
|---|-----------|--------|--------------|-------------|--------------|---------------|-------------------|---------------------------|
| 1 | Success request, capture off | full | off | 200 | application/json | POST /echo-body | Ajax event captured | None (no requestBody, responseBody, headers, query) |
| 2 | Success request, capture off | spa+soft_nav | off | 200 | application/json | POST /echo-body | Ajax as interaction child | None |
| 3 | Failed request, capture off | full | off | 500 | application/json | POST /status/500 | Ajax event captured | None |
| 4 | Failed request, capture off | spa+soft_nav | off | 500 | application/json | POST /status/500 | Ajax as interaction child | None |
| 5 | GraphQL error, capture off | full | off | 200 | application/json | POST /gql-error | Ajax event captured | None |
| 6 | GraphQL error, capture off | spa+soft_nav | off | 200 | application/json | POST /gql-error | Ajax as interaction child | None |
| 7 | Success request, capture all | full | all | 200 | application/json | POST /echo-body | Ajax event captured | requestBody, requestHeaders, responseBody, responseHeaders |
| 8 | Success request, capture all | spa+soft_nav | all | 200 | application/json | POST /echo-body | Ajax as interaction child | requestBody, requestHeaders, responseBody, responseHeaders |
| 9 | Failed request, capture all | full | all | 500 | application/json | POST /status/500 | Ajax event captured | requestBody, requestHeaders, responseBody, responseHeaders |
| 10 | Failed request, capture all | spa+soft_nav | all | 500 | application/json | POST /status/500 | Ajax as interaction child | requestBody, requestHeaders, responseBody, responseHeaders |
| 11 | Query params, capture all | full | all | 200 | application/json | GET /json-with-query?param1=value1&param2=value2 | Ajax event captured | requestQuery contains param1=value1 |
| 12 | Query params, capture all | spa+soft_nav | all | 200 | application/json | GET /json-with-query?param1=value1&param2=value2 | Ajax as interaction child | requestQuery contains param1=value1 |
| 13 | Custom headers, capture all | full | all | 200 | application/json | GET /json-with-headers (with X-Test-Header) | Ajax event captured | requestHeaders contains X-Test-Header, responseHeaders contains X-Custom-Header |
| 14 | Custom headers, capture all | spa+soft_nav | all | 200 | application/json | GET /json-with-headers (with X-Test-Header) | Ajax as interaction child | requestHeaders contains X-Test-Header, responseHeaders contains X-Custom-Header |
| 15 | Success, capture failures | full | failures | 200 | application/json | POST /echo-body | Ajax event captured | None (2xx doesn't qualify) |
| 16 | Success, capture failures | spa+soft_nav | failures | 200 | application/json | POST /echo-body | Ajax as interaction child | None |
| 17 | Failed 4xx, capture failures | full | failures | 404 | application/json | GET /status/404 | Ajax event captured | requestBody, responseBody, headers |
| 18 | Failed 4xx, capture failures | spa+soft_nav | failures | 404 | application/json | GET /status/404 | Ajax as interaction child | requestBody, responseBody, headers |
| 19 | Failed 5xx, capture failures | full | failures | 500 | application/json | POST /status/500 | Ajax event captured | requestBody, responseBody, headers |
| 20 | Failed 5xx, capture failures | spa+soft_nav | failures | 500 | application/json | POST /status/500 | Ajax as interaction child | requestBody, responseBody, headers |
| 21 | GraphQL error, capture failures | full | failures | 200 | application/json | POST /gql-error | Ajax event captured | requestBody, responseBody (contains "errors" array) |
| 22 | GraphQL error, capture failures | spa+soft_nav | failures | 200 | application/json | POST /gql-error | Ajax as interaction child | requestBody, responseBody |
| 23 | GraphQL partial error, capture failures | full | failures | 200 | application/json | POST /gql-partial-error | Ajax event captured | requestBody, responseBody (has both data and errors) |
| 24 | GraphQL partial error, capture failures | spa+soft_nav | failures | 200 | application/json | POST /gql-partial-error | Ajax as interaction child | requestBody, responseBody |
| 25 | Status 0 (network error), capture failures | full | failures | 0 | - | (network failure) | Ajax event captured | requestBody if available |
| 26 | Status 0 (network error), capture failures | spa+soft_nav | failures | 0 | - | (network failure) | Ajax as interaction child | requestBody if available |
| 27 | Text/plain response, capture all | full | all | 200 | text/plain | GET /text-plain | Ajax event captured | responseBody contains "Plain text response" |
| 28 | Text/plain response, capture all | spa+soft_nav | all | 200 | text/plain | GET /text-plain | Ajax as interaction child | responseBody contains "Plain text response" |
| 29 | XML response, capture all | full | all | 200 | application/xml | GET /xml | Ajax event captured | responseBody contains XML content |
| 30 | XML response, capture all | spa+soft_nav | all | 200 | application/xml | GET /xml | Ajax as interaction child | responseBody contains XML content |
| 31 | Binary response, capture all | full | all | 200 | image/png | GET /binary | Ajax event captured | None (binary content filtered out) |
| 32 | Binary response, capture all | spa+soft_nav | all | 200 | image/png | GET /binary | Ajax as interaction child | None (binary filtered) |
| 33 | Deny list blocks request | full | all | 200 | application/json | POST /echo-body (with block_internal: true) | No ajax event | N/A (request blocked from telemetry) |
| 34 | Deny list blocks request | spa+soft_nav | all | 200 | application/json | POST /echo-body (with block_internal: true) | No ajax in interaction | N/A |
| 35 | Obfuscation applied | full | all | 200 | application/json | POST /echo-body (with obfuscate rules) | Ajax event captured | requestBody/headers have "sensitive" → "REDACTED", "secret-key" → "HIDDEN" |
| 36 | Obfuscation applied | spa+soft_nav | all | 200 | application/json | POST /echo-body (with obfuscate rules) | Ajax as interaction child | Obfuscated values in payloads |

---

## Fetch Payload Capture Test Cases

| # | Test Case | Loader | Capture Mode | HTTP Status | Content-Type | Mock Endpoint | Expected Behavior | Payload Attributes Expected |
|---|-----------|--------|--------------|-------------|--------------|---------------|-------------------|---------------------------|
| 37 | Success request, capture off | full | off | 200 | application/json | POST /echo-body | Ajax event captured | None |
| 38 | Success request, capture off | spa+soft_nav | off | 200 | application/json | POST /echo-body | Ajax as interaction child | None |
| 39 | Failed request, capture off | full | off | 500 | application/json | POST /status/500 | Ajax event captured | None |
| 40 | Failed request, capture off | spa+soft_nav | off | 500 | application/json | POST /status/500 | Ajax as interaction child | None |
| 41 | GraphQL error, capture off | full | off | 200 | application/json | POST /gql-error | Ajax event captured | None |
| 42 | GraphQL error, capture off | spa+soft_nav | off | 200 | application/json | POST /gql-error | Ajax as interaction child | None |
| 43 | Success request, capture all | full | all | 200 | application/json | POST /echo-body | Ajax event captured | requestBody, requestHeaders, responseBody, responseHeaders |
| 44 | Success request, capture all | spa+soft_nav | all | 200 | application/json | POST /echo-body | Ajax as interaction child | requestBody, requestHeaders, responseBody, responseHeaders |
| 45 | Failed request, capture all | full | all | 500 | application/json | POST /status/500 | Ajax event captured | requestBody, requestHeaders, responseBody, responseHeaders |
| 46 | Failed request, capture all | spa+soft_nav | all | 500 | application/json | POST /status/500 | Ajax as interaction child | requestBody, requestHeaders, responseBody, responseHeaders |
| 47 | Query params, capture all | full | all | 200 | application/json | GET /json-with-query?param1=value1&param2=value2 | Ajax event captured | requestQuery contains param1=value1 |
| 48 | Query params, capture all | spa+soft_nav | all | 200 | application/json | GET /json-with-query?param1=value1&param2=value2 | Ajax as interaction child | requestQuery contains param1=value1 |
| 49 | Custom headers, capture all | full | all | 200 | application/json | GET /json-with-headers (with X-Test-Header) | Ajax event captured | requestHeaders contains X-Test-Header, responseHeaders contains X-Custom-Header |
| 50 | Custom headers, capture all | spa+soft_nav | all | 200 | application/json | GET /json-with-headers (with X-Test-Header) | Ajax as interaction child | requestHeaders contains X-Test-Header, responseHeaders contains X-Custom-Header |
| 51 | Success, capture failures | full | failures | 200 | application/json | POST /echo-body | Ajax event captured | None |
| 52 | Success, capture failures | spa+soft_nav | failures | 200 | application/json | POST /echo-body | Ajax as interaction child | None |
| 53 | Failed 4xx, capture failures | full | failures | 404 | application/json | GET /status/404 | Ajax event captured | requestBody, responseBody, headers |
| 54 | Failed 4xx, capture failures | spa+soft_nav | failures | 404 | application/json | GET /status/404 | Ajax as interaction child | requestBody, responseBody, headers |
| 55 | Failed 5xx, capture failures | full | failures | 500 | application/json | POST /status/500 | Ajax event captured | requestBody, responseBody, headers |
| 56 | Failed 5xx, capture failures | spa+soft_nav | failures | 500 | application/json | POST /status/500 | Ajax as interaction child | requestBody, responseBody, headers |
| 57 | GraphQL error, capture failures | full | failures | 200 | application/json | POST /gql-error | Ajax event captured | requestBody, responseBody (contains "errors" array) |
| 58 | GraphQL error, capture failures | spa+soft_nav | failures | 200 | application/json | POST /gql-error | Ajax as interaction child | requestBody, responseBody |
| 59 | GraphQL partial error, capture failures | full | failures | 200 | application/json | POST /gql-partial-error | Ajax event captured | requestBody, responseBody (has both data and errors) |
| 60 | GraphQL partial error, capture failures | spa+soft_nav | failures | 200 | application/json | POST /gql-partial-error | Ajax as interaction child | requestBody, responseBody |
| 61 | Text/plain response, capture all | full | all | 200 | text/plain | GET /text-plain | Ajax event captured | responseBody contains "Plain text response" |
| 62 | Text/plain response, capture all | spa+soft_nav | all | 200 | text/plain | GET /text-plain | Ajax as interaction child | responseBody contains "Plain text response" |
| 63 | XML response, capture all | full | all | 200 | application/xml | GET /xml | Ajax event captured | responseBody contains XML content |
| 64 | XML response, capture all | spa+soft_nav | all | 200 | application/xml | GET /xml | Ajax as interaction child | responseBody contains XML content |
| 65 | Binary response, capture all | full | all | 200 | image/png | GET /binary | Ajax event captured | None (binary content filtered out) |
| 66 | Binary response, capture all | spa+soft_nav | all | 200 | image/png | GET /binary | Ajax as interaction child | None (binary filtered) |
| 67 | Request object with body, capture all | full | all | 200 | application/json | GET /json (using new Request()) | Ajax event captured | responseBody captured |
| 68 | Request object with body, capture all | spa+soft_nav | all | 200 | application/json | GET /json (using new Request()) | Ajax as interaction child | responseBody captured |
| 69 | Headers object in request, capture all | full | all | 200 | application/json | POST /echo-body (using new Headers()) | Ajax event captured | requestHeaders contains custom headers from Headers object |
| 70 | Headers object in request, capture all | spa+soft_nav | all | 200 | application/json | POST /echo-body (using new Headers()) | Ajax as interaction child | requestHeaders contains custom headers |
| 71 | Deny list blocks request | full | all | 200 | application/json | POST /echo-body (with block_internal: true) | No ajax event | N/A (request blocked from telemetry) |
| 72 | Deny list blocks request | spa+soft_nav | all | 200 | application/json | POST /echo-body (with block_internal: true) | No ajax in interaction | N/A |
| 73 | Obfuscation applied | full | all | 200 | application/json | POST /echo-body (with obfuscate rules) | Ajax event captured | requestBody/headers have "sensitive" → "REDACTED", "secret-token" → "HIDDEN" |
| 74 | Obfuscation applied | spa+soft_nav | all | 200 | application/json | POST /echo-body (with obfuscate rules) | Ajax as interaction child | Obfuscated values in payloads |

---

## Mock API Endpoints Reference

### Endpoints Created in `tools/testing-server/routes/mock-apis.js`

| Endpoint | Method | Purpose | Response Status | Content-Type | Response Body |
|----------|--------|---------|-----------------|--------------|---------------|
| /gql-error | POST | GraphQL error response (spec-compliant) | 200 | application/json | `{"errors": [{"message": "Field 'unknownField' not found"}]}` |
| /gql-partial-error | POST | GraphQL with both data and errors | 200 | application/json | `{"data": {...}, "errors": [{...}]}` |
| /json-with-query | GET | Returns query params in response | 200 | application/json | `{"receivedParams": {...}}` |
| /json-with-headers | GET | Echoes request headers + custom response header | 200 | application/json | Response includes `X-Custom-Header: custom-value` |
| /xml | GET | XML content | 200 | application/xml | `<root><message>Hello XML</message></root>` |
| /binary | GET | Binary data (image simulation) | 200 | image/png | Binary buffer content |
| /text-plain | GET | Plain text response | 200 | text/plain | `"Plain text response"` |
| /echo-body | POST | Echoes request body back | 200 | application/json | `{"receivedBody": <request-body>}` |
| /status/:code | ANY | Returns specified HTTP status | :code | application/json | `{"status": <code>}` |

---

## Test Implementation Notes

### Helper Function Pattern
```javascript
function findAjaxEvent(harvests, path) {
  // Check standalone ajax events (loader: full)
  const standaloneEvent = harvests
    .flatMap(harvest => harvest.request.body)
    .find(event => event.type === 'ajax' && event.path === path)
  
  if (standaloneEvent) return standaloneEvent

  // Check ajax as children of interaction events (loader: spa + soft_nav)
  const interactionWithAjax = harvests
    .flatMap(harvest => harvest.request.body)
    .find(event => event.type === 'interaction' && 
          event.children?.some(child => child.type === 'ajax' && child.path === path))
  
  if (interactionWithAjax) {
    return interactionWithAjax.children.find(child => child.type === 'ajax' && child.path === path)
  }

  return undefined
}
```

### Parameterized Test Structure
```javascript
const loaderConfigs = [
  { loader: 'full', description: 'loader:full (standalone ajax events)' },
  { loader: 'spa', init: { feature_flags: ['soft_nav'] }, description: 'loader:spa with soft_nav (ajax as interaction children)' }
]

loaderConfigs.forEach(({ loader, init, description }) => {
  describe(`XHR/Fetch Payload Capture - ${description}`, () => {
    // All test cases here
  })
})
```

### Network Capture Setup
```javascript
beforeEach(async () => {
  ajaxEventsCapture = await browser.testHandle.createNetworkCaptures('bamServer', [
    { test: testAjaxEventsRequest },      // Captures standalone ajax events
    { test: testInteractionEventsRequest } // Captures interaction events with ajax children
  ])
})
```

### Test Configuration Pattern
```javascript
await browser.url(await browser.testHandle.assetURL('ajax/xhr-payloads.html', {
  loader,  // 'full' or 'spa'
  init: { 
    ...init,  // Spreads { feature_flags: ['soft_nav'] } for spa loader
    ajax: { capture_payloads: 'off' | 'all' | 'failures' }
  }
}))
```

### Assertion Pattern
```javascript
const ajaxEventsHarvest = await Promise.all([
  ajaxEventsCapture.waitForResult({ timeout: 10000 }),
  $('#sendSuccess').click()  // Trigger ajax request
])

const ajaxEvent = findAjaxEvent(ajaxEventsHarvest, '/echo-body')

expect(ajaxEvent).toBeDefined()
const requestBodyAttr = ajaxEvent.children.find(child => child.key === 'requestBody')
expect(requestBodyAttr).toBeDefined()
expect(requestBodyAttr.value).toContain('expected content')
```

---

## Additional Edge Cases to Consider

| Test Case | Description | Expected Behavior |
|-----------|-------------|-------------------|
| Large payload truncation | Request/response body > 64KB | Payload should be truncated to limit |
| Empty response body | 204 No Content or empty 200 | No responseBody attribute |
| Request with no body | GET request without body | No requestBody attribute |
| Multiple query parameters | URL with 5+ query params | requestQuery contains all params (possibly truncated) |
| Special characters in headers | Headers with unicode/emoji | Properly encoded in requestHeaders/responseHeaders |
| CORS preflight OPTIONS | OPTIONS request before actual request | Both requests tracked appropriately |
| Aborted requests | XHR.abort() or AbortController | Ajax event captured with status/error info |
| Timeout errors | Request exceeds timeout | Captured as failure if capture_payloads: 'failures' |

---

## Coverage Summary

- **Total Test Cases**: 74 main test cases (37 XHR × 2 loaders + 37 Fetch × 2 loaders)
- **Capture Modes Covered**: off, all, failures (default)
- **Status Codes Covered**: 0, 200, 404, 500
- **Content Types Covered**: JSON, XML, text/plain, binary
- **Special Features**: GraphQL errors, deny list, obfuscation, query params, custom headers
- **Both APIs**: XHR and Fetch
- **Both Loaders**: full (standalone ajax) and spa+soft_nav (ajax as interaction children)
