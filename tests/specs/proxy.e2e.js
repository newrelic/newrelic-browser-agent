import { notIE, notSafari, notIOS } from '../../tools/browser-matcher/common-matchers.mjs'
import { defaults } from '../../src/common/window/nreum'

describe('Using proxy servers -', () => {
  // Safari v14- doesn't support this feature either, but that's OoS of existing testing versions.

  // Furthermore: Safari does not include resource entries for failed-to-load script & ajax requests, so it's totally excluded.
  it.withBrowsersMatching([notIE, notSafari, notIOS])('setting an assetsPath in info changes where agent fetches its chunks from', async () => {
    const { host, port } = browser.testHandle.assetServerConfig
    /** This is where we expect the agent to fetch its chunk. '/build/' is necessary within the URL because the way our asset server
     * handles each test requests -- see /testing-server/plugins/test-handle/index.js. */
    const assetServerChangedUrl = `${host}:${port}/build/fakepath/`
    let url = await browser.testHandle.assetURL('instrumented.html', { init: { assetsPath: assetServerChangedUrl } })

    // Expecting a resource fetch to https://bam-test-1.nr-local.net:<asset port>/build/fakepath/nr-spa.min.js for chunk
    await browser.setTimeout({ pageLoad: 10000 }) // not expecting RUM to be called, etc.
    await browser.url(url)
    await browser.pause(500) // give it a bit of time to process
    let resources = await browser.execute(function () {
      return performance.getEntriesByType('resource')
    })

    expect(resources.some(entry => entry.name.includes('/build/fakepath/nr-spa') && entry.name.startsWith('https:'))).toBeTruthy()
  })

  it.withBrowsersMatching([notIE, notSafari, notIOS])('setting a different but valid-URL beacon (and errorBeacon) changes RUM call destination', async () => {
    let url = await browser.testHandle.assetURL('instrumented.html', { config: { beacon: 'https://localhost:1234', errorBeacon: 'https://localhost:1234' } })
    await browser.setTimeout({ pageLoad: 10000 })
    await browser.url(url)
    if (browser.capabilities.browserName === 'firefox') await browser.pause(10000) // for some reason firefox takes longer to fail & create entry, maybe it's the localhost
    else await browser.pause(5000) // takes RUM a while to get sent (< 3s but better more stable)

    let resources = await browser.execute(function () {
      return performance.getEntriesByType('resource')
    })
    expect(resources.some(entry => entry.name.startsWith('https://localhost:1234/1/'))).toBeTruthy()
  })

  it.withBrowsersMatching([notIE, notSafari, notIOS])('setting a different invalid-URL beacon makes agent fall back to default', async () => {
    let url = await browser.testHandle.assetURL('instrumented.html', { config: { beacon: 'invalid_url', errorBeacon: 'invalid_url' } })
    await browser.setTimeout({ pageLoad: 10000 })
    await browser.url(url)
    await browser.pause(5000) // takes RUM a while to get sent (< 3s but better more stable)

    let resources = await browser.execute(function () {
      return performance.getEntriesByType('resource')
    })
    expect(resources.some(entry => entry.name.startsWith('https://' + defaults.errorBeacon))).toBeTruthy()
  })

  // Safari desktop & iOS can pass this following test since the agent should work "normally"
  it.withBrowsersMatching(notIE)('should send SM when beacon is changed', async () => {
    const { host, port } = browser.testHandle.bamServerConfig
    // Even though the beacon isn't actually changed, this should still trigger the agent to emit sm due to difference between bam-test url vs actual default. Too bad the new assetsPath has no way to allow http.
    let url = await browser.testHandle.assetURL('instrumented.html', { config: { beacon: `${host}:${port}`, errorBeacon: `${host}:${port}` } })
    await browser.url(url).then(() => browser.waitForAgentLoad())
    const [unloadSupportMetricsResults] = await Promise.all([
      browser.testHandle.expectSupportMetrics(),
      await browser.url(await browser.testHandle.assetURL('/')) // Setup expects before navigating
    ])

    const supportabilityMetrics = unloadSupportMetricsResults.request.body.sm || []
    expect(supportabilityMetrics).toEqual(expect.arrayContaining([{
      params: { name: 'Config/BeaconUrl/Changed' },
      stats: { c: 1 }
    }]))
  })
})
