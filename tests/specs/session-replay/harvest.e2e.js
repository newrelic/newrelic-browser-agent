import { testRumRequest } from '../../../tools/testing-server/utils/expect-tests'
import { config, getSR } from './helpers'

describe('Session Replay Harvest Behavior', () => {
  beforeEach(async () => {
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify({
        stn: 1,
        err: 1,
        ins: 1,
        cap: 1,
        spa: 1,
        loaded: 1,
        sr: 1
      })
    })
  })

  afterEach(async () => {
    await browser.destroyAgentSession()
  })

  it('Should harvest early if exceeds preferred size - mocked', async () => {
    const startTime = Date.now()
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({ harvestTimeSeconds: 60 })))
    await browser.waitForAgentLoad()
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
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({ harvestTimeSeconds: 60 })))
      .then(() => browser.waitForAgentLoad())

    await browser.execute(function () {
      Object.values(newrelic.initializedAgents)[0].features.session_replay.featAggregate.payloadBytesEstimation = 1000001 / 0.12
      document.querySelector('body').click()
    })

    expect((await getSR())).toEqual(expect.objectContaining({
      blocked: true,
      initialized: true
    }))
    expect(Date.now() - startTime).toBeLessThan(60000)
  })

  it('Should harvest early if exceeds preferred size - real', async () => {
    const startTime = Date.now()

    const [{ request: blobHarvest }] = await Promise.all([
      browser.testHandle.expectBlob(),
      browser.url(await browser.testHandle.assetURL('64kb-dom.html', config())),
      browser.waitForAgentLoad()
    ])

    expect(blobHarvest.body.blob.length).toBeGreaterThan(0)
    expect(Date.now() - startTime).toBeLessThan(60000)
  })

  it('Should abort if exceeds maximum size - real', async () => {
    const startTime = Date.now()
    await browser.url(await browser.testHandle.assetURL('1mb-dom.html', config({ harvestTimeSeconds: 60 })))
      .then(() => browser.waitForAgentLoad())

    expect((await getSR())).toEqual(expect.objectContaining({
      blocked: true,
      initialized: true
    }))
    expect(Date.now() - startTime).toBeLessThan(60000)
  })
})
