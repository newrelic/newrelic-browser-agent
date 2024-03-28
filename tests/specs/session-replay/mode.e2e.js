import { notIE } from '../../../tools/browser-matcher/common-matchers.mjs'
import { srConfig, getSR } from '../util/helpers'

describe.withBrowsersMatching(notIE)('Session Replay Sample Mode Validation', () => {
  afterEach(async () => {
    await browser.destroyAgentSession()
  })

  it('Full 1 Error 1 === FULL', async () => {
    await browser.enableSessionReplay(100, 100)
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig()))
      .then(() => browser.waitForSessionReplayRecording())

    await expect(getSR()).resolves.toEqual(expect.objectContaining({
      recording: true,
      initialized: true,
      events: expect.any(Array),
      mode: 1
    }))
  })

  it('Full 1 Error 0 === FULL', async () => {
    await browser.enableSessionReplay(100, 0)
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig()))
      .then(() => browser.waitForSessionReplayRecording())

    await expect(getSR()).resolves.toEqual(expect.objectContaining({
      recording: true,
      initialized: true,
      events: expect.any(Array),
      mode: 1
    }))
  })

  it('Full 0 Error 1 === ERROR', async () => {
    await browser.enableSessionReplay(0, 100)
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig()))
      .then(() => browser.waitForSessionReplayRecording())
    let sr = await getSR()
    expect(sr.recording).toEqual(true)
    expect(sr.initialized).toEqual(true)
    expect(sr.events).toEqual(expect.any(Array))
    expect(sr.mode).toEqual(2)
  })

  it('Full 0 Error 0 === OFF', async () => {
    await browser.enableSessionReplay(0, 0)
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig()))
      .then(() => browser.waitForFeatureAggregate('session_replay'))

    await expect(getSR()).resolves.toEqual(expect.objectContaining({
      recording: false,
      initialized: true,
      events: [],
      mode: 0
    }))
  })

  it('Full 0 Error 0 === OFF, then API called === FULL', async () => {
    await browser.enableSessionReplay(0, 0)
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig()))
      .then(() => browser.waitForFeatureAggregate('session_replay'))

    await expect(getSR()).resolves.toEqual(expect.objectContaining({
      recording: false,
      initialized: true,
      events: [],
      mode: 0
    }))

    await Promise.all([
      browser.execute(function () {
        newrelic.recordReplay()
      }),
      browser.pause(1000)
    ])

    await expect(getSR()).resolves.toEqual(expect.objectContaining({
      recording: true,
      initialized: true,
      events: expect.any(Array),
      mode: 1
    }))
  })

  it('Full 0 Error 1 === ERROR, then API called === FULL', async () => {
    await browser.enableSessionReplay(0, 100)
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig()))
      .then(() => browser.waitForFeatureAggregate('session_replay')).then(() => browser.pause(1000))

    let sr = await getSR()
    expect(sr.recording).toEqual(true)
    expect(sr.initialized).toEqual(true)
    expect(sr.mode).toEqual(2)

    await Promise.all([
      browser.execute(function () {
        newrelic.recordReplay()
      })
    ])

    await browser.pause(1000)

    sr = await getSR()
    expect(sr.recording).toEqual(true)
    expect(sr.initialized).toEqual(true)
    expect(sr.mode).toEqual(1)
  })

  it('Record API called before page load does not start a replay (no entitlements yet)', async () => {
    await browser.enableSessionReplay(0, 0)
    await browser.url(await browser.testHandle.assetURL('rrweb-api-record-before-load.html', srConfig()))
      .then(() => browser.waitForFeatureAggregate('session_replay'))

    await browser.pause(1000)
    await expect(getSR()).resolves.toMatchObject({
      initialized: true,
      mode: 1
    })
  })

  it('Pause API called before page load has no effect', async () => {
    await browser.enableSessionReplay(100, 0)
    await browser.url(await browser.testHandle.assetURL('rrweb-api-pause-before-load.html', srConfig()))
      .then(() => browser.waitForSessionReplayRecording())

    await expect(getSR()).resolves.toEqual(expect.objectContaining({
      recording: true,
      initialized: true,
      events: expect.any(Array),
      mode: 1
    }))
  })

  it('ERROR (seen after init) => FULL', async () => {
    await browser.enableSessionReplay(0, 100)
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig()))
      .then(() => browser.waitForSessionReplayRecording())

    await expect(getSR()).resolves.toEqual(expect.objectContaining({
      recording: true,
      initialized: true,
      events: expect.any(Array),
      mode: 2
    }))

    await Promise.all([
      browser.execute(function () {
        newrelic.noticeError(new Error('test'))
      }), browser.pause(1000)
    ])

    await expect(getSR()).resolves.toEqual(expect.objectContaining({
      recording: true,
      initialized: true,
      events: expect.any(Array),
      mode: 1
    }))
  })

  it('ERROR (seen before init) => FULL', async () => {
    await browser.enableSessionReplay(0, 100)
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig()))
      .then(() => browser.execute(function () {
        newrelic.noticeError(new Error('test'))
      }))
      .then(() => browser.waitForSessionReplayRecording())

    await expect(getSR()).resolves.toEqual(expect.objectContaining({
      recording: true,
      initialized: true,
      events: expect.any(Array),
      mode: 1
    }))
  })

  it('FULL => OFF', async () => {
    await browser.enableSessionReplay(100, 0)
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig()))
      .then(() => browser.waitForSessionReplayRecording())

    await expect(getSR()).resolves.toEqual(expect.objectContaining({
      recording: true,
      initialized: true,
      events: expect.any(Array),
      mode: 1
    }))

    await Promise.all([
      browser.execute(function () {
        Object.values(NREUM.initializedAgents)[0].runtime.session.reset()
      }), browser.pause(1000)
    ])

    await expect(getSR()).resolves.toEqual(expect.objectContaining({
      recording: false,
      initialized: true,
      events: expect.any(Array),
      mode: 0
    }))
  })

  it('blocked => OFF => API does not restart', async () => {
    await browser.enableSessionReplay(100, 0)
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig()))
      .then(() => browser.waitForSessionReplayRecording())

    await expect(getSR()).resolves.toEqual(expect.objectContaining({
      blocked: false,
      recording: true,
      initialized: true,
      events: expect.any(Array),
      mode: 1
    }))

    await Promise.all([
      browser.execute(function () {
        Object.values(NREUM.initializedAgents)[0].runtime.session.reset()
      }), browser.pause(1000)
    ])

    await expect(getSR()).resolves.toEqual(expect.objectContaining({
      blocked: true,
      recording: false,
      initialized: true,
      events: expect.any(Array),
      mode: 0
    }))

    await Promise.all([
      browser.execute(function () {
        newrelic.noticeError(new Error('test'))
      }), browser.pause(1000)
    ])

    await expect(getSR()).resolves.toEqual(expect.objectContaining({
      blocked: true,
      recording: false,
      initialized: true,
      events: expect.any(Array),
      mode: 0
    }))
  })
})
