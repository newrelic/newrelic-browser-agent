import {
  testMFEInsRequest
} from '../../../../tools/testing-server/utils/expect-tests'

describe('Register API - Auto-Detection - User Actions', () => {
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

  it('should auto-detect multiple MFEs from different script sources for UserAction events', async () => {
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

  it('should support duplicate_registered_data with auto-detection for UserAction events', async () => {
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
  })
})
