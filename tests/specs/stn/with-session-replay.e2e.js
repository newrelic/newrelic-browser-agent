/*
 * The top half of this file tests for previous standalone Trace feature behavior in the absence of replay flag from RUM or feature in agent build.
 * The bottom half tests the truth table defined in docs related to NR-137369 around how trace behaves in the prescence of replay feature.
 */

import { testRumRequest } from '../../../tools/testing-server/utils/expect-tests'
import { config, MODE } from '../session-replay/helpers'
import { notIE } from '../../../tools/browser-matcher/common-matchers.mjs'

describe.withBrowsersMatching(notIE)('stn with session replay', () => {
  [
    ['session tracking is disabled', false],
    ['session tracking enabled but replay entitlement is 0', true]
  ].forEach(([run, trackingOn]) => {
    describe(`Trace behavior when ${run}`, () => {
      let getUrlString
      beforeEach(() => {
        getUrlString = browser.testHandle.assetURL('stn/instrumented.html', { init: { privacy: { cookies_enabled: trackingOn } } })
      })

      it('does not run if stn flag is 0', async () => {
        await browser.testHandle.scheduleReply('bamServer', {
          test: testRumRequest,
          body: JSON.stringify({ stn: 0, err: 1, ins: 1, spa: 1, sr: 0, loaded: 1 })
        })

        await Promise.all([
          browser.url(await getUrlString).then(() => browser.waitForAgentLoad()),
          browser.testHandle.expectResources(10000, true)
        ])
      })

      it('does run (standalone behavior) if stn flag is 1', async () => {
        // The default rum response will include stn = 1 and sr = 0.
        await Promise.all([
          browser.url(await getUrlString).then(() => browser.waitForAgentLoad()),
          browser.testHandle.expectResources()
        ])

        const traceMode = await browser.execute(function () { // expect Trace to be running by itself
          return Object.values(newrelic.initializedAgents)[0].features.session_trace.featAggregate.isStandalone
        })
        expect(traceMode).toBeTruthy()
      })
    })
  })

  describe('Trace when replay entitlement is 1 and stn is 1', () => {
    beforeEach(async () => {
      await browser.destroyAgentSession()
      await browser.testHandle.scheduleReply('bamServer', {
        test: testRumRequest,
        permanent: true, // note this is set since the tests in this block also tests subsequent load behavior
        body: JSON.stringify({ stn: 1, err: 1, ins: 1, spa: 1, sr: 1, loaded: 1 })
      })
    })
    afterEach(async () => {
      await browser.testHandle.clearScheduledReplies('bamServer')
    })
    async function navigateToRootDir () {
      await browser.url(await browser.testHandle.assetURL('/'))
      try { // IE does not like this command, though the rest of the test below still works
        await browser.waitUntil(() => browser.execute(function () { return document.readyState === 'complete' }), { timeout: 5000 })
      } catch (e) {}
    }
    async function loadPageAndGetResource (assetUrlArgs, timeout) {
      const url = await browser.testHandle.assetURL(...assetUrlArgs)
      const getSTPayload = browser.testHandle.expectResources(timeout)
      await browser.url(url)
      await browser.waitForAgentLoad()
      return await getSTPayload
    }

    it('still runs when replay feature is missing or disabled', async () => {
      const getTraceValues = () => browser.execute(function () {
        const agent = Object.values(newrelic.initializedAgents)[0]
        return [
          agent.features.session_trace.featAggregate.isStandalone,
          agent.runtime.session.state.sessionTraceMode,
          agent.runtime.ptid
        ]
      })

      const initSTReceived = await loadPageAndGetResource(['stn/instrumented.html', { init: { privacy: { cookies_enabled: true }, session_replay: { enabled: false } } }], 3001)
      const firstPageAgentVals = await getTraceValues()
      expect(initSTReceived).toBeTruthy() // that is, trace should still fully run when the replay feature isn't around
      expect(initSTReceived.request.query.ptid).not.toBeUndefined() // trace has ptid on first initial harvest
      expect(firstPageAgentVals).toEqual([true, MODE.FULL, expect.any(String)])

      await navigateToRootDir()

      // For some reason, macOS Safari (up to 16.1) would fail if we navigated back to 'urlWithoutReplay' so we go to a diff asset page instead:
      const secondInitST = await loadPageAndGetResource(['instrumented.html', { init: { privacy: { cookies_enabled: true }, session_replay: { enabled: false } } }], 3002)
      const secondPageAgentVals = await getTraceValues()
      // On subsequent page load or refresh, trace should maintain the set mode, standalone, and same sessionid but have a new ptid corresponding to new page visit.
      expect(secondInitST.request.query.s).toEqual(initSTReceived.request.query.s)
      expect(secondInitST.request.query.ptid).not.toBeUndefined()
      expect(secondPageAgentVals).toEqual([true, MODE.FULL, expect.any(String)]) // note it's expected & assumed that the replay mode is OFF

      expect(secondPageAgentVals[2]).not.toEqual(firstPageAgentVals[2]) // ptids
    })

    ;[
      ['OFF', { sampling_rate: 0, error_sampling_rate: 0 }],
      ['FULL', { sampling_rate: 100, error_sampling_rate: 0 }],
      ['ERR', { sampling_rate: 0, error_sampling_rate: 100 }]
    ].forEach(([replayMode, replayConfig]) => {
      it.withBrowsersMatching(notIE)(`runs in full when replay feature is present and in ${replayMode} mode`, async () => {
        const getRuntimeValues = () => browser.execute(function () {
          const agent = Object.values(newrelic.initializedAgents)[0]
          return [
            agent.features.session_trace.featAggregate.isStandalone,
            agent.runtime.session.state.sessionTraceMode,
            agent.features.session_replay.featAggregate?.initialized // expect replay to be fully imported and intialized, but in OFF mode per config above, via isStandalone = true
          ]
        })

        const initSTReceived = await loadPageAndGetResource(['stn/instrumented.html', config({ session_replay: replayConfig })], 3003)
        const firstPageAgentVals = await getRuntimeValues()
        expect(initSTReceived).toBeTruthy()
        expect(initSTReceived.request.query.ptid).not.toBeUndefined()
        if (replayMode === 'OFF') {
          expect(firstPageAgentVals).toEqual([true, MODE.FULL, true])
          expect(Number(initSTReceived.request.query.hr)).toEqual(0)
        } else {
          expect(firstPageAgentVals).toEqual([false, MODE.FULL, true]) // when replay is running, trace is no longer op in standalone mode
          if (replayMode === 'FULL') expect(Number(initSTReceived.request.query.hr)).toEqual(1)
        }

        await navigateToRootDir()

        // For some reason, macOS Safari (up to 16.1) would fail if we navigated back to 'urlWithoutReplay' so we go to a diff asset page instead:
        const secondInitST = await loadPageAndGetResource(['instrumented.html', config({ session_replay: replayConfig })], 3004)
        const secondPageAgentVals = await getRuntimeValues()
        // On subsequent page load or refresh, trace should maintain FULL mode and session id.
        expect(secondInitST.request.query.s).toEqual(initSTReceived.request.query.s)
        expect(secondInitST.request.query.ptid).not.toBeUndefined() // this validates we're actually getting the 2nd page's initial res, not 1st page's unload res
        if (replayMode === 'OFF') {
          expect(secondPageAgentVals).toEqual([true, MODE.FULL, null]) // session_replay.featAggregate will be null as it's OFF and not imported on subsequent pages
          expect(Number(secondInitST.request.query.hr)).toEqual(0)
        } else {
          expect(secondPageAgentVals).toEqual([false, MODE.FULL, true])
          if (replayMode === 'FULL') expect(Number(secondInitST.request.query.hr)).toEqual(1)
        }
      })
    })
  })

  describe.withBrowsersMatching(notIE)('Trace when replay entitlement is 1 and stn is 0', () => {
    let initSTReceived
    beforeEach(async () => {
      await browser.destroyAgentSession()
      await browser.testHandle.scheduleReply('bamServer', {
        test: testRumRequest,
        permanent: true,
        body: JSON.stringify({ stn: 0, err: 1, ins: 1, spa: 1, sr: 1, loaded: 1 })
      })

      initSTReceived = undefined
      browser.testHandle.expectResources().then(resPayload => { initSTReceived = resPayload })
    })

    it('does not run when replay is OFF', async () => {
      await browser.url(await browser.testHandle.assetURL('stn/instrumented.html', config({ session_replay: { sampling_rate: 0, error_sampling_rate: 0 } })))
      await browser.waitForAgentLoad()
      expect(initSTReceived).toBeUndefined()
    })

    it('does run when replay is OFF but API is called', async () => {
      await browser.url(await browser.testHandle.assetURL('stn/instrumented.html', config({ session_replay: { sampling_rate: 0, error_sampling_rate: 0 } })))
      await browser.waitForAgentLoad()
      expect(initSTReceived).toBeUndefined()

      const [realSTPayload] = await Promise.all([
        browser.testHandle.expectResources(),
        browser.execute(function () {
          newrelic.recordReplay()
        })
      ])

      expect(realSTPayload).toEqual(expect.any(Object))
    })

    ;[
      ['FULL', { sampling_rate: 100, error_sampling_rate: 0 }],
      ['ERR', { sampling_rate: 0, error_sampling_rate: 100 }]
    ].forEach(([replayMode, replayConfig]) => {
      it(`still runs and in the same ${replayMode} mode as replay feature that's on`, async () => {
        const urlReplayOn = await browser.testHandle.assetURL('stn/instrumented.html', config({ session_replay: replayConfig, session_trace: { harvestTimeSeconds: 2 } }))
        const getAssumedValues = () => browser.execute(function () {
          const agent = Object.values(newrelic.initializedAgents)[0]
          return [
            agent.features.session_trace.featAggregate.isStandalone,
            agent.runtime.session.state.sessionTraceMode
          ]
        })

        await browser.url(urlReplayOn)
        await browser.waitForAgentLoad()
        if (replayMode === 'FULL') {
          await expect(getAssumedValues()).resolves.toEqual([false, MODE.FULL])
          expect(initSTReceived).toBeTruthy()

          // When not in standalone, trace bypasses the old rate limiting of only harvesting on 30+ nodes. In practice, we should get few-secs-span harvests without that threshold.
          const second = await browser.testHandle.expectResources(3000).then(payload => payload.request.body.res.length) // 2nd harvest is usually riddled with a bunch of startup resource nodes
          const third = await browser.testHandle.expectResources(3000).then(payload => payload.request.body.res.length)
          expect([second, third].some(length => length < 30)).toBeTruthy()
        } else if (replayMode === 'ERR') {
          await expect(getAssumedValues()).resolves.toEqual([false, MODE.ERROR])
          expect(initSTReceived).toBeUndefined() // trace in error mode is not expected to send anything on startup
        }

        await browser.refresh().then(() => browser.waitForAgentLoad())
        await expect(getAssumedValues()).resolves.toEqual([false, replayMode === 'FULL' ? MODE.FULL : MODE.ERROR]) // page loads of existing session should use same trace mode even if stn = 0
      })
    })
  })

  it('should not trigger session trace when an error is seen and session replay mode is off', async () => {
    const urlReplayOff = await browser.testHandle.assetURL('js-error-with-error-before-page-load.html', config({
      privacy: { cookies_enabled: true },
      session_replay: { enabled: true },
      session_trace: { enabled: true, harvestTimeSeconds: 2 }
    }))
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      permanent: true, // note this is set since the tests in this block also tests subsequent load behavior
      body: JSON.stringify({ stn: 0, err: 1, ins: 1, spa: 1, sr: 0, loaded: 1 })
    })

    const [sessionTraceRequest] = await Promise.all([
      browser.testHandle.expectResources(10000, true),
      browser.url(urlReplayOff)
        .then(() => browser.waitForAgentLoad())
    ])
    const { localStorage: sessionState } = await browser.getAgentSessionInfo()

    expect(sessionTraceRequest).toBeUndefined()
    expect(sessionState).toEqual(expect.objectContaining({
      sessionReplayMode: 0,
      sessionTraceMode: 0,
      traceHarvestStarted: false,
      sessionReplaySentFirstChunk: false
    }))
  })
})
