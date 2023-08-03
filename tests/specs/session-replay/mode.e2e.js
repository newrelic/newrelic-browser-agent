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
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({ session_replay: { sampleRate: 1, errorSampleRate: 1 } })))
      .then(() => browser.waitForSessionReplayRecording())

    await expect(getSR()).resolves.toEqual(expect.objectContaining({
      recording: true,
      initialized: true,
      events: expect.any(Array),
      mode: 1
    }))
  })

  it('Full 1 Error 0 === FULL', async () => {
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({ session_replay: { sampleRate: 1, errorSampleRate: 0 } })))
      .then(() => browser.waitForSessionReplayRecording())

    await expect(getSR()).resolves.toEqual(expect.objectContaining({
      recording: true,
      initialized: true,
      events: expect.any(Array),
      mode: 1
    }))
  })

  it('Full 0 Error 1 === ERROR', async () => {
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({ session_replay: { sampleRate: 0, errorSampleRate: 1 } })))
      .then(() => browser.waitForSessionReplayRecording())

    await expect(getSR()).resolves.toEqual(expect.objectContaining({
      recording: true,
      initialized: true,
      events: expect.any(Array),
      mode: 2
    }))
  })

  it('Full 0 Error 0 === OFF', async () => {
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({ session_replay: { sampleRate: 0, errorSampleRate: 0 } })))
      .then(() => browser.waitForFeatureAggregate('session_replay'))

    await expect(getSR()).resolves.toEqual(expect.objectContaining({
      recording: false,
      initialized: true,
      events: [],
      mode: 0
    }))
  })

  it('ERROR (seen after init) => FULL', async () => {
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({ session_replay: { sampleRate: 0, errorSampleRate: 1 } })))
      .then(() => browser.waitForSessionReplayRecording())

    await expect(getSR()).resolves.toEqual(expect.objectContaining({
      recording: true,
      initialized: true,
      events: expect.any(Array),
      mode: 2
    }))

    await browser.execute(function () {
      newrelic.noticeError(new Error('test'))
    })

    await expect(getSR()).resolves.toEqual(expect.objectContaining({
      recording: true,
      initialized: true,
      events: expect.any(Array),
      mode: 1
    }))
  })

  it('ERROR (seen before init) => FULL', async () => {
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({ session_replay: { sampleRate: 0, errorSampleRate: 1 } })))
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
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({ session_replay: { sampleRate: 1, errorSampleRate: 0 } })))
      .then(() => browser.waitForSessionReplayRecording())

    await expect(getSR()).resolves.toEqual(expect.objectContaining({
      recording: true,
      initialized: true,
      events: expect.any(Array),
      mode: 1
    }))

    await browser.execute(function () {
      Object.values(NREUM.initializedAgents)[0].runtime.session.reset()
    })

    await expect(getSR()).resolves.toEqual(expect.objectContaining({
      recording: false,
      initialized: true,
      events: expect.any(Array),
      mode: 0
    }))
  })
})
