import { testBlobReplayRequest } from '../../../tools/testing-server/utils/expect-tests'
import { srConfig, getSR } from '../util/helpers'

describe('Replay API', () => {
  let sessionReplaysCapture
  beforeEach(async () => {
    sessionReplaysCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testBlobReplayRequest })
  })
  afterEach(async () => {
    await browser.destroyAgentSession()
  })

  it('recordReplay called before page load starts a replay', async () => {
    await browser.enableSessionReplay(0, 0)
    const [sessionReplayHarvests] = await Promise.all([
      sessionReplaysCapture.waitForResult({ totalCount: 1 }),
      browser.url(await browser.testHandle.assetURL('rrweb-api-record-before-load.html', srConfig()))
        .then(() => browser.waitForFeatureAggregate('session_replay'))
    ])

    await browser.pause(1000)
    await expect(getSR()).resolves.toMatchObject({
      initialized: true,
      mode: 1
    })
    expect(sessionReplayHarvests.length).toBeGreaterThanOrEqual(1)
  })

  it('recordReplay called after page load starts a replay', async () => {
    await browser.enableSessionReplay(0, 0)

    browser.url(await browser.testHandle.assetURL('rrweb-api-record-no-call.html', srConfig()))
      .then(() => browser.waitForFeatureAggregate('session_replay'))

    await browser.pause(5000)

    await expect(getSR()).resolves.toMatchObject({
      initialized: true,
      mode: 0
    })

    const [sessionReplayHarvests] = await Promise.all([
      sessionReplaysCapture.waitForResult({ totalCount: 1 }),
      browser.execute(function () {
        newrelic.recordReplay()
      })
    ])

    await browser.pause(1000)
    await expect(getSR()).resolves.toMatchObject({
      initialized: true,
      mode: 1
    })
    expect(sessionReplayHarvests.length).toBeGreaterThanOrEqual(1)
  })

  it('pauseReplay called before page load stops the replay', async () => {
    await browser.enableSessionReplay(100, 0)
    const [sessionReplayHarvests] = await Promise.all([
      sessionReplaysCapture.waitForResult({ timeout: 10000 }),
      browser.url(await browser.testHandle.assetURL('rrweb-api-pause-before-load.html', srConfig()))
        .then(() => browser.waitForFeatureAggregate('session_replay'))
    ])

    await browser.pause(1000) // give time for the features to drain fully
    await expect(getSR()).resolves.toMatchObject({
      recording: false,
      initialized: true,
      events: expect.any(Array),
      mode: 0
    })
    expect(sessionReplayHarvests).toHaveLength(0)
  })

  it('Paused replays can be restarted on next page load of same session', async () => {
    const url = await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig())
    await browser.url(url).then(() => browser.waitForAgentLoad())
    let replayState = await getSR()
    expect(replayState.mode).toEqual(1)

    await browser.execute(function () {
      newrelic.pauseReplay()
    })
    replayState = await getSR()
    expect(replayState.mode).toEqual(0)

    await browser.refresh().then(() => browser.waitForFeatureAggregate('session_replay')) // paused (OFF) mode should be saved to session and next page starts with OFF
    replayState = await getSR()
    expect(replayState.mode).toEqual(0)

    await browser.execute(function () {
      newrelic.recordReplay()
    }).then(() => browser.pause(500))
    replayState = await getSR() // record should be able to restart replay on this same session on a hard page load
    expect(replayState.mode).toEqual(1)
    const sessionReplayHarvests = await sessionReplaysCapture.waitForResult({ totalCount: 1 })
    expect(sessionReplayHarvests.length).toBeGreaterThanOrEqual(1)
  })
})
