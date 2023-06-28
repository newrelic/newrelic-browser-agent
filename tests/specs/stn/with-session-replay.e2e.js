/*
 * The top half of this file tests for previous standalone Trace feature behavior in the absence of replay flag from RUM or feature in agent build.
 * The bottom half tests the truth table defined in docs related to NR-137369 around how trace behaves in the prescence of replay feature.
 */

import { testRumRequest } from '../../../tools/testing-server/utils/expect-tests'
import { config, MODE } from '../session-replay/helpers'
import { notIE } from '../../../tools/browser-matcher/common-matchers.mjs'

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

describe('Trace when replay entitlement is 1 and stn is 1', () => {
  let initSTReceived
  beforeEach(async () => {
    await browser.destroyAgentSession()
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      permanent: true, // note this is set since the tests in this block also tests subsequent load behavior
      body: JSON.stringify({
        stn: 1,
        err: 1,
        ins: 1,
        spa: 1,
        sr: 1,
        loaded: 1
      })
    })

    initSTReceived = undefined
    browser.testHandle.expectResources().then(resPayload => initSTReceived = resPayload)
  })
  afterEach(async () => {
    await browser.testHandle.clearScheduledReplies('bamServer')
  })

  it('still runs when replay feature is missing or disabled', async () => {
    const urlWithoutReplay = await browser.testHandle.assetURL('stn/instrumented.html', { init: { privacy: { cookies_enabled: true }, session_replay: { enabled: false } } })
    const getTraceValues = () => browser.execute(function () {
      return [
        Object.values(newrelic.initializedAgents)[0].features.session_trace.featAggregate.isStandalone,
        Object.values(newrelic.initializedAgents)[0].runtime.session.state.sessionTraceMode
      ]
    })

    await browser.url(urlWithoutReplay).then(() => browser.waitForAgentLoad()).then(async () => {
      expect(initSTReceived).toBeTruthy() // that is, trace should still fully run when the replay feature isn't around
      await expect(getTraceValues()).resolves.toEqual([true, MODE.FULL])

      return Promise.all([browser.testHandle.expectResources(3000), browser.refresh().then(() => browser.waitForAgentLoad())])
    }).then(async ([secondInitST]) => {
      // On subsequent page load or refresh, trace should maintain the set mode, standalone, and same sessionid but have a new ptid corresponding to new page visit.
      expect(secondInitST.request.query.s).toEqual(initSTReceived.request.query.s)
      expect(secondInitST.request.query.ptid).not.toEqual(initSTReceived.request.query.ptid)
      await expect(getTraceValues()).resolves.toEqual([true, MODE.FULL]) // note it's expected & assumed that the replay mode is OFF
    })
  })

  ;[
    ['OFF', { sampleRate: 0, errorSampleRate: 0 }],
    ['FULL', { sampleRate: 1, errorSampleRate: 0 }],
    ['ERR', { sampleRate: 0, errorSampleRate: 1 }]
  ].forEach(([replayMode, replayConfig]) => {
    it.withBrowsersMatching(notIE)(`runs in full when replay feature is present and in ${replayMode} mode`, async () => {
      const urlWithReplay = await browser.testHandle.assetURL('stn/instrumented.html', config({ session_replay: replayConfig }))
      const getRuntimeValues = () => browser.execute(function () {
        const agent = Object.values(newrelic.initializedAgents)[0]
        return [
          agent.features.session_trace.featAggregate.isStandalone,
          agent.runtime.session.state.sessionTraceMode,
          agent.features.session_replay.featAggregate?.initialized // expect replay to be fully imported and intialized, but in OFF mode per config above, via isStandalone = true
        ]
      })

      await browser.url(urlWithReplay).then(() => browser.waitForAgentLoad()).then(async () => {
        expect(initSTReceived).toBeTruthy() // that is, trace should still fully run when the replay feature isn't around

        if (replayMode === 'OFF') await expect(getRuntimeValues()).resolves.toEqual([true, MODE.FULL, true])
        else await expect(getRuntimeValues()).resolves.toEqual([false, MODE.FULL, true]) // when replay is running, trace is no longer op in standalone mode

        return Promise.all([browser.testHandle.expectResources(3000), browser.refresh().then(() => browser.waitForAgentLoad())])
      }).then(async ([secondInitST]) => {
        // On subsequent page load or refresh, trace should maintain the set mode, standalone, and same sessionid but have a new ptid corresponding to new page visit.
        expect(secondInitST.request.query.s).toEqual(initSTReceived.request.query.s)
        expect(secondInitST.request.query.ptid).not.toEqual(initSTReceived.request.query.ptid)

        if (replayMode === 'OFF') {
          await expect(getRuntimeValues()).resolves.toEqual([true, MODE.FULL, null]) // session_replay.featAggregate will be null as it's OFF and not imported on subsequent pages
        } else {
          await expect(getRuntimeValues()).resolves.toEqual([false, MODE.FULL, true])
        }
      })
    })
  })
})

describe.withBrowsersMatching(notIE)('Trace when replay entitlement is 1 and stn is 0', () => {
  let initSTReceived
  beforeEach(async () => {
    await browser.destroyAgentSession()
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify({
        stn: 0,
        err: 1,
        ins: 1,
        spa: 1,
        sr: 1,
        loaded: 1
      })
    })

    initSTReceived = undefined
    browser.testHandle.expectResources().then(resPayload => initSTReceived = resPayload)
  })

  it('does not run when replay is OFF', async () => {
    const urlReplayOff = await browser.testHandle.assetURL('stn/instrumented.html', config({ session_replay: { sampleRate: 0, errorSampleRate: 0 } }))
    await browser.url(urlReplayOff).then(() => browser.waitForAgentLoad()).then(() => {
      expect(initSTReceived).toBeUndefined()
    })
  })

  ;[
    ['FULL', { sampleRate: 1, errorSampleRate: 0 }],
    ['ERR', { sampleRate: 0, errorSampleRate: 1 }]
  ].forEach(([replayMode, replayConfig]) => {
    it(`still runs and in the same ${replayMode} mode as replay feature that's on`, async () => {
      const urlReplayOn = await browser.testHandle.assetURL('stn/instrumented.html', config({ session_replay: replayConfig, session_trace: { harvestTimeSeconds: 2 } }))
      await browser.url(urlReplayOn).then(() => browser.waitForAgentLoad()).then(async () => {
        const getAssumedValues = browser.execute(function () {
          const agent = Object.values(newrelic.initializedAgents)[0]
          return [
            agent.features.session_trace.featAggregate.isStandalone,
            agent.runtime.session.state.sessionTraceMode
          ]
        })
        if (replayMode === 'FULL') {
          await expect(getAssumedValues).resolves.toEqual([false, MODE.FULL])
          expect(initSTReceived).toBeTruthy()

          // When not in standalone, trace bypasses the old rate limiting of only harvesting on 30+ nodes. In practice, we should get few-secs-span harvests without that threshold.
          const second = await browser.testHandle.expectResources(3000).then(payload => payload.request.body.res.length) // 2nd harvest is usually riddled with a bunch of startup resource nodes
          const third = await browser.testHandle.expectResources(3000).then(payload => payload.request.body.res.length)
          expect([second, third].some(length => length < 30)).toBeTruthy()
        } else if (replayMode === 'ERR') {
          await expect(getAssumedValues).resolves.toEqual([false, MODE.ERROR])
          expect(initSTReceived).toBeUndefined() // trace in error mode is not expected to send anything on startup
        }
      })
    })
  })
})
