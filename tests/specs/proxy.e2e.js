import { notIE } from '../../tools/browser-matcher/common-matchers.mjs'

describe('Using proxy servers -', () => {
  // Safari v14- doesn't support this feature either, but that's OoS of existing testing versions.
  it.withBrowsersMatching(notIE)('setting an assetsPath in info changes where agent fetches its chunks from', async () => {
    const { host, port } = browser.testHandle.assetServerConfig
    /** This is where we expect the agent to fetch its chunk. '/build/' is necessary within the URL because the way our asset server
     * handles each test requests -- see /testing-server/plugins/test-handle/index.js. */
    const assetServerChangedUrl = `http://${host}:${port}/build/fakepath/`
    let url = await browser.testHandle.assetURL('instrumented.html', { config: { assetsPath: assetServerChangedUrl } })

    // Expecting a GET to http://bam-test-1.nr-local.net:<asset port>/build/fakepath/nr-spa.min.js for chunk and response of 404 (no cross-origin)
    let expectRequest = browser.testHandle.expect('assetServer', {
      test: function (request) {
        return request.url.startsWith('/build/fakepath/nr-spa')
      }
    })
    await browser.setTimeout({ pageLoad: 10000 }) // not expecting RUM to be called, etc.
    await browser.url(url)

    let { reply } = await expectRequest
    expect(reply.statusCode).toEqual(404)
    expect(reply.body.includes('GET:/build/fakepath/nr-spa')).toBeTruthy()
  })
})
