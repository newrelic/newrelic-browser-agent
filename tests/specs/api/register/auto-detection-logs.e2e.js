import {
  testLogsRequest
} from '../../../../tools/testing-server/utils/expect-tests'

describe('Register API - Auto-Detection - Logs', () => {
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

  it('should auto-detect multiple MFEs from different script sources for log events', async () => {
    const [logsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testLogsRequest }
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

    const [logsHarvests] = await Promise.all([
      logsCapture.waitForResult({ timeout: 10000 })
    ])

    // Verify LOG events from both MFEs
    const allLogs = logsHarvests.flatMap(harvest => JSON.parse(harvest.request.body)[0].logs || [])
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
  })

  it('should support duplicate_data_to_container with auto-detection for log events', async () => {
    const { testLogsRequest } = require('../../../../tools/testing-server/utils/expect-tests')
    const [mfeLogsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testLogsRequest }
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

    // Verify MFE events exist at /logs endpoint
    const [mfeLogsHarvests] = await Promise.all([
      mfeLogsCapture.waitForResult({ timeout: 10000 })
    ])
    const allMfeLogs = mfeLogsHarvests.flatMap(harvest => JSON.parse(harvest.request.body)[0].logs || [])
    expect(allMfeLogs.length).toBeGreaterThan(0)

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
