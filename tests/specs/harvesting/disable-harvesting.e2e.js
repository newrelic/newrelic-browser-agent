import { testRumRequest } from '../../../tools/testing-server/utils/expect-tests'

describe('disable harvesting', () => {
  it('should disable harvesting metrics and errors when err entitlement is 0', async () => {
    browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: `${JSON.stringify({
        stn: 1,
        err: 0,
        ins: 1,
        cap: 1,
        spa: 1,
        loaded: 1
      })
      }`
    })

    const metricsPromise = browser.testHandle.expectMetrics(10000, true)
    const errorsPromise = browser.testHandle.expectErrors(10000, true)

    await browser.url(await browser.testHandle.assetURL('obfuscate-pii.html'))
      .then(() => browser.waitForAgentLoad())

    await expect(metricsPromise).resolves.toEqual(undefined)
    await expect(errorsPromise).resolves.toEqual(undefined)
  })

  it('should disable harvesting spa when spa entitlement is 0', async () => {
    browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: `${JSON.stringify({
        stn: 1,
        err: 1,
        ins: 1,
        cap: 1,
        spa: 0,
        loaded: 1
      })
      }`
    })

    // Disable non-spa features that also use the events endpoint
    const init = {
      ajax: { enabled: false },
      page_view_timing: { enabled: false }
    }
    const eventsPromise = browser.testHandle.expectEvents(10000, true)

    await browser.url(await browser.testHandle.assetURL('obfuscate-pii.html', { init }))
      .then(() => browser.waitForAgentLoad())

    await expect(eventsPromise).resolves.toEqual(undefined)
  })

  it('should disable harvesting page actions when ins entitlement is 0', async () => {
    browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: `${JSON.stringify({
        stn: 1,
        err: 1,
        ins: 0,
        cap: 1,
        spa: 1,
        loaded: 1
      })
      }`
    })

    const insPromise = browser.testHandle.expectIns(10000, true)

    await browser.url(await browser.testHandle.assetURL('obfuscate-pii.html'))
      .then(() => browser.waitForAgentLoad())

    await expect(insPromise).resolves.toEqual(undefined)
  })

  it('should disable harvesting session traces when stn entitlement is 0', async () => {
    browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: `${JSON.stringify({
        stn: 0,
        err: 1,
        ins: 1,
        cap: 1,
        spa: 1,
        loaded: 1
      })
      }`
    })

    const stnPromise = browser.testHandle.expectResources(10000, true)

    await browser.url(await browser.testHandle.assetURL('obfuscate-pii.html'))
      .then(() => browser.waitForAgentLoad())

    await expect(stnPromise).resolves.toEqual(undefined)
  })
})
