import {
  testInteractionEventsRequest,
  testMFEAjaxEventsRequest
} from '../../../../tools/testing-server/utils/expect-tests'

// Helper to get attribute value from children array
function getAttr (event, key) {
  const child = event.children?.find(c => c.key === key)
  return child?.value
}

// Matches the actual outgoing AJAX request to the mock JSON endpoint, so DT headers can be inspected directly.
function assetServerJsonTest (request) {
  if (request.method !== 'GET') return false
  return new URL(request.url, 'resolve://').pathname === '/json'
}

describe('Register API - Auto-Detection - AJAX', () => {
  beforeEach(async () => {
    await browser.enableLogging()
  })

  afterEach(async () => {
    await browser.destroyAgentSession()
  })

  async function interactWithPage () {
    // Click the button in the main MFE (id: vite-main-mfe)
    const button = await $('#mfe-main-button')
    await button.click().catch(() => {})

    // Click the div created by 2nd-mfe (id: vite-second-mfe)
    const secondMfeDiv = await $('#second-mfe-div')
    await secondMfeDiv.click()

    // Wait for lazy content to load, then click it
    async function clickLazyButton () {
      const lazyButton = await $('#lazy-button')
      if (await lazyButton.isExisting()) {
        await lazyButton.click()
      } else {
        await browser.pause(500)
        await clickLazyButton()
      }
    }
    await clickLazyButton()
    await browser.pause(1000)
    await browser.refresh() // force any pending useractions or bIxn requests to release and harvest
  }

  it('should auto-detect multiple MFEs from different script sources for AJAX events', async () => {
    const [ajaxCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testMFEAjaxEventsRequest }
    ])

    await browser.url(await browser.testHandle.assetURL('test-builds/vite-react-mfe/index.html', {
      init: {
        api: {
          register: {
            enabled: true
          }
        },
        logging: {
          enabled: true
        }
      }
    }))

    await browser.waitForAgentLoad()

    // trigger all the events
    await interactWithPage()

    // Verify AJAX events (fetch and XHR) from both MFEs
    const [ajaxHarvests] = await Promise.all([
      ajaxCapture.waitForResult({ timeout: 10000 })
    ])

    const allAjaxEvents = ajaxHarvests.flatMap(harvest => harvest.request.body)
    expect(allAjaxEvents.length).toBeGreaterThan(0)

    // Verify 2nd-mfe (id: vite-second-mfe) fetch event
    const secondMfeFetch = allAjaxEvents.find(e => getAttr(e, 'source.id') === 'vite-second-mfe')
    expect(secondMfeFetch).toBeDefined()
    expect(getAttr(secondMfeFetch, 'source.name')).toEqual('2nd-mfe')
    expect(getAttr(secondMfeFetch, 'source.type')).toEqual('MFE')

    // Verify main MFE (id: vite-main-mfe) XHR event from axios
    const mainMfeXhr = allAjaxEvents.find(e => getAttr(e, 'source.id') === 'vite-main-mfe' && e.path?.includes('/json') && e.requestedWith === 'XMLHttpRequest')
    expect(mainMfeXhr).toBeDefined()
    expect(getAttr(mainMfeXhr, 'source.name')).toEqual('Main MFE')
    expect(getAttr(mainMfeXhr, 'source.type')).toEqual('MFE')

    // Verify lazy loaded module also reports as vite-main-mfe
    const lazyFetch = allAjaxEvents.find(e => getAttr(e, 'source.id') === 'vite-main-mfe' && e.path?.includes('/json') && e.requestedWith === 'fetch')
    expect(lazyFetch).toBeDefined()
    expect(getAttr(lazyFetch, 'source.name')).toEqual('Main MFE')
    expect(getAttr(lazyFetch, 'source.type')).toEqual('MFE')

    // Verify both MFEs have events
    const mainMfeEvents = allAjaxEvents.filter(e => getAttr(e, 'source.id') === 'vite-main-mfe')
    const secondMfeEvents = allAjaxEvents.filter(e => getAttr(e, 'source.id') === 'vite-second-mfe')
    expect(mainMfeEvents.length).toBeGreaterThan(0)
    expect(secondMfeEvents.length).toBeGreaterThan(0)
  })

  it('should support duplicate_data_to_container with auto-detection for AJAX events', async () => {
    const [
      mfeAjaxCapture,
      containerEventsCapture
    ] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testMFEAjaxEventsRequest },
      { test: testInteractionEventsRequest }
    ])
    const [outgoingJsonRequests] = await browser.testHandle.createNetworkCaptures('assetServer', [
      { test: assetServerJsonTest }
    ])

    await browser.url(await browser.testHandle.assetURL('test-builds/vite-react-mfe/index.html', {
      init: {
        api: {
          register: {
            enabled: true,
            duplicate_data_to_container: true
          }
        },
        distributed_tracing: {
          enabled: true
        }
      },
      loader: 'spa',
      injectUpdatedLoaderConfig: true
    }))

    await browser.waitForAgentLoad()

    // The harness's own test-id cookie is scoped to /build/ and /tests/assets/ only, so it never reaches a plain
    // route like /json -- broaden it to path '/' so the network capture above can correlate the MFE's own outgoing
    // AJAX calls (both fire on click, after this point) back to this test.
    await browser.setCookies({ name: 'test-id', value: browser.testHandle.testId, path: '/' })

    // trigger all the events
    await interactWithPage()

    // Verify MFE events exist at /events/2/ endpoint
    const [mfeAjaxHarvests] = await Promise.all([
      mfeAjaxCapture.waitForResult({ timeout: 10000 })
    ])
    const allMfeAjaxEvents = mfeAjaxHarvests.flatMap(harvest => harvest.request.body)
    expect(allMfeAjaxEvents.length).toBeGreaterThan(0)

    // Verify MFE events exist with source.id
    // vite-second-mfe was duplicated below in the IPL bIxn
    const secondMfeEvent = allMfeAjaxEvents.find(e => getAttr(e, 'source.id') === 'vite-second-mfe')
    expect(secondMfeEvent).toBeDefined()
    expect(getAttr(secondMfeEvent, 'source.name')).toEqual('2nd-mfe')
    // Validate that ajax events captured and duplicated will be found both in main container and MFE, even if the main captures it during bIxn.
    const containerHarvests = await containerEventsCapture.waitForResult({ totalCount: 1 })
    const containerIxnAjaxNode = containerHarvests[0].request.body[0].children.find(x => x.type === 'ajax')
    expect(getAttr(containerIxnAjaxNode, 'child.id')).toEqual('vite-second-mfe')
    expect(getAttr(containerIxnAjaxNode, 'child.type')).toEqual('MFE')

    const mainMfeEvent = allMfeAjaxEvents.find(e => getAttr(e, 'source.id') === 'vite-main-mfe')
    expect(mainMfeEvent).toBeDefined()
    expect(getAttr(mainMfeEvent, 'source.name')).toEqual('Main MFE')

    // Verify duplicated MFE events exist at /events/2/ endpoint for container agent
    const duplicatedMainMfeEvent = allMfeAjaxEvents.find(e => getAttr(e, 'child.id') === 'vite-main-mfe')
    expect(duplicatedMainMfeEvent).toBeDefined()
    expect(getAttr(duplicatedMainMfeEvent, 'child.type')).toEqual('MFE')

    // Check: the MFE-attributed event and its container-duplicate copy
    // represent the SAME real HTTP call, so they must carry two independent trace/span-ID pairs. If the agent ever
    // regressed to reusing the MFE event's IDs for the duplicate, BELC would create conflicting span/trace IDs.
    expect(mainMfeEvent.guid).toBeTruthy()
    expect(mainMfeEvent.traceId).toBeTruthy()
    expect(duplicatedMainMfeEvent.guid).toBeTruthy()
    expect(duplicatedMainMfeEvent.traceId).toBeTruthy()
    expect(duplicatedMainMfeEvent.guid).not.toEqual(mainMfeEvent.guid)
    expect(duplicatedMainMfeEvent.traceId).not.toEqual(mainMfeEvent.traceId)

    // Check: the MFE-attributed event's IDs should be what went out on the wire (headers stay
    // container-sourced regardless of target; only the id namespace differs downstream), while the
    // container-duplicate's independently-generated IDs never appear in any outgoing request header.
    // Both the legacy `newrelic` header and the W3C `traceparent` header carry their own encoding of the same
    // spanId/traceId, so both are checked independently rather than assuming one implies the other.
    const outgoingRequests = await outgoingJsonRequests.waitForResult({ timeout: 10000 })
    expect(outgoingRequests.length).toBeGreaterThan(0)
    const decodedHeaders = outgoingRequests.map(r => {
      const newrelicHeader = JSON.parse(atob(r.request.headers.newrelic))
      const [, traceparentTraceId, traceparentSpanId] = r.request.headers.traceparent.split('-')
      return { newrelicHeader, traceparentTraceId, traceparentSpanId }
    })

    const matchingLiveHeader = decodedHeaders.find(h => h.newrelicHeader.d.id === mainMfeEvent.guid)
    expect(matchingLiveHeader).toBeDefined()
    expect(matchingLiveHeader.newrelicHeader.d.tr).toEqual(mainMfeEvent.traceId)
    expect(matchingLiveHeader.newrelicHeader.d.ty).toEqual('Browser')
    expect(matchingLiveHeader.traceparentSpanId).toEqual(mainMfeEvent.guid)
    expect(matchingLiveHeader.traceparentTraceId).toEqual(mainMfeEvent.traceId)

    expect(decodedHeaders.some(h => h.newrelicHeader.d.id === duplicatedMainMfeEvent.guid)).toBe(false)
    expect(decodedHeaders.some(h => h.newrelicHeader.d.tr === duplicatedMainMfeEvent.traceId)).toBe(false)
    expect(decodedHeaders.some(h => h.traceparentSpanId === duplicatedMainMfeEvent.guid)).toBe(false)
    expect(decodedHeaders.some(h => h.traceparentTraceId === duplicatedMainMfeEvent.traceId)).toBe(false)
  })
})
