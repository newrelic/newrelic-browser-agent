describe('Using proxy servers -', () => {
  it('setting an assets url changes where agent fetches its chunks from', async () => {
    const { host, port } = browser.testHandle.assetServerConfig
    const assetServerChangedUrl = `http://${host}:${port}/assets`
    const url = await browser.testHandle.assetURL('instrumented.html', { init: { proxy: { assets: assetServerChangedUrl } } })

    const [rumResults] = await Promise.all([
      browser.testHandle.expectRum(),
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

    const [unloadSupportMetricsResults] = await Promise.all([
      browser.testHandle.expectSupportMetrics(),
      browser.url(await browser.testHandle.assetURL('/'))
    ])

    expect(unloadSupportMetricsResults.request.body.sm).toEqual(expect.arrayContaining([
      { params: { name: 'Config/AssetsUrl/Changed' }, stats: { c: 1 } }
    ]))
  })

  it('setting a beacon url changes RUM call destination', async () => {
    const { host, port } = browser.testHandle.assetServerConfig
    const beaconServerChangedUrl = `${host}:${port}/beacon`
    const url = await browser.testHandle.assetURL('instrumented.html', { init: { proxy: { beacon: beaconServerChangedUrl } } })

    const [rumResults] = await Promise.all([
      browser.testHandle.expectRum(),
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

    const [unloadSupportMetricsResults] = await Promise.all([
      browser.testHandle.expectSupportMetrics(),
      browser.url(await browser.testHandle.assetURL('/'))
    ])

    expect(unloadSupportMetricsResults.request.body.sm).toEqual(expect.arrayContaining([
      { params: { name: 'Config/BeaconUrl/Changed' }, stats: { c: 1 } }
    ]))
  })
})
