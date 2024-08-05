import { supportsFetch } from '../../tools/browser-matcher/common-matchers.mjs'

const loaderTypes = ['rum', 'full', 'spa']
const loaderTypesMapped = { rum: 'lite', full: 'pro', spa: 'spa' }

describe('metrics', () => {
  loaderTypes.forEach(lt => loaderTypeSupportabilityMetric(lt))

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
})

function loaderTypeSupportabilityMetric (loaderType) {
  it.withBrowsersMatching(supportsFetch)(`generic agent info captured for ${loaderType} loader`, async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented.html', { loader: loaderType }))
      .then(() => browser.waitForAgentLoad())

    const [unloadSupportMetricsResults] = await Promise.all([
      browser.testHandle.expectSupportMetrics(),
      await browser.url(await browser.testHandle.assetURL('/')) // Setup expects before navigating
    ])

    const supportabilityMetrics = unloadSupportMetricsResults.request.body.sm
    expect(supportabilityMetrics).toEqual(expect.arrayContaining([{
      params: { name: expect.stringContaining('Generic/DistMethod/') },
      stats: { c: 1 }
    }]))
    expect(supportabilityMetrics).toEqual(expect.arrayContaining([{
      params: { name: `Generic/LoaderType/${loaderTypesMapped[loaderType]}/Detected` },
      stats: { c: 1 }
    }]))
    expect(supportabilityMetrics).toEqual(expect.arrayContaining([{
      params: { name: 'Generic/Runtime/Browser/Detected' },
      stats: { c: 1 }
    }]))
  })
}
