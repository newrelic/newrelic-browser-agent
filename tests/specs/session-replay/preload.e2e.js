import { srConfig, testExpectedReplay } from '../util/helpers'
import { testBlobReplayRequest } from '../../../tools/testing-server/utils/expect-tests'

describe('Session Replay Preload', () => {
  let sessionReplaysCapture

  beforeEach(async () => {
    sessionReplaysCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testBlobReplayRequest })
    await browser.enableSessionReplay()
  })

  afterEach(async () => {
    await browser.destroyAgentSession()
  })

  it('should preload the recorder when a session recording is already in progress', async () => {
    let [sessionReplayHarvests, wasPreloaded] = await Promise.all([
      sessionReplaysCapture.waitForResult({ totalCount: 1 }),
      browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig({ session_replay: { preload: false } })))
        .then(() => browser.waitForAgentLoad())
        .then(() => browser.execute(function () {
          return window.wasPreloaded
        }))
    ])

    expect(wasPreloaded).toEqual(false)
    testExpectedReplay({ data: sessionReplayHarvests[0].request, hasSnapshot: true, hasMeta: true })

    ;[, wasPreloaded] = await Promise.all([
      sessionReplaysCapture.waitForResult({ timeout: 10000 }),
      browser.refresh()
        .then(() => browser.waitForAgentLoad())
        .then(() => browser.execute(function () {
          return window.wasPreloaded
        }))
    ])

    expect(wasPreloaded).toEqual(true)
  })

  it('should preload the recorder when preload is configured', async () => {
    const [sessionReplayHarvests, wasPreloaded] = await Promise.all([
      sessionReplaysCapture.waitForResult({ totalCount: 1 }),
      browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig({ session_replay: { preload: true } })))
        .then(() => browser.waitForAgentLoad())
        .then(() => browser.execute(function () {
          return window.wasPreloaded
        }))
    ])

    expect(wasPreloaded).toEqual(true)
    testExpectedReplay({ data: sessionReplayHarvests[0].request, hasSnapshot: true, hasMeta: true })
  })

  it('should not preload if not configured and not recording', async () => {
    const [sessionReplayHarvests, wasPreloaded] = await Promise.all([
      sessionReplaysCapture.waitForResult({ totalCount: 1 }),
      browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig({ session_replay: { preload: false } })))
        .then(() => browser.waitForAgentLoad())
        .then(() => browser.execute(function () {
          return window.wasPreloaded
        }))
    ])

    expect(wasPreloaded).toEqual(false)
    testExpectedReplay({ data: sessionReplayHarvests[0].request, hasSnapshot: true, hasMeta: true })
  })

  it('should not harvest beginning preload data if not sampled', async () => {
    await browser.enableSessionReplay(0, 0)
    const [sessionReplayHarvests, wasPreloaded] = await Promise.all([
      sessionReplaysCapture.waitForResult({ timeout: 10000 }),
      browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig({ session_replay: { preload: true } })))
        .then(() => browser.waitForAgentLoad())
        .then(() => browser.execute(function () {
          return window.wasPreloaded
        }))
    ])

    expect(sessionReplayHarvests.length).toEqual(0)
    expect(wasPreloaded).toEqual(true)
  })

  it('should start harvesting when start API called before the recorder import completes', async () => {
    const [sessionReplayHarvests, wasPreloaded] = await Promise.all([
      sessionReplaysCapture.waitForResult({ totalCount: 1 }),
      browser.url(await browser.testHandle.assetURL('session_replay/64kb-dom-manual-start.html', srConfig({ session_replay: { preload: true, autoStart: false } })))
        .then(() => browser.waitForAgentLoad())
        .then(() => browser.execute(function () {
          return window.wasPreloaded // window var set at load time which checks the SR recorder's buffer to see if populated before load
        }))
    ])

    expect(sessionReplayHarvests.length).toEqual(1)
    expect(wasPreloaded).toEqual(true)
  })
})
