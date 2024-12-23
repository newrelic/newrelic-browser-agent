import { srConfig, getSR } from '../util/helpers'
import { testErrorsRequest } from '../../../tools/testing-server/utils/expect-tests'

describe('Session Replay Sample Mode Validation', () => {
  afterEach(async () => {
    await browser.destroyAgentSession()
  })

  it('Full 1 Error 1 === FULL', async () => {
    await browser.enableSessionReplay(100, 100)
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig()))
      .then(() => browser.waitForSessionReplayRecording())

    await browser.pause(1000) // Give the agent time to update the session replay state
    await expect(getSR()).resolves.toMatchObject({
      recording: true,
      initialized: true,
      events: expect.any(Array),
      mode: 1
    })
  })

  it('Full 1 Error 0 === FULL', async () => {
    await browser.enableSessionReplay(100, 0)
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig()))
      .then(() => browser.waitForSessionReplayRecording())

    await browser.pause(1000) // Give the agent time to update the session replay state
    await expect(getSR()).resolves.toMatchObject({
      recording: true,
      initialized: true,
      events: expect.any(Array),
      mode: 1
    })
  })

  it('Full 0 Error 1 === ERROR', async () => {
    await browser.enableSessionReplay(0, 100)
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig()))
      .then(() => browser.waitForSessionReplayRecording())

    await browser.pause(1000) // Give the agent time to update the session replay state
    await expect(getSR()).resolves.toMatchObject({
      recording: true,
      initialized: true,
      events: expect.any(Array),
      mode: 2
    })
  })

  it('Full 0 Error 0 === OFF', async () => {
    await browser.enableSessionReplay(0, 0)
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig()))
      .then(() => browser.waitForFeatureAggregate('session_replay'))

    await browser.pause(1000) // Give the agent time to update the session replay state
    await expect(getSR()).resolves.toMatchObject({
      recording: false,
      initialized: true,
      events: [],
      mode: 0
    })
  })

  it('Full 0 Error 0 === OFF, then API called === FULL', async () => {
    await browser.enableSessionReplay(0, 0)
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig()))
      .then(() => browser.waitForFeatureAggregate('session_replay'))

    await browser.pause(1000) // Give the agent time to update the session replay state
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

    await browser.pause(1000) // Give the agent time to update the session replay state
    await expect(getSR()).resolves.toMatchObject({
      recording: true,
      initialized: true,
      events: expect.any(Array),
      mode: 1
    })
  })

  it('Full 0 Error 1 === ERROR, then API called === FULL', async () => {
    await browser.enableSessionReplay(0, 100)
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig()))
      .then(() => browser.waitForFeatureAggregate('session_replay')).then(() => browser.pause(1000))

    await browser.pause(1000) // Give the agent time to update the session replay state
    await expect(getSR()).resolves.toMatchObject({
      recording: true,
      initialized: true,
      events: expect.any(Array),
      mode: 2
    })

    await Promise.all([
      browser.execute(function () {
        newrelic.recordReplay()
      })
    ])

    await browser.pause(1000) // Give the agent time to update the session replay state
    await expect(getSR()).resolves.toMatchObject({
      recording: true,
      initialized: true,
      events: expect.any(Array),
      mode: 1
    })
  })

  it('ERROR (seen after init) => FULL', async () => {
    await browser.enableSessionReplay(0, 100)
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig()))
      .then(() => browser.waitForSessionReplayRecording())

    await browser.pause(1000) // Give the agent time to update the session replay state
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

    await browser.pause(1000) // Give the agent time to update the session replay state
    await expect(getSR()).resolves.toMatchObject({
      recording: true,
      initialized: true,
      events: expect.any(Array),
      mode: 1
    })
  })

  it('ERROR (seen before init) => ERROR', async () => {
    await browser.enableSessionReplay(0, 100)
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig()))
      .then(() => browser.waitForSessionReplayRecording())

    await expect(getSR()).resolves.toMatchObject({
      recording: true,
      initialized: true,
      events: expect.any(Array),
      mode: 2
    })
  })

  it('ERROR (seen before init) --> PRELOAD => (hasReplay)', async () => {
    const errorsCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testErrorsRequest })
    await browser.enableSessionReplay(0, 100)
    const [errorsHarvests] = await Promise.all([
      errorsCapture.waitForResult({ totalCount: 1 }),
      browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig({ session_replay: { preload: true } })))
        .then(() => browser.waitForPreloadRecorder())
        .then(() => browser.execute(function () {
          newrelic.noticeError(new Error('test'))
        }))
    ])

    expect(errorsHarvests[0].request.body.err[0].params.hasReplay).toEqual(true)
  })

  it('ERROR (seen before init) --> PRELOAD but ABORTS => (!hasReplay)', async () => {
    const errorsCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testErrorsRequest })
    await browser.enableSessionReplay(0, 100, 0)
    const [errorsHarvests] = await Promise.all([
      errorsCapture.waitForResult({ totalCount: 1 }),
      browser.url(await browser.testHandle.assetURL('rrweb-split-errors.html', srConfig({ session_replay: { preload: true } })))
        .then(() => browser.waitForAgentLoad())
    ])

    expect(errorsHarvests[0].request.body.err[0].params.hasReplay).toBeUndefined()
  })

  it('ERROR (seen before and after init) -- noticeError => FULL (split)', async () => {
    const errorsCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testErrorsRequest })
    await browser.enableSessionReplay(0, 100)
    let [errorsHarvests] = await Promise.all([
      errorsCapture.waitForResult({ totalCount: 1 }),
      browser.url(await browser.testHandle.assetURL('rrweb-split-errors.html', srConfig()))
        .then(() => browser.waitForSessionReplayRecording())
    ])

    expect(errorsHarvests[0].request.body.err[0].params.hasReplay).toBeUndefined()

    ;[errorsHarvests] = await Promise.all([
      errorsCapture.waitForResult({ timeout: 10000 }),
      browser.execute(function () {
        newrelic.noticeError(new Error('after load'))
      })
    ])

    expect(errorsHarvests[errorsHarvests.length - 1].request.body.err[0].params.hasReplay).toEqual(true)
  })

  it('ERROR (seen before and after init) -- thrown error => FULL (split)', async () => {
    const errorsCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testErrorsRequest })
    await browser.enableSessionReplay(0, 100)
    let [errorsHarvests] = await Promise.all([
      errorsCapture.waitForResult({ totalCount: 1 }),
      browser.url(await browser.testHandle.assetURL('rrweb-split-errors.html', srConfig()))
        .then(() => browser.waitForSessionReplayRecording())
    ])

    expect(errorsHarvests[0].request.body.err[0].params.hasReplay).toBeUndefined()

    ;[errorsHarvests] = await Promise.all([
      errorsCapture.waitForResult({ timeout: 10000 }),
      browser.execute(function () {
        var scr = document.createElement('script')
        scr.innerHTML = 'eval(\'1=2\')'
        document.body.appendChild(scr)
      })
    ])

    expect(errorsHarvests[errorsHarvests.length - 1].request.body.err[0].params.hasReplay).toEqual(true)
  })

  it('Duplicate errors before and after init are decorated with hasReplay and timestamps correctly - FULL', async () => {
    const errorsCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testErrorsRequest })
    const [[errors]] = await Promise.all([
      errorsCapture.waitForResult({ totalCount: 1 }),
      browser.url(await browser.testHandle.assetURL('rrweb-duplicate-errors-split.html', srConfig({ session_replay: { preload: false, sampling_rate: 100 } })))
        .then(() => browser.waitForSessionReplayRecording())
    ])

    /** should not have hr param on jserror payloads */
    expect(errors.request.query.hr).toEqual(undefined)
    const hasReplaySet = errors.request.body.err.find(x => x.params.hasReplay)
    const preReplaySet = errors.request.body.err.find(x => !x.params.hasReplay)
    /** pre-replay init data should not have the hasReplay flag */
    expect(preReplaySet.params.hasReplay).toEqual(undefined)
    /** pre-replay should contain an aggregated set instead of a single value */
    expect(preReplaySet.metrics.count).toBeGreaterThan(1)
    /** post-replay init data should have the hasReplay flag */
    expect(hasReplaySet.params.hasReplay).toEqual(true)
    /** pre-replay should contain an aggregated set instead of a single value */
    expect(hasReplaySet.metrics.count).toBeGreaterThan(1)
    /** pre-replay should have started before post-replay */
    expect(preReplaySet.params.timestamp).toBeLessThan(hasReplaySet.params.timestamp)
    /** pre-replay should have started before post-replay (metrics) */
    expect(preReplaySet.metrics.time.min).toBeLessThan(hasReplaySet.metrics.time.min)
    /** post-replay's start time should be after pre-replay's end time (metrics) */
    expect(hasReplaySet.metrics.time.min).toBeGreaterThan(preReplaySet.metrics.time.max)
    /** pre-replay and post-replay should have the same stack hash, but be agg'd and reported separately */
    expect(preReplaySet.params.stackHash).toEqual(hasReplaySet.params.stackHash)
  })

  it('Duplicate errors before and after init are decorated with hasReplay and timestamps correctly - ERROR', async () => {
    const errorsCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testErrorsRequest })
    const [[errors]] = await Promise.all([
      errorsCapture.waitForResult({ totalCount: 1 }),
      browser.url(await browser.testHandle.assetURL('rrweb-duplicate-errors-split.html', srConfig({ session_replay: { preload: false, sampling_rate: 0, error_sampling_rate: 100 } })))
        .then(() => browser.waitForSessionReplayRecording())
    ])

    /** should not have hr param on jserror payloads */
    expect(errors.request.query.hr).toEqual(undefined)
    const hasReplaySet = errors.request.body.err.find(x => x.params.hasReplay)
    const preReplaySet = errors.request.body.err.find(x => !x.params.hasReplay)
    /** pre-replay init data should not have the hasReplay flag */
    expect(preReplaySet.params.hasReplay).toEqual(undefined)
    /** pre-replay should contain an aggregated set instead of a single value */
    expect(preReplaySet.metrics.count).toBeGreaterThan(1)
    /** post-replay init data should have the hasReplay flag */
    expect(hasReplaySet.params.hasReplay).toEqual(true)
    /** pre-replay should contain an aggregated set instead of a single value */
    expect(hasReplaySet.metrics.count).toBeGreaterThan(1)
    /** pre-replay should have started before post-replay */
    expect(preReplaySet.params.timestamp).toBeLessThan(hasReplaySet.params.timestamp)
    /** pre-replay should have started before post-replay (metrics) */
    expect(preReplaySet.metrics.time.min).toBeLessThan(hasReplaySet.metrics.time.min)
    /** post-replay's start time should be after pre-replay's end time (metrics) */
    expect(hasReplaySet.metrics.time.min).toBeGreaterThan(preReplaySet.metrics.time.max)
    /** pre-replay and post-replay should have the same stack hash, but be agg'd and reported separately */
    expect(preReplaySet.params.stackHash).toEqual(hasReplaySet.params.stackHash)
  })

  it('FULL => OFF', async () => {
    await browser.enableSessionReplay(100, 0)
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig()))
      .then(() => browser.waitForSessionReplayRecording())

    await browser.pause(1000) // Give the agent time to update the session replay state
    await expect(getSR()).resolves.toMatchObject({
      recording: true,
      initialized: true,
      events: expect.any(Array),
      mode: 1
    })

    await browser.execute(function () {
      Object.values(NREUM.initializedAgents)[0].runtime.session.reset()
    })

    await browser.pause(1000) // Give the agent time to update the session replay state
    await expect(getSR()).resolves.toMatchObject({
      recording: false,
      initialized: true,
      events: expect.any(Array),
      mode: 0
    })
  })

  it('blocked => OFF => API does not restart', async () => {
    await browser.enableSessionReplay(100, 0)
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig()))
      .then(() => browser.waitForSessionReplayRecording())

    await browser.pause(1000) // Give the agent time to update the session replay state
    await expect(getSR()).resolves.toMatchObject({
      blocked: false,
      recording: true,
      initialized: true,
      events: expect.any(Array),
      mode: 1
    })

    await browser.execute(function () {
      Object.values(NREUM.initializedAgents)[0].runtime.session.reset()
    })

    await browser.pause(1000) // Give the agent time to update the session replay state
    await expect(getSR()).resolves.toMatchObject({
      blocked: true,
      recording: false,
      initialized: true,
      events: expect.any(Array),
      mode: 0
    })

    await browser.execute(function () {
      newrelic.noticeError(new Error('test'))
    })

    await browser.pause(1000) // Give the agent time to update the session replay state
    await expect(getSR()).resolves.toMatchObject({
      blocked: true,
      recording: false,
      initialized: true,
      events: expect.any(Array),
      mode: 0
    })
  })
})
