import {
  testMFEInsRequest
} from '../../../../tools/testing-server/utils/expect-tests'

describe('Register API - Auto-Detection - WebSockets', () => {
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
    await browser.refresh() // force any pending websocket requests to release and harvest
  }

  it('should auto-detect multiple MFEs from different script sources for WebSocket events', async () => {
    const [insCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
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

    const [insHarvests] = await Promise.all([
      insCapture.waitForResult({ timeout: 10000 })
    ])

    // Verify WebSocket events from both MFEs (INS endpoint)
    const allWebSockets = insHarvests.flatMap(harvest => (harvest.request.body.ins || []))
    expect(allWebSockets.length).toBeGreaterThan(0)

    // 2nd-mfe WebSocket
    const secondMfeWebSocket = allWebSockets.find(e => e['source.id'] === 'vite-second-mfe' && e.eventType === 'WebSocket')
    expect(secondMfeWebSocket).toBeDefined()
    expect(secondMfeWebSocket['source.name']).toEqual('2nd-mfe')
    expect(secondMfeWebSocket['source.type']).toEqual('MFE')

    // main MFE WebSocket (from main button click)
    const mainMfeWebSockets = allWebSockets.filter(e => e['source.id'] === 'vite-main-mfe' && e.eventType === 'WebSocket')
    expect(mainMfeWebSockets.length).toBeGreaterThanOrEqual(2) // main + lazy
    const mainMfeWebSocket = mainMfeWebSockets[0]
    expect(mainMfeWebSocket).toBeDefined()
    expect(mainMfeWebSocket['source.name']).toEqual('Main MFE')
    expect(mainMfeWebSocket['source.type']).toEqual('MFE')

    // lazy loaded WebSocket (should also report as vite-main-mfe with different socketId)
    const lazyWebSocket = mainMfeWebSockets[1]
    expect(lazyWebSocket).toBeDefined()
    expect(lazyWebSocket['source.name']).toEqual('Main MFE')
    expect(lazyWebSocket['source.type']).toEqual('MFE')
    expect(lazyWebSocket.socketId).not.toEqual(mainMfeWebSocket.socketId) // different WebSocket instances
  })

  it('should support duplicate_registered_data with auto-detection for WebSocket events', async () => {
    const [mfeInsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testMFEInsRequest }
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
    const [mfeInsHarvests] = await Promise.all([
      mfeInsCapture.waitForResult({ timeout: 10000 })
    ])

    // MFE WebSocket events (/ins/2/)
    const allMfeWebSockets = mfeInsHarvests.flatMap(harvest => (harvest.request.body.ins || []))
    expect(allMfeWebSockets.length).toBeGreaterThan(0)

    // WebSocket duplication - 2nd-mfe
    const secondMfeWebSocket = allMfeWebSockets.find(e => e['source.id'] === 'vite-second-mfe' && e.eventType === 'WebSocket')
    expect(secondMfeWebSocket).toBeDefined()
    expect(secondMfeWebSocket['source.name']).toEqual('2nd-mfe')
    expect(secondMfeWebSocket['source.type']).toEqual('MFE')
    const duplicatedSecondMfeWebSocket = allMfeWebSockets.find(e => e['child.id'] === 'vite-second-mfe' && e.eventType === 'WebSocket')
    expect(duplicatedSecondMfeWebSocket['entity.guid']).toBeDefined()
    expect(duplicatedSecondMfeWebSocket['child.type']).toEqual('MFE')

    // WebSocket duplication - main MFE (from main button click)
    const mainMfeWebSockets = allMfeWebSockets.filter(e => e['source.id'] === 'vite-main-mfe' && e.eventType === 'WebSocket')
    expect(mainMfeWebSockets.length).toBeGreaterThanOrEqual(2) // main + lazy
    const mainMfeWebSocket = mainMfeWebSockets[0]
    expect(mainMfeWebSocket).toBeDefined()
    expect(mainMfeWebSocket['source.name']).toEqual('Main MFE')
    expect(mainMfeWebSocket['source.type']).toEqual('MFE')
    const duplicatedMainMfeWebSockets = allMfeWebSockets.filter(e => e['child.id'] === 'vite-main-mfe' && e.eventType === 'WebSocket')
    expect(duplicatedMainMfeWebSockets.length).toBeGreaterThanOrEqual(2) // main + lazy
    const duplicatedMainMfeWebSocket = duplicatedMainMfeWebSockets[0]
    expect(duplicatedMainMfeWebSocket['entity.guid']).toBeDefined()
    expect(duplicatedMainMfeWebSocket['child.type']).toEqual('MFE')

    // WebSocket duplication - lazy loaded (should also report as vite-main-mfe with different socketId)
    const lazyWebSocket = mainMfeWebSockets[1]
    expect(lazyWebSocket).toBeDefined()
    expect(lazyWebSocket['source.name']).toEqual('Main MFE')
    expect(lazyWebSocket['source.type']).toEqual('MFE')
    expect(lazyWebSocket.socketId).not.toEqual(mainMfeWebSocket.socketId) // different WebSocket instances
    const duplicatedLazyWebSocket = duplicatedMainMfeWebSockets[1]
    expect(duplicatedLazyWebSocket['entity.guid']).toBeDefined()
    expect(duplicatedLazyWebSocket['child.type']).toEqual('MFE')
    expect(duplicatedLazyWebSocket.socketId).toEqual(lazyWebSocket.socketId) // same WebSocket as source version
  })
})
