import { supportsFetchExtended } from '../../tools/browser-matcher/common-matchers.mjs'

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
    browser.url(await browser.testHandle.assetURL('/'))
    const response = await browser.testHandle.expectMetrics(3000)
    const supportabilityMetrics = response.request.body.sm || []
    expect(supportabilityMetrics).toEqual(expect.arrayContaining([{
      params: { name: 'Framework/React/Detected' },
      stats: { c: expect.toBeFinite() }
    }]))
  })

  withBrowsersMatching(supportsFetchExtended)('detects a page built with ANGULAR and sends a supportability metric', async () => {
    await Promise.all([
      browser.testHandle.expectRum(),
      browser.url(await browser.testHandle.assetURL('frameworks/angular/simple-app/index.html', config))
        .then(() => browser.waitForAgentLoad())
    ])
    browser.url(await browser.testHandle.assetURL('/'))
    const response = await browser.testHandle.expectMetrics(3000)
    const supportabilityMetrics = response.request.body.sm || []
    expect(supportabilityMetrics).toEqual(expect.arrayContaining([{
      params: { name: 'Framework/Angular/Detected' },
      stats: { c: expect.toBeFinite() }
    }]))
  })

  withBrowsersMatching(supportsFetchExtended)('detects a page built with NO FRAMEWORK and DOES NOT send a supportability metric', async () => {
    await Promise.all([
      browser.testHandle.expectRum(),
      browser.url(await browser.testHandle.assetURL('frameworks/control.html', config))
        .then(() => browser.waitForAgentLoad())
    ])
    browser.url(await browser.testHandle.assetURL('/'))
    const response = await browser.testHandle.expectMetrics(3000)
    const supportabilityMetrics = response.request.body.sm
    // In theory, we can't assume there will always be other supportability metrics in the future.
    if (supportabilityMetrics) {
      expect(supportabilityMetrics.find(x => x.params.name.includes('Framework'))).toBeUndefined()
    }
  })
})
