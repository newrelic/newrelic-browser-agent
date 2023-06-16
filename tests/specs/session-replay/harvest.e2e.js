
import { notIE } from '../../../tools/browser-matcher/common-matchers.mjs'
import { config, getSR } from './helpers'

describe.withBrowsersMatching(notIE)('Session Replay Harvest Behavior', () => {
  beforeEach(async () => {
    await browser.enableSessionReplay()
  })

  afterEach(async () => {
    await browser.destroyAgentSession()
  })

  it('Should harvest early if exceeds preferred size - mocked', async () => {
    const startTime = Date.now()

    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({ session_replay: { harvestTimeSeconds: 60 } })))
      .then(() => browser.waitForFeatureAggregate('session_replay'))

    const [{ request: blobHarvest }] = await Promise.all([
      browser.testHandle.expectBlob(10000),
      // preferred size = 64kb, compression estimation is 88%
      browser.execute(function () {
        Object.values(newrelic.initializedAgents)[0].features.session_replay.featAggregate.payloadBytesEstimation = 64000 / 0.12
        document.querySelector('body').click()
      })
    ])

    expect(blobHarvest.body.blob.length).toBeGreaterThan(0)
    expect(Date.now() - startTime).toBeLessThan(60000)
  })

  it('Should abort if exceeds maximum size - mocked', async () => {
    const startTime = Date.now()

    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({ session_replay: { harvestTimeSeconds: 60 } })))
      .then(() => browser.waitForFeatureAggregate('session_replay'))

    await browser.execute(function () {
      Object.values(newrelic.initializedAgents)[0].features.session_replay.featAggregate.payloadBytesEstimation = 1000001 / 0.12
      document.querySelector('body').click()
    })

    await expect(getSR()).resolves.toEqual(expect.objectContaining({
      blocked: true,
      initialized: true
    }))
    expect(Date.now() - startTime).toBeLessThan(60000)
  })

  it('Should harvest early if exceeds preferred size - real', async () => {
    const startTime = Date.now()

    const [{ request: blobHarvest }] = await Promise.all([
      browser.testHandle.expectBlob(),
      browser.url(await browser.testHandle.assetURL('64kb-dom.html', config()))
        .then(() => browser.waitForAgentLoad())
    ])

    expect(blobHarvest.body.blob.length).toBeGreaterThan(0)
    expect(Date.now() - startTime).toBeLessThan(60000)
  })

  it('Should abort if exceeds maximum size - real', async () => {
    const startTime = Date.now()

    await browser.url(await browser.testHandle.assetURL('1mb-dom.html', config({ harvestTimeSeconds: 60 })))
      .then(() => browser.waitForFeatureAggregate('session_replay'))

    await expect(getSR()).resolves.toEqual(expect.objectContaining({
      blocked: true,
      initialized: true
    }))
    expect(Date.now() - startTime).toBeLessThan(60000)
  })
})
