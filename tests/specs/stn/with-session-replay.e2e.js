import { testRumRequest } from '../../../tools/testing-server/utils/expect-tests'

describe('Trace behavior when session tracking is disabled', () => {
  const rumFlags = {
    err: 1,
    ins: 1,
    cap: 1,
    spa: 1,
    loaded: 1
  }
  let stPayloadReceived, getUrlString
  beforeEach(() => {
    stPayloadReceived = undefined
    browser.testHandle.expectResources().then(() => stPayloadReceived = true)
    getUrlString = browser.testHandle.assetURL('stn/instrumented.html', {
      init: {
        privacy: { cookies_enabled: false }
      }
    })
  })

  it('does not run if stn flag is 0', async () => {
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify({ stn: 0, ...rumFlags })
    })

    await getUrlString.then(builtUrl => browser.url(builtUrl)).then(() => browser.waitForAgentLoad()).then(() => {
      expect(stPayloadReceived).toBeUndefined() // trace payload should've been received by now after page has loaded
    })
  })

  it('does run (standalone behavior) if stn flag is 1', async () => {
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify({ stn: 1, ...rumFlags })
    })

    await getUrlString.then(builtUrl => browser.url(builtUrl)).then(() => browser.waitForAgentLoad()).then(async () => {
      const getTraceMode = browser.execute(function () { // expect Trace to be running by itself
        return Object.values(newrelic.initializedAgents)[0].features.session_trace.featAggregate.isStandalone
      })
      expect(stPayloadReceived).toBeTruthy()
      await expect(getTraceMode).resolves.toBeTruthy()
    })
  })
})

describe('Trace behavior when session tracking is enabled', () => {

})
