import { testInteractionEventsRequest, testLogsRequest, testMFEAjaxEventsRequest, testMFEErrorsRequest, testMFEInsRequest } from '../../../../tools/testing-server/utils/expect-tests'

// Helper to get attribute value from children array
function getAttr (event, key) {
  const child = event.children?.find(c => c.key === key)
  return child?.value
}

describe('Register API - Auto-Detection', () => {
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

  it('should auto-detect multiple MFEs from different script sources for all event types', async () => {
    const [ajaxCapture, errorsCapture, logsCapture, insCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testMFEAjaxEventsRequest },
      { test: testMFEErrorsRequest },
      { test: testLogsRequest },
      { test: testMFEInsRequest }
    ])

    await browser.url(await browser.testHandle.assetURL('test-builds/vite-react-mfe/index.html', {
      init: {
        api: {
          allow_registered_children: true
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
    const [ajaxHarvests, errorHarvests, logHarvests, insHarvests] = await Promise.all([
      ajaxCapture.waitForResult({ timeout: 10000 }),
      errorsCapture.waitForResult({ timeout: 10000 }),
      logsCapture.waitForResult({ timeout: 10000 }),
      insCapture.waitForResult({ timeout: 10000 })
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

    // Verify ERROR events from both MFEs
    const allErrors = errorHarvests.flatMap(harvest => harvest.request.body.err || [])
    expect(allErrors.length).toBeGreaterThan(0)

    // Verify 2nd-mfe (id: vite-second-mfe) error
    const secondMfeError = allErrors.find(e => e.params?.message?.includes('2nd mfe error'))
    expect(secondMfeError).toBeDefined()
    expect(secondMfeError.custom['source.id']).toEqual('vite-second-mfe')
    expect(secondMfeError.custom['source.name']).toEqual('2nd-mfe')

    // Verify main MFE (id: vite-main-mfe) error
    const mainMfeError = allErrors.find(e => e.params?.message?.includes('test'))
    expect(mainMfeError).toBeDefined()
    expect(mainMfeError.custom['source.id']).toEqual('vite-main-mfe')
    expect(mainMfeError.custom['source.name']).toEqual('Main MFE')

    // Verify lazy loaded module error also reports as vite-main-mfe
    const lazyError = allErrors.find(e => e.params?.message?.includes('lazy test'))
    expect(lazyError).toBeDefined()
    expect(lazyError.custom['source.id']).toEqual('vite-main-mfe')
    expect(lazyError.custom['source.name']).toEqual('Main MFE')

    // Verify LOG events from both MFEs
    const allLogs = logHarvests.flatMap(harvest => JSON.parse(harvest.request.body)[0].logs || [])
    expect(allLogs.length).toBeGreaterThan(0)

    // Verify 2nd-mfe (id: vite-second-mfe) log
    const secondMfeLog = allLogs.find(l => l.message?.includes('2nd mfe log'))
    expect(secondMfeLog).toBeDefined()
    expect(secondMfeLog.attributes['source.id']).toEqual('vite-second-mfe')
    expect(secondMfeLog.attributes['source.name']).toEqual('2nd-mfe')

    // Verify main MFE (id: vite-main-mfe) log
    const mainMfeLog = allLogs.find(l => l.message?.includes('click in MFE'))
    expect(mainMfeLog).toBeDefined()
    expect(mainMfeLog.attributes['source.id']).toEqual('vite-main-mfe')
    expect(mainMfeLog.attributes['source.name']).toEqual('Main MFE')

    // Verify lazy loaded module log also reports as vite-main-mfe
    const lazyLog = allLogs.find(l => l.message?.includes('log from lazy'))
    expect(lazyLog).toBeDefined()
    expect(lazyLog.attributes['source.id']).toEqual('vite-main-mfe')
    expect(lazyLog.attributes['source.name']).toEqual('Main MFE')

    // Verify UserAction events from both MFEs (INS endpoint)
    const allUserActions = insHarvests.flatMap(harvest => (harvest.request.body.ins || []))
    expect(allUserActions.length).toBeGreaterThan(0)

    // 2nd-mfe UserAction
    const secondMfeUserAction = allUserActions.find(e => e['source.id'] === 'vite-second-mfe' && e.eventType === 'UserAction')
    expect(secondMfeUserAction).toBeDefined()
    expect(secondMfeUserAction['source.name']).toEqual('2nd-mfe')
    expect(secondMfeUserAction['source.type']).toEqual('MFE')

    // main MFE UserAction
    const mainMfeUserAction = allUserActions.find(e => e['source.id'] === 'vite-main-mfe' && e.eventType === 'UserAction')
    expect(mainMfeUserAction).toBeDefined()
    expect(mainMfeUserAction['source.name']).toEqual('Main MFE')
    expect(mainMfeUserAction['source.type']).toEqual('MFE')

    // lazy loaded UserAction (should also report as vite-main-mfe)
    const lazyUserAction = allUserActions.find(e => e['source.id'] === 'vite-main-mfe' && e.eventType === 'UserAction' && e.targetId === 'lazy-button')
    expect(lazyUserAction).toBeDefined()
    expect(lazyUserAction['source.name']).toEqual('Main MFE')
    expect(lazyUserAction['source.type']).toEqual('MFE')
  })

  it('should support duplicate_registered_data with auto-detection', async () => {
    const { testInsRequest, testMFEErrorsRequest, testLogsRequest } = require('../../../../tools/testing-server/utils/expect-tests')
    const [mfeAjaxCapture, containerEventsCapture, mfeInsCapture, mfeErrorsCapture, mfeLogsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testMFEAjaxEventsRequest },
      { test: testInteractionEventsRequest },
      { test: testMFEInsRequest },
      { test: testMFEErrorsRequest },
      { test: testLogsRequest },
      { test: testInsRequest }
    ])

    await browser.url(await browser.testHandle.assetURL('test-builds/vite-react-mfe/index.html', {
      init: {
        api: {
          allow_registered_children: true,
          duplicate_registered_data: true
        }
      },
      loader: 'spa'
    }))

    await browser.waitForAgentLoad()

    // trigger all the events
    await interactWithPage()

    // Verify MFE events exist at /events/2/ endpoint
    const [mfeAjaxHarvests, mfeInsHarvests, mfeErrorsHarvests, mfeLogsHarvests] = await Promise.all([
      mfeAjaxCapture.waitForResult({ timeout: 10000 }),
      mfeInsCapture.waitForResult({ timeout: 10000 }),
      mfeErrorsCapture.waitForResult({ timeout: 10000 }),
      mfeLogsCapture.waitForResult({ timeout: 10000 })
    ])
    const allMfeAjaxEvents = mfeAjaxHarvests.flatMap(harvest => harvest.request.body)
    expect(allMfeAjaxEvents.length).toBeGreaterThan(0)
    const allMfeErrors = mfeErrorsHarvests.flatMap(harvest => harvest.request.body.err || [])
    expect(allMfeErrors.length).toBeGreaterThan(0)
    const allMfeLogs = mfeLogsHarvests.flatMap(harvest => JSON.parse(harvest.request.body)[0].logs || [])
    expect(allMfeLogs.length).toBeGreaterThan(0)

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

    // --- UserAction, Error, Log duplication checks ---
    // MFE UserAction events (/ins/2/)
    const allMfeUserActions = mfeInsHarvests.flatMap(harvest => (harvest.request.body.ins || []))
    expect(allMfeUserActions.length).toBeGreaterThan(0)

    // UserAction duplication
    const secondMfeUserAction = allMfeUserActions.find(e => e['source.id'] === 'vite-second-mfe' && e.eventType === 'UserAction')
    expect(secondMfeUserAction).toBeDefined()
    expect(secondMfeUserAction['source.name']).toEqual('2nd-mfe')
    expect(secondMfeUserAction['source.type']).toEqual('MFE')
    const duplicatedSecondMfeUserAction = allMfeUserActions.find(e => e['child.id'] === 'vite-second-mfe' && e.eventType === 'UserAction')
    expect(duplicatedSecondMfeUserAction['entity.guid']).toBeDefined()
    expect(duplicatedSecondMfeUserAction['child.type']).toEqual('MFE')

    const mainMfeUserAction = allMfeUserActions.find(e => e['source.id'] === 'vite-main-mfe' && e.eventType === 'UserAction')
    expect(mainMfeUserAction).toBeDefined()
    expect(mainMfeUserAction['source.name']).toEqual('Main MFE')
    expect(mainMfeUserAction['source.type']).toEqual('MFE')
    const duplicatedMainMfeUserAction = allMfeUserActions.find(e => e['child.id'] === 'vite-main-mfe' && e.eventType === 'UserAction')
    expect(duplicatedMainMfeUserAction['entity.guid']).toBeDefined()
    expect(duplicatedMainMfeUserAction['child.type']).toEqual('MFE')

    const lazyUserAction = allMfeUserActions.find(e => e['source.id'] === 'vite-main-mfe' && e.eventType === 'UserAction' && e.targetId === 'lazy-button')
    expect(lazyUserAction).toBeDefined()
    expect(lazyUserAction['source.name']).toEqual('Main MFE')
    expect(lazyUserAction['source.type']).toEqual('MFE')
    const duplicatedLazyUserAction = allMfeUserActions.find(e => e['child.id'] === 'vite-main-mfe' && e.eventType === 'UserAction' && e.targetId === 'lazy-button')
    expect(duplicatedLazyUserAction['entity.guid']).toBeDefined()
    expect(duplicatedLazyUserAction['child.type']).toEqual('MFE')

    const secondMfeError = allMfeErrors.find(e => e.custom?.['source.id'] === 'vite-second-mfe' && e.params?.message?.includes('2nd mfe error'))
    expect(secondMfeError).toBeDefined()
    const duplicatedSecondMfeError = allMfeErrors.find(e => e.custom?.['child.id'] === 'vite-second-mfe' && e.params?.message?.includes('2nd mfe error'))
    expect(duplicatedSecondMfeError).toBeDefined()
    expect(duplicatedSecondMfeError.custom['child.type']).toEqual('MFE')

    const mainMfeError = allMfeErrors.find(e => e.custom?.['source.id'] === 'vite-main-mfe' && e.params?.message?.includes('test'))
    expect(mainMfeError).toBeDefined()
    const duplicatedMainMfeError = allMfeErrors.find(e => e.custom?.['child.id'] === 'vite-main-mfe' && e.params?.message?.includes('test'))
    expect(duplicatedMainMfeError).toBeDefined()
    expect(duplicatedMainMfeError.custom['child.type']).toEqual('MFE')

    const lazyError = allMfeErrors.find(e => e.custom?.['source.id'] === 'vite-main-mfe' && e.params?.message?.includes('lazy test'))
    expect(lazyError).toBeDefined()
    const duplicatedLazyError = allMfeErrors.find(e => e.custom?.['child.id'] === 'vite-main-mfe' && e.params?.message?.includes('lazy test'))
    expect(duplicatedLazyError).toBeDefined()
    expect(duplicatedLazyError.custom['child.type']).toEqual('MFE')

    // Log duplication
    const secondMfeLog = allMfeLogs.find(l => l.attributes?.['source.id'] === 'vite-second-mfe' && l.message?.includes('2nd mfe log'))
    expect(secondMfeLog).toBeDefined()
    const duplicatedSecondMfeLog = allMfeLogs.find(l => l.attributes?.['child.id'] === 'vite-second-mfe' && l.message?.includes('2nd mfe log'))
    expect(duplicatedSecondMfeLog).toBeDefined()
    expect(duplicatedSecondMfeLog.attributes['child.type']).toEqual('MFE')

    const mainMfeLog = allMfeLogs.find(l => l.attributes?.['source.id'] === 'vite-main-mfe' && l.message?.includes('click in MFE'))
    expect(mainMfeLog).toBeDefined()
    const duplicatedMainMfeLog = allMfeLogs.find(l => l.attributes?.['child.id'] === 'vite-main-mfe' && l.message?.includes('click in MFE'))
    expect(duplicatedMainMfeLog).toBeDefined()
    expect(duplicatedMainMfeLog.attributes['child.type']).toEqual('MFE')

    const lazyLog = allMfeLogs.find(l => l.attributes?.['source.id'] === 'vite-main-mfe' && l.message?.includes('log from lazy'))
    expect(lazyLog).toBeDefined()
    const duplicatedLazyLog = allMfeLogs.find(l => l.attributes?.['child.id'] === 'vite-main-mfe' && l.message?.includes('log from lazy'))
    expect(duplicatedLazyLog).toBeDefined()
    expect(duplicatedLazyLog.attributes['child.type']).toEqual('MFE')
  })
})
