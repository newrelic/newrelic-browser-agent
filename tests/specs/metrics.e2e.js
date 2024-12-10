import { testCustomMetricsRequest, testSupportMetricsRequest } from '../../tools/testing-server/utils/expect-tests'

const loaderTypes = ['rum', 'full', 'spa']
const loaderTypesMapped = { rum: 'lite', full: 'pro', spa: 'spa' }

describe('metrics', () => {
  let supportabilityMetricsCapture

  beforeEach(async () => {
    supportabilityMetricsCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testSupportMetricsRequest })
  })

  loaderTypes.forEach(loaderType => {
    it(`generic agent info captured for ${loaderType} loader`, async () => {
      await browser.url(await browser.testHandle.assetURL('instrumented.html', { loader: loaderType }))
        .then(() => browser.waitForAgentLoad())

      const [supportabilityMetricsHarvests] = await Promise.all([
        supportabilityMetricsCapture.waitForResult({ totalCount: 1 }),
        await browser.url(await browser.testHandle.assetURL('/')) // Setup expects before navigating
      ])

      const supportabilityMetrics = supportabilityMetricsHarvests[0].request.body.sm
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
  })

  it('should send CMs and SMs when calling agent api methods', async () => {
    const customMetricsCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testCustomMetricsRequest })
    await browser.url(await browser.testHandle.assetURL('api/customMetrics.html'))
      .then(() => browser.waitForAgentLoad())

    const [supportabilityMetricsHarvests, customMetricsHarvests] = await Promise.all([
      supportabilityMetricsCapture.waitForResult({ totalCount: 1 }),
      customMetricsCapture.waitForResult({ totalCount: 1 }),
      await browser.url(await browser.testHandle.assetURL('/')) // Setup expects before navigating
    ])

    const customMetrics = customMetricsHarvests[0].request.body.cm || []
    expect(customMetrics).toEqual(expect.arrayContaining([{
      params: { name: 'finished' },
      metrics: {
        count: expect.toBeWithin(1, Infinity),
        time: { t: expect.toBeWithin(1, Infinity) }
      }
    }]))

    const supportabilityMetrics = supportabilityMetricsHarvests[0].request.body.sm
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

    const [supportabilityMetricsHarvests] = await Promise.all([
      supportabilityMetricsCapture.waitForResult({ totalCount: 1 }),
      await browser.url(await browser.testHandle.assetURL('/')) // Setup expects before navigating
    ])

    const supportabilityMetrics = supportabilityMetricsHarvests[0].request.body.sm
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

    const [supportabilityMetricsHarvests] = await Promise.all([
      supportabilityMetricsCapture.waitForResult({ totalCount: 1 }),
      await browser.url(await browser.testHandle.assetURL('/')) // Setup expects before navigating
    ])

    const supportabilityMetrics = supportabilityMetricsHarvests[0].request.body.sm
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

    const [supportabilityMetricsHarvests] = await Promise.all([
      supportabilityMetricsCapture.waitForResult({ totalCount: 1 }),
      await browser.url(await browser.testHandle.assetURL('/')) // Setup expects before navigating
    ])

    const supportabilityMetrics = supportabilityMetricsHarvests[0].request.body.sm
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

    const [supportabilityMetricsHarvests] = await Promise.all([
      supportabilityMetricsCapture.waitForResult({ totalCount: 1 }),
      await browser.url(await browser.testHandle.assetURL('/')) // Setup expects before navigating
    ])

    const supportabilityMetrics = supportabilityMetricsHarvests[0].request.body.sm
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
