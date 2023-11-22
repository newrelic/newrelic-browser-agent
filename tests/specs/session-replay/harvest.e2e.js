import { notIE, notIOS } from '../../../tools/browser-matcher/common-matchers.mjs'
import { srConfig, decodeAttributes, getSR } from './helpers'

describe.withBrowsersMatching(notIE)('Session Replay Harvest Behavior', () => {
  beforeEach(async () => {
    await browser.enableSessionReplay()
  })

  afterEach(async () => {
    await browser.destroyAgentSession()
  })

  it('Should harvest early if exceeds preferred size - mocked', async () => {
    const startTime = Date.now()

    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig({ session_replay: { harvestTimeSeconds: 60 } })))
      .then(() => browser.waitForSessionReplayRecording())

    const [{ request: blobHarvest }] = await Promise.all([
      browser.testHandle.expectReplay(10000),
      // preferred size = 64kb, compression estimation is 88%
      browser.execute(function () {
        Object.values(newrelic.initializedAgents)[0].features.session_replay.featAggregate.payloadBytesEstimation = 64000 / 0.12
        document.querySelector('body').click()
      })
    ])

    expect(blobHarvest.body.length).toBeGreaterThan(0)
    expect(Date.now() - startTime).toBeLessThan(60000)
  })

  it('Should abort if exceeds maximum size - mocked', async () => {
    const startTime = Date.now()

    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig({ session_replay: { harvestTimeSeconds: 60 } })))
      .then(() => browser.waitForSessionReplayRecording())

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

  // Reals size based harvest tests below have trouble loading/working on iOS

  it.withBrowsersMatching(notIOS)('Should harvest early if exceeds preferred size - real', async () => {
    const [{ request: blobHarvest }] = await Promise.all([
      browser.testHandle.expectReplay(),
      browser.url(await browser.testHandle.assetURL('64kb-dom.html', srConfig({ session_replay: { harvestTimeSeconds: 60 } })))
        .then(() => browser.waitForSessionReplayRecording())
    ])

    expect(blobHarvest.body.length).toBeGreaterThan(0)
  })

  it.withBrowsersMatching(notIOS)('Should abort if exceeds maximum size - real', async () => {
    await browser.url(await browser.testHandle.assetURL('1mb-dom.html', srConfig({ session_replay: { harvestTimeSeconds: 60 } })))
      .then(() => browser.waitForSessionReplayRecording())

    await expect(getSR()).resolves.toEqual(expect.objectContaining({
      blocked: true,
      initialized: true
    }))
  })

  it.withBrowsersMatching(notIOS)('Should set timestamps on each payload', async () => {
    const [{ request: blobHarvest }] = await Promise.all([
      browser.testHandle.expectReplay(),
      browser.url(await browser.testHandle.assetURL('64kb-dom.html', srConfig({ session_replay: { harvestTimeSeconds: 5 } })))
    ])

    expect(blobHarvest.body.length).toBeGreaterThan(0)
    const attr1 = decodeAttributes(blobHarvest.query.attributes)
    expect(attr1['replay.firstTimestamp']).toBeGreaterThan(0)
    expect(attr1['replay.lastTimestamp']).toBeGreaterThan(0)
    expect(attr1['replay.firstTimestamp']).toEqual(blobHarvest.body[0].timestamp)
    expect(attr1['replay.lastTimestamp']).toEqual(blobHarvest.body[blobHarvest.body.length - 1].timestamp)
    expect(attr1['session.durationMs']).toBeGreaterThan(0)

    const { request: blobHarvest2 } = await browser.testHandle.expectReplay()
    expect(blobHarvest2.body.length).toBeGreaterThan(0)
    const attr2 = decodeAttributes(blobHarvest2.query.attributes)
    expect(attr2['replay.firstTimestamp']).toBeGreaterThan(0)
    expect(attr2['replay.lastTimestamp']).toBeGreaterThan(0)
    expect(attr2['replay.firstTimestamp']).toEqual(blobHarvest2.body[0].timestamp)
    expect(attr2['replay.lastTimestamp']).toEqual(blobHarvest2.body[blobHarvest2.body.length - 1].timestamp)
    expect(attr2['session.durationMs']).toBeGreaterThan(0)

    expect(attr1['replay.firstTimestamp']).not.toEqual(attr2['replay.firstTimestamp'])
    expect(attr1['replay.lastTimestamp']).not.toEqual(attr2['replay.lastTimestamp'])
  })
})
