import { supportsFetchExtended } from '../../tools/browser-matcher/common-matchers.mjs'
import { getMetricsFromResponse } from './helpers/assertion-helpers'

const config = {
  init: {
    page_view_timing: {
      enabled: false
    }
  }
}

describe('framework detection', () => {
  withBrowsersMatching(supportsFetchExtended)('detects a page built with REACT and sends a supportability metric', async () => {
    await Promise.all([
      browser.testHandle.expectRum(),
      browser.url(await browser.testHandle.assetURL('frameworks/react/simple-app/index.html', config))
        .then(() => browser.waitForAgentLoad())
    ])
    const [unloadSupportMetricsResults] = Promise.all([
      browser.testHandle.expectSupportMetrics(3000),
      browser.url(await browser.testHandle.assetURL('/'))
    ])
    const supportabilityMetrics = unloadSupportMetricsResults.request.body.sm || []
    expect(supportabilityMetrics).toEqual(expect.arrayContaining([{
      params: { name: 'Framework/React/Detected' },
      stats: { t: expect.toBeFinite() }
    }]))
  })

  withBrowsersMatching(supportsFetchExtended)('detects a page built with ANGULAR and sends a supportability metric', async () => {
    const rumPromise = browser.testHandle.expectRum()
    await browser.url(await browser.testHandle.assetURL('frameworks/angular/simple-app/index.html', config)).then(() => browser.waitForAgentLoad())

    await rumPromise.then(async () => {
      browser.url(await browser.testHandle.assetURL('/'))
      return browser.testHandle.expectMetrics(3000)
    }).then((response) => {
      const supportabilityMetrics = getMetricsFromResponse(response, true)
      expect(supportabilityMetrics).toBeDefined()
      expect(supportabilityMetrics.length).toBeGreaterThan(0) // SupportabilityMetrics objects were generated
      const sm = supportabilityMetrics.find(x => x.params.name.includes('Framework'))
      expect(sm.params.name).toEqual('Framework/Angular/Detected') // Supportability metric is Angular and is formatted correctly
    })
  })

  withBrowsersMatching(supportsFetchExtended)('detects a page built with NO FRAMEWORK and DOES NOT send a supportability metric', async () => {
    const rumPromise = browser.testHandle.expectRum()
    await browser.url(await browser.testHandle.assetURL('frameworks/control.html', config)).then(() => browser.waitForAgentLoad())

    await rumPromise.then(async () => {
      browser.url(await browser.testHandle.assetURL('/'))
      return browser.testHandle.expectMetrics(3000)
    }).then((response) => {
      const supportabilityMetrics = getMetricsFromResponse(response, true)
      // In theory, we can't assume there will always be other supportability metrics in the future.
      if (supportabilityMetrics) {
        const sm = supportabilityMetrics.find(x => x.params.name.includes('Framework'))
        expect(sm).toBeUndefined() // FRAMEWORK SupportabilityMetrics object(s) were NOT generated
      }
    })
  })
})
