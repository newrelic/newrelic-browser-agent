import {
  testMFEErrorsRequest
} from '../../../../tools/testing-server/utils/expect-tests'

describe('Register API - Auto-Detection - Errors', () => {
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

  it('should auto-detect multiple MFEs from different script sources for error events', async () => {
    const [errorsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testMFEErrorsRequest }
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

    const [errorHarvests] = await Promise.all([
      errorsCapture.waitForResult({ timeout: 10000 })
    ])

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
  })

  it('should support duplicate_registered_data with auto-detection for error events', async () => {
    const { testMFEErrorsRequest } = require('../../../../tools/testing-server/utils/expect-tests')
    const [mfeErrorsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testMFEErrorsRequest }
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

    // Verify MFE events exist at /jserrors endpoint
    const [mfeErrorsHarvests] = await Promise.all([
      mfeErrorsCapture.waitForResult({ timeout: 10000 })
    ])
    const allMfeErrors = mfeErrorsHarvests.flatMap(harvest => harvest.request.body.err || [])
    expect(allMfeErrors.length).toBeGreaterThan(0)

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
  })
})
