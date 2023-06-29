/*
 * All behavior and mode transition from error mode of Trace in tandem with the replay feature is tested in here.
 * Right now, Trace can only be in error mode when its stn flag is 0 but replay runs in error mode.
 */
import { testRumRequest } from '../../../tools/testing-server/utils/expect-tests'
import { config, MODE } from '../session-replay/helpers'
import { notIE, onlyChrome, supportsMultipleTabs } from '../../../tools/browser-matcher/common-matchers.mjs'

describe.withBrowsersMatching(notIE)('Trace error mode', () => {
  let initSTReceived, getReplayOnErrorUrl
  beforeEach(async () => {
    await browser.destroyAgentSession()
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      permanent: true,
      body: JSON.stringify({ stn: 0, err: 1, ins: 1, spa: 1, sr: 1, loaded: 1 })
    })

    initSTReceived = undefined
    browser.testHandle.expectResources().then(resPayload => initSTReceived = resPayload)
    getReplayOnErrorUrl = browser.testHandle.assetURL('stn/instrumented.html', config({ session_replay: { sampleRate: 0, errorSampleRate: 1 }, session_trace: { harvestTimeSeconds: 2 } }))
  })

  const getTraceMode = () => browser.execute(function () {
    const agent = Object.values(newrelic.initializedAgents)[0]
    return [
      agent.runtime.session.state.sessionTraceMode,
      agent.features.session_trace.featAggregate.isStandalone
    ]
  })
  function simulateErrorInBrowser () { // this is a way to throw error in WdIO / Selenium without killing the test itself
    const errorElem = document.createElement('script')
    errorElem.textContent = 'throw new Error("triggered! 0__0");'
    document.body.append(errorElem)
  }

  it('switches to full mode when an error happens after page load', async () => {
    await getReplayOnErrorUrl.then(builtUrl => browser.url(builtUrl)).then(() => browser.waitForAgentLoad()).then(async () => {
      let startingMode = (await getTraceMode())[0]
      expect(initSTReceived).toBeUndefined()
      expect(startingMode).toEqual(MODE.ERROR)

      await browser.execute(simulateErrorInBrowser)
      let modeAfterErr = (await getTraceMode())[0]
      expect(modeAfterErr).toEqual(MODE.FULL)
      // The loadEventEnd is part of PT and PNT resource entry and is a node created at start of page life.
      expect(initSTReceived.request.body.res.find(node => node.n === 'loadEventEnd')).toEqual(expect.objectContaining({ n: 'loadEventEnd', o: 'document', t: 'timing' }))

      await expect(browser.testHandle.expectResources(3000)).resolves.toBeTruthy() // double check there's nothing wrong with full mdoe interval harvest
    })
  })

  it('starts in full mode when an error happens before page load', async () => {
    await getReplayOnErrorUrl.then(builtUrl => browser.url(builtUrl)).then(() => browser.execute(simulateErrorInBrowser)).then(() => browser.waitForAgentLoad()).then(async () => {
      let startingMode = (await getTraceMode())[0]
      expect(initSTReceived).toBeTruthy()
      expect(startingMode).toEqual(MODE.FULL)

      await expect(browser.testHandle.expectResources(3000)).resolves.toBeTruthy()
    })
  })

  it.withBrowsersMatching(onlyChrome)('does not capture more than the last 30 seconds when error happens', async () => {
    await getReplayOnErrorUrl.then(builtUrl => browser.url(builtUrl)).then(() => browser.waitForAgentLoad()).then(async () => {
      await browser.pause(30000)
      await Promise.all([
        browser.testHandle.expectResources(3000), // the setup expectRes promise would've timed out already -- you will see some console errors but they don't impact validity
        browser.execute(simulateErrorInBrowser)
      ]).then(async ([initSTAfterErr]) => {
        expect(initSTAfterErr.request.body.res.find(node => node.n === 'loadEventEnd')).toBeUndefined() // that node should've been tossed out by now
      })
    })
  })

  it('does not perform final harvest while in this mode', async () => {
    await getReplayOnErrorUrl.then(builtUrl => browser.url(builtUrl)).then(() => browser.waitForAgentLoad()).then(async () => {
      await getTraceMode().then(traceState => expect(traceState).toEqual([MODE.ERROR, false])) // sanity check tbh
      expect(initSTReceived).toBeUndefined()
    }).then(() => browser.refresh()).then(() => browser.waitForAgentLoad()).then(async () => {
      await getTraceMode().then(traceState => expect(traceState).toEqual([MODE.ERROR, false]))
      expect(initSTReceived).toBeUndefined() // no harvest from either previous unload or from new existing-session load
    })
  })

  it.withBrowsersMatching(supportsMultipleTabs)('catches mode transition from other pages in the session', async () => {
    await getReplayOnErrorUrl.then(builtUrl => browser.url(builtUrl)).then(() => browser.waitForAgentLoad()).then(async () => {
      await getTraceMode().then(([traceMode]) => expect(traceMode).toEqual(MODE.ERROR))
      let firstPageTitle = await browser.getTitle()

      await browser.newWindow(await getReplayOnErrorUrl, { windowName: 'Second page' })
      await getTraceMode().then(([traceMode]) => expect(traceMode).toEqual(MODE.ERROR))
      await browser.execute(simulateErrorInBrowser)
      await getTraceMode().then(([traceMode]) => expect(traceMode).toEqual(MODE.FULL))

      await browser.switchWindow(firstPageTitle)
      await getTraceMode().then(([traceMode]) => expect(traceMode).toEqual(MODE.FULL))
    })
  })
})
