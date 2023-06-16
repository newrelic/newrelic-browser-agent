import { reliableUnload, supportsFetch } from '../../tools/browser-matcher/common-matchers.mjs'

const loaderTypes = ['rum', 'full', 'spa']
const loaderTypesMapped = { rum: 'lite', full: 'pro', spa: 'spa' }

describe.withBrowsersMatching(reliableUnload)('metrics', () => {
  loaderTypes.forEach(lt => loaderTypeSupportabilityMetric(lt))

  it('should send SMs for endpoint bytes', async () => {
    await Promise.all([
      browser.testHandle.expectEvents(),
      browser.testHandle.expectResources(),
      browser.url(await browser.testHandle.assetURL('instrumented.html')) // Setup expects before loading the page
        .then(() => browser.waitForAgentLoad())
    ])

    await Promise.all([
      browser.testHandle.expectIns(),
      browser.testHandle.expectErrors(),
      browser.execute(function () {
        newrelic.noticeError(new Error('hippo hangry'))
        newrelic.addPageAction('DummyEvent', { free: 'tacos' })
      })
    ])

    const [unloadSupportMetricsResults] = await Promise.all([
      browser.testHandle.expectSupportMetrics(),
      await browser.url(await browser.testHandle.assetURL('/')) // Setup expects before navigating
    ])

    const supportabilityMetrics = unloadSupportMetricsResults.request.body.sm || []

    // Body bytes sent for each endpoint
    expect(supportabilityMetrics).toEqual(expect.arrayContaining([{
      params: { name: 'PageSession/Endpoint/1/BytesSent' },
      stats: { t: expect.toBeFinite() }
    }]))
    expect(supportabilityMetrics).toEqual(expect.arrayContaining([{
      params: { name: 'PageSession/Endpoint/Events/BytesSent' },
      stats: { t: expect.toBeFinite() }
    }]))
    expect(supportabilityMetrics).toEqual(expect.arrayContaining([{
      params: { name: 'PageSession/Endpoint/Resources/BytesSent' },
      stats: { t: expect.toBeFinite() }
    }]))
    expect(supportabilityMetrics).toEqual(expect.arrayContaining([{
      params: { name: 'PageSession/Endpoint/Jserrors/BytesSent' },
      stats: { t: expect.toBeFinite() }
    }]))
    expect(supportabilityMetrics).toEqual(expect.arrayContaining([{
      params: { name: 'PageSession/Endpoint/Ins/BytesSent' },
      stats: { t: expect.toBeFinite() }
    }]))

    // Query bytes sent for each endpoint
    expect(supportabilityMetrics).toEqual(expect.arrayContaining([{
      params: { name: 'PageSession/Endpoint/1/QueryBytesSent' },
      stats: { t: expect.toBeFinite() }
    }]))
    expect(supportabilityMetrics).toEqual(expect.arrayContaining([{
      params: { name: 'PageSession/Endpoint/Events/QueryBytesSent' },
      stats: { t: expect.toBeFinite() }
    }]))
    expect(supportabilityMetrics).toEqual(expect.arrayContaining([{
      params: { name: 'PageSession/Endpoint/Resources/QueryBytesSent' },
      stats: { t: expect.toBeFinite() }
    }]))
    expect(supportabilityMetrics).toEqual(expect.arrayContaining([{
      params: { name: 'PageSession/Endpoint/Jserrors/QueryBytesSent' },
      stats: { t: expect.toBeFinite() }
    }]))
    expect(supportabilityMetrics).toEqual(expect.arrayContaining([{
      params: { name: 'PageSession/Endpoint/Ins/QueryBytesSent' },
      stats: { t: expect.toBeFinite() }
    }]))
  })

  it('should send SMs for resources seen', async () => {
    await browser.url(await browser.testHandle.assetURL('resources.html'))
      .then(() => browser.waitForAgentLoad())

    const [unloadSupportMetricsResults] = await Promise.all([
      browser.testHandle.expectSupportMetrics(),
      await browser.url(await browser.testHandle.assetURL('/')) // Setup expects before navigating
    ])

    const supportabilityMetrics = unloadSupportMetricsResults.request.body.sm || []
    expect(supportabilityMetrics).toEqual(expect.arrayContaining([{
      params: { name: 'Generic/Resources/Non-Ajax/Internal' },
      stats: { c: expect.toBeWithin(1, Infinity) }
    }]))
    expect(supportabilityMetrics).toEqual(expect.arrayContaining([{
      params: { name: 'Generic/Resources/Non-Ajax/External' },
      stats: { c: expect.toBeWithin(1, Infinity) }
    }]))
    expect(supportabilityMetrics).toEqual(expect.arrayContaining([{
      params: { name: 'Generic/Resources/Ajax/Internal' },
      stats: { c: expect.toBeWithin(1, Infinity) }
    }]))
    expect(supportabilityMetrics).toEqual(expect.arrayContaining([{
      params: { name: 'Generic/Resources/Ajax/External' },
      stats: { c: expect.toBeWithin(1, Infinity) }
    }]))
  })

  it('should send CMs and SMs when calling agent api methods', async () => {
    await browser.url(await browser.testHandle.assetURL('api/customMetrics.html'))
      .then(() => browser.waitForAgentLoad())

    const [unloadMetricsResults] = await Promise.all([
      browser.testHandle.expectMetrics(),
      await browser.url(await browser.testHandle.assetURL('/')) // Setup expects before navigating
    ])

    const customMetrics = unloadMetricsResults.request.body.cm || []
    expect(customMetrics).toEqual(expect.arrayContaining([{
      params: { name: 'finished' },
      metrics: {
        count: expect.toBeWithin(1, Infinity),
        time: { t: expect.toBeWithin(1, Infinity) }
      }
    }]))

    const supportabilityMetrics = unloadMetricsResults.request.body.sm || []
    expect(supportabilityMetrics).toEqual(expect.arrayContaining([{
      params: { name: 'API/noticeError/called' },
      stats: { c: expect.toBeWithin(1, Infinity) }
    }]))
    expect(supportabilityMetrics).toEqual(expect.arrayContaining([{
      params: { name: 'API/setPageViewName/called' },
      stats: { c: expect.toBeWithin(1, Infinity) }
    }]))
    expect(supportabilityMetrics).toEqual(expect.arrayContaining([{
      params: { name: 'API/setCustomAttribute/called' },
      stats: { c: expect.toBeWithin(1, Infinity) }
    }]))
    expect(supportabilityMetrics).toEqual(expect.arrayContaining([{
      params: { name: 'API/setUserId/called' },
      stats: { c: expect.toBeWithin(1, Infinity) }
    }]))
    expect(supportabilityMetrics).toEqual(expect.arrayContaining([{
      params: { name: 'API/setErrorHandler/called' },
      stats: { c: expect.toBeWithin(1, Infinity) }
    }]))
    expect(supportabilityMetrics).toEqual(expect.arrayContaining([{
      params: { name: 'API/finished/called' },
      stats: { c: expect.toBeWithin(1, Infinity) }
    }]))
    expect(supportabilityMetrics).toEqual(expect.arrayContaining([{
      params: { name: 'API/addToTrace/called' },
      stats: { c: expect.toBeWithin(1, Infinity) }
    }]))
    expect(supportabilityMetrics).toEqual(expect.arrayContaining([{
      params: { name: 'API/addRelease/called' },
      stats: { c: expect.toBeWithin(1, Infinity) }
    }]))
    expect(supportabilityMetrics).toEqual(expect.arrayContaining([{
      params: { name: 'API/addRelease/called' },
      stats: { c: expect.toBeWithin(1, Infinity) }
    }]))
  })

  it('should create SMs for valid obfuscation rules', async () => {
    await browser.url(await browser.testHandle.assetURL('obfuscate-pii-valid.html'))
      .then(() => browser.waitForAgentLoad())

    const [unloadSupportMetricsResults] = await Promise.all([
      browser.testHandle.expectSupportMetrics(),
      await browser.url(await browser.testHandle.assetURL('/')) // Setup expects before navigating
    ])

    const supportabilityMetrics = unloadSupportMetricsResults.request.body.sm || []
    expect(supportabilityMetrics).toEqual(expect.arrayContaining([{
      params: { name: 'Generic/Obfuscate/Detected' },
      stats: { c: 1 }
    }]))
    expect(supportabilityMetrics).not.toEqual(expect.arrayContaining([{
      params: { name: 'Generic/Obfuscate/Invalid' },
      stats: { c: 1 }
    }]))
  })

  it('should create SMs for obfuscation rule containing invalid regex type', async () => {
    await browser.url(await browser.testHandle.assetURL('obfuscate-pii-invalid-regex-type.html'))
      .then(() => browser.waitForAgentLoad())

    const [unloadSupportMetricsResults] = await Promise.all([
      browser.testHandle.expectSupportMetrics(),
      await browser.url(await browser.testHandle.assetURL('/')) // Setup expects before navigating
    ])

    const supportabilityMetrics = unloadSupportMetricsResults.request.body.sm || []
    expect(supportabilityMetrics).toEqual(expect.arrayContaining([{
      params: { name: 'Generic/Obfuscate/Detected' },
      stats: { c: 1 }
    }]))
    expect(supportabilityMetrics).toEqual(expect.arrayContaining([{
      params: { name: 'Generic/Obfuscate/Invalid' },
      stats: { c: 1 }
    }]))
  })

  it('should create SMs for obfuscation rule containing undefined regex type', async () => {
    await browser.url(await browser.testHandle.assetURL('obfuscate-pii-invalid-regex-undefined.html'))
      .then(() => browser.waitForAgentLoad())

    const [unloadSupportMetricsResults] = await Promise.all([
      browser.testHandle.expectSupportMetrics(),
      await browser.url(await browser.testHandle.assetURL('/')) // Setup expects before navigating
    ])

    const supportabilityMetrics = unloadSupportMetricsResults.request.body.sm || []
    expect(supportabilityMetrics).toEqual(expect.arrayContaining([{
      params: { name: 'Generic/Obfuscate/Detected' },
      stats: { c: 1 }
    }]))
    expect(supportabilityMetrics).toEqual(expect.arrayContaining([{
      params: { name: 'Generic/Obfuscate/Invalid' },
      stats: { c: 1 }
    }]))
  })

  it('should create SMs for obfuscation rule containing invalid replacement type', async () => {
    await browser.url(await browser.testHandle.assetURL('obfuscate-pii-invalid-replacement-type.html'))
      .then(() => browser.waitForAgentLoad())

    const [unloadSupportMetricsResults] = await Promise.all([
      browser.testHandle.expectSupportMetrics(),
      await browser.url(await browser.testHandle.assetURL('/')) // Setup expects before navigating
    ])

    const supportabilityMetrics = unloadSupportMetricsResults.request.body.sm || []
    expect(supportabilityMetrics).toEqual(expect.arrayContaining([{
      params: { name: 'Generic/Obfuscate/Detected' },
      stats: { c: 1 }
    }]))
    expect(supportabilityMetrics).toEqual(expect.arrayContaining([{
      params: { name: 'Generic/Obfuscate/Invalid' },
      stats: { c: 1 }
    }]))
  })

  it('should send SMs for polyfilled native functions', async () => {
    await browser.url(await browser.testHandle.assetURL('polyfill-metrics.html'))
      .then(() => browser.waitForAgentLoad())

    const [unloadSupportMetricsResults] = await Promise.all([
      browser.testHandle.expectSupportMetrics(),
      await browser.url(await browser.testHandle.assetURL('/')) // Setup expects before navigating
    ])

    const supportabilityMetrics = unloadSupportMetricsResults.request.body.sm || []
    expect(supportabilityMetrics).toEqual(expect.arrayContaining([{
      params: { name: 'Polyfill/Function.bind/Detected' },
      stats: { c: 1 }
    }]))
    expect(supportabilityMetrics).toEqual(expect.arrayContaining([{
      params: { name: 'Polyfill/Function.call/Detected' },
      stats: { c: 1 }
    }]))
    expect(supportabilityMetrics).toEqual(expect.arrayContaining([{
      params: { name: 'Polyfill/Array.includes/Detected' },
      stats: { c: 1 }
    }]))
    expect(supportabilityMetrics).toEqual(expect.arrayContaining([{
      params: { name: 'Polyfill/Array.from/Detected' },
      stats: { c: 1 }
    }]))
    expect(supportabilityMetrics).toEqual(expect.arrayContaining([{
      params: { name: 'Polyfill/Array.find/Detected' },
      stats: { c: 1 }
    }]))
    expect(supportabilityMetrics).toEqual(expect.arrayContaining([{
      params: { name: 'Polyfill/Array.flat/Detected' },
      stats: { c: 1 }
    }]))
    expect(supportabilityMetrics).toEqual(expect.arrayContaining([{
      params: { name: 'Polyfill/Array.flatMap/Detected' },
      stats: { c: 1 }
    }]))
    expect(supportabilityMetrics).toEqual(expect.arrayContaining([{
      params: { name: 'Polyfill/Object.assign/Detected' },
      stats: { c: 1 }
    }]))
    expect(supportabilityMetrics).toEqual(expect.arrayContaining([{
      params: { name: 'Polyfill/Object.entries/Detected' },
      stats: { c: 1 }
    }]))
    expect(supportabilityMetrics).toEqual(expect.arrayContaining([{
      params: { name: 'Polyfill/Object.values/Detected' },
      stats: { c: 1 }
    }]))
    expect(supportabilityMetrics).toEqual(expect.arrayContaining([{
      params: { name: 'Polyfill/Map/Detected' },
      stats: { c: 1 }
    }]))
    expect(supportabilityMetrics).toEqual(expect.arrayContaining([{
      params: { name: 'Polyfill/Set/Detected' },
      stats: { c: 1 }
    }]))
    expect(supportabilityMetrics).toEqual(expect.arrayContaining([{
      params: { name: 'Polyfill/WeakMap/Detected' },
      stats: { c: 1 }
    }]))
    expect(supportabilityMetrics).toEqual(expect.arrayContaining([{
      params: { name: 'Polyfill/WeakSet/Detected' },
      stats: { c: 1 }
    }]))
  })

  it('should send SMs for session trace duration', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented.html'))
      .then(() => browser.waitForAgentLoad())

    const [unloadSupportMetricsResults] = await Promise.all([
      browser.testHandle.expectSupportMetrics(),
      await browser.url(await browser.testHandle.assetURL('/')) // Setup expects before navigating
    ])

    const supportabilityMetrics = unloadSupportMetricsResults.request.body.sm
    expect(supportabilityMetrics).toEqual(expect.arrayContaining([{
      params: { name: 'PageSession/Feature/SessionTrace/DurationMs' },
      stats: { t: expect.toBeWithin(1, Infinity) }
    }]))
  })

  it('should send SMs for custom data size', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented.html'))
      .then(() => browser.waitForAgentLoad())

    await browser.execute(function () {
      newrelic.setCustomAttribute('customParamKey', 0)
    })

    const [unloadSupportMetricsResults] = await Promise.all([
      browser.testHandle.expectSupportMetrics(),
      await browser.url(await browser.testHandle.assetURL('/')) // Setup expects before navigating
    ])

    const supportabilityMetrics = unloadSupportMetricsResults.request.body.sm
    expect(supportabilityMetrics).toEqual(expect.arrayContaining([{
      params: { name: 'PageSession/Feature/CustomData/Bytes' },
      stats: { t: expect.toBeWithin(1, Infinity) }
    }]))
  })
})

function loaderTypeSupportabilityMetric (loaderType) {
  it.withBrowsersMatching([reliableUnload, supportsFetch])(`generic agent info captured for ${loaderType} loader`, async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented.html', { loader: loaderType }))
      .then(() => browser.waitForAgentLoad())

    const [unloadSupportMetricsResults] = await Promise.all([
      browser.testHandle.expectSupportMetrics(),
      await browser.url(await browser.testHandle.assetURL('/')) // Setup expects before navigating
    ])

    const supportabilityMetrics = unloadSupportMetricsResults.request.body.sm
    expect(supportabilityMetrics).toEqual(expect.arrayContaining([{
      params: { name: expect.stringContaining('Generic/Version/') },
      stats: { c: 1 }
    }]))
    expect(supportabilityMetrics).toEqual(expect.arrayContaining([{
      params: { name: expect.stringContaining('Generic/DistMethod/') },
      stats: { c: 1 }
    }]))
    expect(supportabilityMetrics).toEqual(expect.arrayContaining([{
      params: { name: `Generic/LoaderType/${loaderTypesMapped[loaderType]}/Detected` },
      stats: { c: 1 }
    }]))
  })
}
