import { testRumRequest } from '../../../tools/testing-server/utils/expect-tests'

[
  { case: 'session tracking is disabled', trackingOn: false },
  { case: 'session tracking enabled but replay is off', trackingOn: true }
].forEach(runArgs => {
  describe(`Trace behavior when ${runArgs.case}`, () => {
    let stPayloadReceived, getUrlString
    beforeEach(() => {
      stPayloadReceived = undefined
      browser.testHandle.expectResources().then(() => stPayloadReceived = true)
      getUrlString = browser.testHandle.assetURL('stn/instrumented.html', {
        init: {
          privacy: { cookies_enabled: runArgs.trackingOn }
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
          cap: 1,
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

// describe('Trace behavior when session tracking is enabled', () => {

// })
