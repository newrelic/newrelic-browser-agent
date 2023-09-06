import { notIE, notSafari, notIOS } from '../../tools/browser-matcher/common-matchers.mjs'

describe('Using proxy servers -', () => {
  it.withBrowsersMatching(notIE)('setting an assets url changes where agent fetches its chunks from', async () => {
    const { host, port } = browser.testHandle.assetServerConfig
    /** This is where we expect the agent to fetch its chunk. '/build/' is necessary within the URL because the way our asset server
     * handles each test requests -- see /testing-server/plugins/test-handle/index.js. */
    const assetServerChangedUrl = `http://${host}:${port}/build/fakepath`
    let url = await browser.testHandle.assetURL('instrumented.html', { init: { proxy: { assets: assetServerChangedUrl } } })

    // Expecting a resource fetch to https://bam-test-1.nr-local.net:<asset port>/build/fakepath/nr-spa.min.js for chunk
    await browser.setTimeout({ pageLoad: 10000 }) // not expecting RUM to be called, etc.
    await browser.url(url)
    await browser.pause(500) // give it a bit of time to process
    let resources = await browser.execute(function () { // IE11 hates this for some reason
      return performance.getEntriesByType('resource')
    })

    expect(resources.some(entry => entry.name.includes('/build/fakepath/nr-spa'))).toBeTruthy()
  })

  // Safari does not include resource entries for failed-to-load script & ajax requests, so it's totally excluded.
  it.withBrowsersMatching([notIE, notSafari, notIOS])('setting a beacon url changes RUM call destination', async () => {
    let url = await browser.testHandle.assetURL('instrumented.html', { init: { proxy: { beacon: 'localhost:1234' } } })
    await browser.setTimeout({ pageLoad: 10000 })
    await browser.url(url)
    if (browser.capabilities.browserName === 'firefox') await browser.pause(10000) // for some reason firefox takes longer to fail & create entry, maybe it's the localhost
    else await browser.pause(5000) // takes RUM a while to get sent (< 3s but better more stable)

    let resources = await browser.execute(function () {
      return performance.getEntriesByType('resource')
    })
    expect(resources.some(entry => entry.name.startsWith('http://localhost:1234/1/'))).toBeTruthy()
  })

  it.withBrowsersMatching(notIE)('should send SM when beacon is changed', async () => {
    const { host: bamHost, port: bamPort } = browser.testHandle.bamServerConfig
    const { host: assetHost, port: assetPort } = browser.testHandle.assetServerConfig
    // Even though the beacon isn't actually changed, this should still trigger the agent to emit sm due to difference between bam-test url vs actual default.
    let url = await browser.testHandle.assetURL('instrumented.html', { init: { proxy: { beacon: `${bamHost}:${bamPort}`, assets: `http://${assetHost}:${assetPort}/build` } } })
    await browser.url(url).then(() => browser.waitForAgentLoad())
    const [unloadSupportMetricsResults] = await Promise.all([
      browser.testHandle.expectSupportMetrics(),
      await browser.url(await browser.testHandle.assetURL('/')) // Setup expects before navigating
    ])

    const supportabilityMetrics = unloadSupportMetricsResults.request.body.sm || []
    expect(supportabilityMetrics).toEqual(expect.arrayContaining([{
      params: { name: 'Config/BeaconUrl/Changed' },
      stats: { c: 1 }
    }, {
      params: { name: 'Config/AssetsUrl/Changed' },
      stats: { c: 1 }
    }]))
  })
})
