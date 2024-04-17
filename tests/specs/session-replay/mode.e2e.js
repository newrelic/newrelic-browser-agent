import { notIE } from '../../../tools/browser-matcher/common-matchers.mjs'
import { config, getSR } from './helpers'

describe.withBrowsersMatching(notIE)('Session Replay Sample Mode Validation', () => {
  beforeEach(async () => {
    await browser.enableSessionReplay()
  })

  afterEach(async () => {
    await browser.destroyAgentSession()
  })

  it('Full 1 Error 1 === FULL', async () => {
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({ session_replay: { sampling_rate: 100, error_sampling_rate: 100 } })))
      .then(() => browser.waitForSessionReplayRecording())

    await expect(getSR()).resolves.toMatchObject({
      recording: true,
      initialized: true,
      events: expect.any(Array),
      mode: 1
    })
  })

  it('Full 1 Error 0 === FULL', async () => {
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({ session_replay: { sampling_rate: 100, error_sampling_rate: 0 } })))
      .then(() => browser.waitForSessionReplayRecording())

    await expect(getSR()).resolves.toMatchObject({
      recording: true,
      initialized: true,
      events: expect.any(Array),
      mode: 1
    })
  })

  it('Full 0 Error 1 === ERROR', async () => {
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({ session_replay: { sampling_rate: 0, error_sampling_rate: 100 } })))
      .then(() => browser.waitForSessionReplayRecording())
    let sr = await getSR()
    expect(sr.recording).toEqual(true)
    expect(sr.initialized).toEqual(true)
    expect(sr.events).toEqual(expect.any(Array))
    expect(sr.mode).toEqual(2)
  })

  it('Full 0 Error 0 === OFF', async () => {
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({ session_replay: { sampling_rate: 0, error_sampling_rate: 0 } })))
      .then(() => browser.waitForFeatureAggregate('session_replay'))

    await expect(getSR()).resolves.toMatchObject({
      recording: false,
      initialized: true,
      events: [],
      mode: 0
    })
  })

  it('Full 0 Error 0 === OFF, then API called === FULL', async () => {
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({ session_replay: { sampling_rate: 0, error_sampling_rate: 0 } })))
      .then(() => browser.waitForFeatureAggregate('session_replay'))

    await expect(getSR()).resolves.toMatchObject({
      recording: false,
      initialized: true,
      events: [],
      mode: 0
    })

    await Promise.all([
      browser.execute(function () {
        newrelic.recordReplay()
      }),
      browser.pause(1000)
    ])

    await expect(getSR()).resolves.toMatchObject({
      recording: true,
      initialized: true,
      events: expect.any(Array),
      mode: 1
    })
  })

  it('Full 0 Error 1 === ERROR, then API called === FULL', async () => {
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({ session_replay: { sampling_rate: 0, error_sampling_rate: 100 } })))
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

  it('Record API called before page load can trigger replay', async () => {
    await browser.url(await browser.testHandle.assetURL('rrweb-api-record-before-load.html', config({ session_replay: { sampling_rate: 0, error_sampling_rate: 0 } })))
      .then(() => browser.waitForFeatureAggregate('session_replay'))

    await browser.pause(1000)
    await expect(getSR()).resolves.toMatchObject({
      initialized: true,
      mode: 1
    })
  })

  it('Pause API called before page load has no effect', async () => {
    await browser.url(await browser.testHandle.assetURL('rrweb-api-pause-before-load.html', config({ session_replay: { sampling_rate: 100, error_sampling_rate: 0 } })))
      .then(() => browser.waitForSessionReplayRecording())

    await expect(getSR()).resolves.toMatchObject({
      recording: true,
      initialized: true,
      events: expect.any(Array),
      mode: 1
    })
  })

  it('ERROR (seen after init) => FULL', async () => {
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({ session_replay: { sampling_rate: 0, error_sampling_rate: 100 } })))
      .then(() => browser.waitForSessionReplayRecording())

    await expect(getSR()).resolves.toMatchObject({
      recording: true,
      initialized: true,
      events: expect.any(Array),
      mode: 2
    })

    await Promise.all([
      browser.execute(function () {
        newrelic.noticeError(new Error('test'))
      }), browser.pause(1000)
    ])

    await expect(getSR()).resolves.toMatchObject({
      recording: true,
      initialized: true,
      events: expect.any(Array),
      mode: 1
    })
  })

  it('ERROR (seen before init) => ERROR', async () => {
    await browser.url(await browser.testHandle.assetURL('rrweb-split-errors.html', config({ session_replay: { preload: false, sampling_rate: 0, error_sampling_rate: 100 } })))
      .then(() => browser.waitForSessionReplayRecording('session_replay'))

    await expect(getSR()).resolves.toMatchObject({
      recording: true,
      initialized: true,
      events: expect.any(Array),
      mode: 2
    })
  })

  it('ERROR (seen before init) --> PRELOAD => (hasReplay)', async () => {
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({ session_replay: { preload: true, sampling_rate: 0, error_sampling_rate: 100 } })))
      .then(() => browser.waitForPreloadRecorder())
      .then(() => browser.execute(function () {
        newrelic.noticeError(new Error('test'))
      }))
    const { request: { body: err1 } } = await browser.testHandle.expectErrors()
    const beforeLoad = err1.err[0]
    expect(beforeLoad.params.hasReplay).toEqual(true)
  })

  it('ERROR (seen before init) --> PRELOAD but ABORTS => (!hasReplay)', async () => {
    await browser.testHandle.clearScheduledReplies('bamServer')
    await browser.url(await browser.testHandle.assetURL('rrweb-split-errors.html', config({ session_replay: { preload: true, sampling_rate: 0, error_sampling_rate: 100 } })))
      .then(() => browser.waitForAgentLoad())
    const { request: { body: err1 } } = await browser.testHandle.expectErrors()
    const beforeLoad = err1.err[0]
    expect(beforeLoad.params.hasReplay).toBeUndefined()
  })

  it('ERROR (seen before and after init) -- noticeError => FULL (split)', async () => {
    await browser.url(await browser.testHandle.assetURL('rrweb-split-errors.html', config({ session_replay: { sampling_rate: 0, error_sampling_rate: 100 } })))
      .then(() => browser.waitForSessionReplayRecording())

    const { request: { body: err1 } } = await browser.testHandle.expectErrors()

    const beforeLoad = err1.err[0]
    expect(beforeLoad.params.hasReplay).toBeUndefined()

    const [{ request: { body: err2 } }] = await Promise.all([
      browser.testHandle.expectErrors(),
      browser.execute(function () {
        newrelic.noticeError(new Error('after load'))
      })
    ])

    const afterLoad = err2.err[0]
    expect(afterLoad.params.hasReplay).toEqual(true)
  })

  it('ERROR (seen before and after init) -- thrown error => FULL (split)', async () => {
    await browser.url(await browser.testHandle.assetURL('rrweb-split-errors.html', config({ session_replay: { sampling_rate: 0, error_sampling_rate: 100 } })))
      .then(() => browser.waitForSessionReplayRecording())

    const { request: { body: err1 } } = await browser.testHandle.expectErrors()

    const beforeLoad = err1.err[0]
    expect(beforeLoad.params.hasReplay).toBeUndefined()

    const [{ request: { body: err2 } }] = await Promise.all([
      browser.testHandle.expectErrors(),
      browser.execute(function () {
        var scr = document.createElement('script')
        scr.innerHTML = 'eval(\'1=2\')'
        document.body.appendChild(scr)
      })
    ])

    const afterLoad = err2.err[0]
    expect(afterLoad.params.hasReplay).toEqual(true)
  })

  it('Duplicate errors before and after init are decorated with hasReplay and timestamps correctly - FULL', async () => {
    await browser.url(await browser.testHandle.assetURL('rrweb-duplicate-errors-split.html', config({ session_replay: { preload: false, sampling_rate: 100 }, jserrors: { harvestTimeSeconds: 10 } })))
      .then(() => browser.waitForSessionReplayRecording('session_replay'))

    const errors = await browser.testHandle.expectErrors()
    const errAggSet1 = errors.request.body.err[0]
    const errAggSet2 = errors.request.body.err[1]
    expect(errAggSet1.params.hasReplay).toEqual(undefined)
    expect(errAggSet1.metrics.count).toBeGreaterThan(1)
    expect(errAggSet2.params.hasReplay).toEqual(true)
    expect(errAggSet2.metrics.count).toBeGreaterThan(1)
    expect(errAggSet1.params.timestamp).toBeLessThan(errAggSet2.params.timestamp)
    expect(errAggSet1.metrics.time.min).toBeLessThan(errAggSet2.metrics.time.min)
    expect(errAggSet2.metrics.time.min).toBeGreaterThan(errAggSet1.metrics.time.max)
    expect(errAggSet1.params.stackHash).toEqual(errAggSet2.params.stackHash)
  })

  it('Duplicate errors before and after init are decorated with hasReplay and timestamps correctly - ERROR', async () => {
    await browser.url(await browser.testHandle.assetURL('rrweb-duplicate-errors-split.html', config({ session_replay: { preload: false, sampling_rate: 0, error_sampling_rate: 100 }, jserrors: { harvestTimeSeconds: 10 } })))
      .then(() => browser.waitForSessionReplayRecording('session_replay'))

    const errors = await browser.testHandle.expectErrors()
    const errAggSet1 = errors.request.body.err[0]
    const errAggSet2 = errors.request.body.err[1]
    expect(errAggSet1.params.hasReplay).toEqual(undefined)
    expect(errAggSet1.metrics.count).toBeGreaterThan(1)
    expect(errAggSet2.params.hasReplay).toEqual(true)
    expect(errAggSet2.metrics.count).toBeGreaterThan(1)
    expect(errAggSet1.params.timestamp).toBeLessThan(errAggSet2.params.timestamp)
    expect(errAggSet1.metrics.time.min).toBeLessThan(errAggSet2.metrics.time.min)
    expect(errAggSet2.metrics.time.min).toBeGreaterThan(errAggSet1.metrics.time.max)
    expect(errAggSet1.params.stackHash).toEqual(errAggSet2.params.stackHash)
  })

  it('FULL => OFF', async () => {
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({ session_replay: { sampling_rate: 100, error_sampling_rate: 0 } })))
      .then(() => browser.waitForSessionReplayRecording())

    await expect(getSR()).resolves.toMatchObject({
      recording: true,
      initialized: true,
      events: expect.any(Array),
      mode: 1
    })

    await Promise.all([
      browser.execute(function () {
        Object.values(NREUM.initializedAgents)[0].runtime.session.reset()
      }), browser.pause(1000)
    ])

    await expect(getSR()).resolves.toMatchObject({
      recording: false,
      initialized: true,
      events: expect.any(Array),
      mode: 0
    })
  })

  it('blocked => OFF => API does not restart', async () => {
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({ session_replay: { sampling_rate: 100, error_sampling_rate: 0 } })))
      .then(() => browser.waitForSessionReplayRecording())

    await expect(getSR()).resolves.toMatchObject({
      blocked: false,
      recording: true,
      initialized: true,
      events: expect.any(Array),
      mode: 1
    })

    await Promise.all([
      browser.execute(function () {
        Object.values(NREUM.initializedAgents)[0].runtime.session.reset()
      }), browser.pause(1000)
    ])

    await expect(getSR()).resolves.toMatchObject({
      blocked: true,
      recording: false,
      initialized: true,
      events: expect.any(Array),
      mode: 0
    })

    await Promise.all([
      browser.execute(function () {
        newrelic.noticeError(new Error('test'))
      }), browser.pause(1000)
    ])

    await expect(getSR()).resolves.toMatchObject({
      blocked: true,
      recording: false,
      initialized: true,
      events: expect.any(Array),
      mode: 0
    })
  })
})
