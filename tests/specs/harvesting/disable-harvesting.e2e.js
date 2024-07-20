import { testRumRequest } from '../../../tools/testing-server/utils/expect-tests'

describe('disable harvesting', () => {
  it('should disable harvesting metrics and errors when err entitlement is 0', async () => {
    browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: `${JSON.stringify({
        st: 1,
        err: 0,
        ins: 1,
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
        st: 1,
        err: 1,
        ins: 1,
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
        st: 1,
        err: 1,
        ins: 0,
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
        st: 0,
        err: 1,
        ins: 1,
        spa: 1,
        loaded: 1
      })
      }`
    })

    const stnPromise = browser.testHandle.expectTrace(10000, true)

    await browser.url(await browser.testHandle.assetURL('obfuscate-pii.html'))
      .then(() => browser.waitForAgentLoad())

    await expect(stnPromise).resolves.toEqual(undefined)
  })

  ;['app-id', 'license-key'].forEach(name => {
    ;['before', 'after'].forEach(loadState => {
      it(`should disable all harvesting and abort if ${name} is absent (${loadState})`, async () => {
        const rumPromise = browser.testHandle.expectRum(10000, true)

        await browser.url(await browser.testHandle.assetURL(`no-${name}-${loadState}.html`))

        await expect(rumPromise).resolves.toEqual(undefined)

        const eeBacklog = await browser.execute(function () {
          return newrelic.ee.backlog
        })
        expect(eeBacklog).toEqual({})
      })
    })
  })
})
