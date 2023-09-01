import { notIE, notSafari, notIOS } from '../../tools/browser-matcher/common-matchers.mjs'

describe('Using proxy servers -', () => {
  // Safari v14- doesn't support this feature either, but that's OoS of existing testing versions.
  // Furthermore: Safari does not include resource entries for failed script resource, so it's totally excluded.

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
})
