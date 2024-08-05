import { srConfig, getSR } from '../util/helpers'

describe('Replay API', () => {
  afterEach(async () => {
    await browser.destroyAgentSession()
  })

  it('recordReplay called before page load does not start a replay (no entitlements yet)', async () => {
    await browser.enableSessionReplay(0, 0)
    await browser.url(await browser.testHandle.assetURL('rrweb-api-record-before-load.html', srConfig()))
      .then(() => browser.waitForFeatureAggregate('session_replay'))

    await browser.pause(1000)
    await expect(getSR()).resolves.toMatchObject({
      initialized: true,
      mode: 1
    })
  })

  it('pauseReplay called before page load stops the replay', async () => {
    await browser.enableSessionReplay(100, 0)
    await browser.url(await browser.testHandle.assetURL('rrweb-api-pause-before-load.html', srConfig()))
      .then(() => browser.waitForSessionReplayRecording())

    await expect(getSR()).resolves.toMatchObject({
      recording: true,
      initialized: true,
      events: expect.any(Array),
      mode: 0
    })
  })

  it('Paused replays can be restarted on next page load of same session', async () => {
    const url = await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig())
    await browser.url(url).then(() => browser.waitForSessionReplayRecording())
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
  })
})
