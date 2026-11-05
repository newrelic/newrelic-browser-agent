import { testAjaxEventsRequest, testRumRequest, testSupportMetricsRequest } from '../../tools/testing-server/utils/expect-tests'

describe('Using proxy servers -', () => {
  let rumCapture
  let supportabilityMetricsCapture

  beforeEach(async () => {
    [rumCapture, supportabilityMetricsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testRumRequest },
      { test: testSupportMetricsRequest }
    ])
  })

  it('setting an assets url changes where agent fetches its chunks from', async () => {
    const { host, port } = browser.testHandle.assetServerConfig
    const assetServerChangedUrl = `http://${host}:${port}/assets`
    const url = await browser.testHandle.assetURL('instrumented.html', { init: { proxy: { assets: assetServerChangedUrl } } })

    const [[rumResults]] = await Promise.all([
      rumCapture.waitForResult({ totalCount: 1 }),
      browser.url(url)
        .then(() => browser.waitForAgentLoad())
    ])

    expect(rumResults.request.query).toEqual(expect.objectContaining({
      ref: url.slice(0, url.indexOf('?'))
    }))

    let resources = await browser.execute(function () { // IE11 hates this for some reason
      return performance.getEntriesByType('resource')
    })

    expect(resources).toEqual(expect.arrayContaining([
      expect.objectContaining({
        name: expect.stringContaining(assetServerChangedUrl)
      })
    ]))

    const [supportabilityMetricsHarvests] = await Promise.all([
      supportabilityMetricsCapture.waitForResult({ timeout: 5000 }),
      browser.url(await browser.testHandle.assetURL('/'))
    ])

    expect(supportabilityMetricsHarvests).toEqual(expect.arrayContaining([
      expect.objectContaining({
        request: expect.objectContaining({
          body: expect.objectContaining({
            sm: expect.arrayContaining([
              { params: { name: 'Config/AssetsUrl/Changed' }, stats: { c: 1 } }
            ])
          })
        })
      })
    ]))
  })

  it('setting a beacon url changes RUM call destination', async () => {
    const { host, port } = browser.testHandle.assetServerConfig
    const beaconServerChangedUrl = `${host}:${port}/beacon`
    const url = await browser.testHandle.assetURL('instrumented.html', { init: { proxy: { beacon: beaconServerChangedUrl } } })

    const [[rumResults]] = await Promise.all([
      rumCapture.waitForResult({ totalCount: 1 }),
      browser.url(url)
        .then(() => browser.waitForAgentLoad())
    ])

    expect(rumResults.request.query).toEqual(expect.objectContaining({
      ref: url.slice(0, url.indexOf('?'))
    }))

    let resources = await browser.execute(function () { // IE11 hates this for some reason
      return performance.getEntriesByType('resource')
    })

    expect(resources).toEqual(expect.arrayContaining([
      expect.objectContaining({
        name: expect.stringContaining(beaconServerChangedUrl)
      })
    ]))

    const [supportabilityMetricsHarvests] = await Promise.all([
      supportabilityMetricsCapture.waitForResult({ timeout: 5000 }),
      browser.url(await browser.testHandle.assetURL('/'))
    ])

    expect(supportabilityMetricsHarvests).toEqual(expect.arrayContaining([
      expect.objectContaining({
        request: expect.objectContaining({
          body: expect.objectContaining({
            sm: expect.arrayContaining([
              { params: { name: 'Config/BeaconUrl/Changed' }, stats: { c: 1 } }
            ])
          })
        })
      })
    ]))
  })

  describe('ajax.block_internal -', () => {
    let ajaxEventsCapture

    /**
     * Loads a page whose agent harvests through the asset server's `/beacon` subpath (forwarded on to the bam server),
     * fires one ordinary same-host request, and returns the paths of every AjaxRequest event that was harvested.
     */
    async function loadAndGetAjaxEventPaths (ajaxInit) {
      const { host, port } = browser.testHandle.assetServerConfig
      const { port: bamPort } = browser.testHandle.bamServerConfig
      await browser.url(await browser.testHandle.assetURL('instrumented.html', {
        init: { proxy: { beacon: `${host}:${port}/beacon` }, ajax: ajaxInit },
        /*
         * The test servers share one hostname and differ only by port, but deny list matching ignores ports. With the default
         * info.beacon (the bam server's host), every request to the asset server would be denied, which would hide what this
         * spec checks. A different hostname for info.beacon leaves the proxy's `/beacon` subpath as the only thing denied here.
         * Harvests go through proxy.beacon, so info.beacon only feeds the deny list.
         */
        config: { beacon: `127.0.0.1:${bamPort}`, errorBeacon: `127.0.0.1:${bamPort}` },
        loader: 'full'
      }))
      await browser.waitForAgentLoad()

      await browser.execute(function () {
        fetch('/health')
      })

      const harvests = await ajaxEventsCapture.waitForResult({ totalCount: 1, timeout: 15000 })
      return harvests.flatMap(harvest => harvest.request.body).map(event => event.path)
    }

    beforeEach(async () => {
      ajaxEventsCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testAjaxEventsRequest })
    })

    it('does not report the agent\'s own harvests as AjaxRequest events when block_internal is true', async () => {
      const paths = await loadAndGetAjaxEventPaths({ block_internal: true })

      expect(paths).toContain('/health') // ordinary traffic on the same host is still captured
      expect(paths.filter(path => path.startsWith('/beacon'))).toEqual([])
    })

    it('reports the agent\'s own harvests as AjaxRequest events when block_internal is false', async () => {
      const paths = await loadAndGetAjaxEventPaths({ block_internal: false })

      expect(paths.filter(path => path.startsWith('/beacon')).length).toBeGreaterThan(0)
    })
  })
})
