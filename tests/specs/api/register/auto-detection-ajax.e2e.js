import {
  testInteractionEventsRequest,
  testMFEAjaxEventsRequest
} from '../../../../tools/testing-server/utils/expect-tests'

// Helper to get attribute value from children array
function getAttr (event, key) {
  const child = event.children?.find(c => c.key === key)
  return child?.value
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

    await browser.url(await browser.testHandle.assetURL('test-builds/vite-react-mfe/index.html', {
      init: {
        api: {
          register: {
            enabled: true,
            duplicate_data_to_container: true
          }
        }
      },
      loader: 'spa'
    }))

    await browser.waitForAgentLoad()

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
  })
})
