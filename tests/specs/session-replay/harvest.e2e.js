import { notIE, notIOS } from '../../../tools/browser-matcher/common-matchers.mjs'
import { config, decodeAttributes, getSR } from './helpers'

describe.withBrowsersMatching(notIE)('Session Replay Harvest Behavior', () => {
  beforeEach(async () => {
    await browser.enableSessionReplay()
  })

  afterEach(async () => {
    await browser.destroyAgentSession()
  })

  // Reals size based harvest tests below have trouble loading/working on iOS

  it.withBrowsersMatching(notIOS)('Should harvest early if exceeds preferred size', async () => {
    const start = Date.now()
    const [{ request: blobHarvest }] = await Promise.all([
      browser.testHandle.expectBlob(),
      browser.url(await browser.testHandle.assetURL('64kb-dom.html', config({ session_replay: { harvestTimeSeconds: 60 } })))
        .then(() => browser.waitForSessionReplayRecording())
    ])

    const end = Date.now()

    expect(blobHarvest.body.length).toBeGreaterThan(0)
    expect(end - start).toBeLessThan(60000)
  })

  it.withBrowsersMatching(notIOS)('Should abort if exceeds maximum size', async () => {
    await browser.url(await browser.testHandle.assetURL('1mb-dom.html', config({ session_replay: { harvestTimeSeconds: 60 } })))
      .then(() => browser.waitForSessionReplayBlocked())

    await browser.testHandle.expectBlob(10000, true) // should not get harvest

    await expect(getSR()).resolves.toEqual(expect.objectContaining({
      blocked: true,
      initialized: true
    }))
  })

  it.withBrowsersMatching(notIOS)('Should set timestamps on each payload', async () => {
    const [{ request: blobHarvest }, { request: blobHarvest2 }] = await Promise.all([
      browser.testHandle.expectBlob(),
      browser.testHandle.expectBlob(),
      browser.url(await browser.testHandle.assetURL('64kb-dom.html', config({ session_replay: { harvestTimeSeconds: 5 } })))
    ])

    expect(blobHarvest.body.length).toBeGreaterThan(0)
    const attr1 = decodeAttributes(blobHarvest.query.attributes)
    expect(attr1['replay.firstTimestamp']).toBeGreaterThan(0)
    expect(attr1['replay.lastTimestamp']).toBeGreaterThan(0)
    expect(attr1['replay.firstTimestamp']).toEqual(blobHarvest.body[0].timestamp)
    expect(attr1['replay.lastTimestamp']).toEqual(blobHarvest.body[blobHarvest.body.length - 1].timestamp)
    expect(attr1['session.durationMs']).toBeGreaterThan(0)

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
