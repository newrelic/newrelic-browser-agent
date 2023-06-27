import { testRumRequest } from '../../../tools/testing-server/utils/expect-tests'
import { config, MODE } from '../session-replay/helpers'

[
  ['session tracking is disabled', false],
  ['session tracking enabled but replay entitlement is 0', true]
].forEach(([run, trackingOn]) => {
  describe(`Trace behavior when ${run}`, () => {
    let stPayloadReceived, getUrlString
    beforeEach(() => {
      stPayloadReceived = undefined
      browser.testHandle.expectResources().then(() => stPayloadReceived = true)
      getUrlString = browser.testHandle.assetURL('stn/instrumented.html', {
        init: {
          privacy: { cookies_enabled: trackingOn }
        }
      })
    })

    it('does not run if stn flag is 0', async () => {
      await browser.testHandle.scheduleReply('bamServer', {
        test: testRumRequest,
        body: JSON.stringify({
          stn: 0,
          err: 1,
          ins: 1,
          spa: 1,
          sr: 0,
          loaded: 1
        })
      })

      await getUrlString.then(builtUrl => browser.url(builtUrl)).then(() => browser.waitForAgentLoad()).then(() => {
        expect(stPayloadReceived).toBeUndefined() // trace payload should've been received by now after page has loaded
      })
    })

    it('does run (standalone behavior) if stn flag is 1', async () => {
      // The default rum response will include stn = 1 and sr = 0.

      await getUrlString.then(builtUrl => browser.url(builtUrl)).then(() => browser.waitForAgentLoad()).then(async () => {
        const getTraceMode = browser.execute(function () { // expect Trace to be running by itself
          return Object.values(newrelic.initializedAgents)[0].features.session_trace.featAggregate.isStandalone
        })
        expect(stPayloadReceived).toBeTruthy()
        await expect(getTraceMode).resolves.toBeTruthy()
      })
    })
  })
})

describe('Trace behavior when session tracking enabled and replay entitlement is 1', () => {
  const rumFlags = {
    stn: 1,
    err: 1,
    ins: 1,
    spa: 1,
    sr: 1,
    loaded: 1
  }
  // let getUrlString
  let initSTReceived
  beforeEach(async () => {
    await browser.destroyAgentSession()
    initSTReceived = undefined
    browser.testHandle.expectResources().then(resPayload => initSTReceived = resPayload)
    // getUrlString = browser.testHandle.assetURL('stn/instrumented.html', config({
    //   session_trace: { harvestTimeSeconds: 5 }
    // }))
  })
  afterEach(async () => {
    await browser.testHandle.clearScheduledReplies('bamServer')
  })

  it('still runs when replay feature is missing', async () => {
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      permanent: true,
      body: JSON.stringify(rumFlags)
    })

    const urlWithoutReplay = await browser.testHandle.assetURL('stn/instrumented.html', { init: { privacy: { cookies_enabled: true } } })
    const getTraceInfo = () => browser.execute(function () {
      return [
        Object.values(newrelic.initializedAgents)[0].features.session_trace.featAggregate.isStandalone,
        Object.values(newrelic.initializedAgents)[0].runtime.session.state.sessionTraceMode
      ]
    })

    await browser.url(urlWithoutReplay).then(() => browser.waitForAgentLoad()).then(async () => {
      expect(initSTReceived).toBeTruthy() // that is, trace should still fully run when the replay feature isn't around
      await expect(getTraceInfo()).resolves.toEqual([true, MODE.FULL])

      return Promise.all([browser.testHandle.expectResources(3000), browser.refresh().then(() => browser.waitForAgentLoad())])
    }).then(async ([secondInitST]) => {
      // On subsequent page load or refresh, trace should maintain the set mode, standalone, and same sessionid but have a new ptid corresponding to new page visit.
      expect(secondInitST.request.query.s).toEqual(initSTReceived.request.query.s)
      expect(secondInitST.request.query.ptid).not.toEqual(initSTReceived.request.query.ptid)
      await expect(getTraceInfo()).resolves.toEqual([true, MODE.FULL]) // note it's expected & assumed that the replay mode is OFF
    })
  })

  it('still runs when replay feature is present but disabled', async () => {
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      permanent: true,
      body: JSON.stringify(rumFlags)
    })

    const urlWithoutReplay = await browser.testHandle.assetURL('stn/instrumented.html', config({ session_replay: { sampleRate: 0, errorSampleRate: 0 } }))
    const getTraceInfo = () => browser.execute(function () {
      const agent = Object.values(newrelic.initializedAgents)[0]
      return [
        agent.features.session_trace.featAggregate.isStandalone,
        agent.runtime.session.state.sessionTraceMode,
        agent.features.session_replay.featAggregate?.initialized // expect replay to be fully imported and intialized, but in OFF mode per config above, via isStandalone = true
      ]
    })

    await browser.url(urlWithoutReplay).then(() => browser.waitForAgentLoad()).then(async () => {
      expect(initSTReceived).toBeTruthy() // that is, trace should still fully run when the replay feature isn't around
      await expect(getTraceInfo()).resolves.toEqual([true, MODE.FULL, true])

      return Promise.all([browser.testHandle.expectResources(3000), browser.refresh().then(() => browser.waitForAgentLoad())])
    }).then(async ([secondInitST]) => {
      // On subsequent page load or refresh, trace should maintain the set mode, standalone, and same sessionid but have a new ptid corresponding to new page visit.
      expect(secondInitST.request.query.s).toEqual(initSTReceived.request.query.s)
      expect(secondInitST.request.query.ptid).not.toEqual(initSTReceived.request.query.ptid)
      await expect(getTraceInfo()).resolves.toEqual([true, MODE.FULL, null]) // session_replay.featAggregate will be null as it's OFF and not imported on subsequent pages
    })
  })
})
