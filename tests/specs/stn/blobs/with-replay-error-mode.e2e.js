/*
 * All behavior and mode transition from error mode of Trace in tandem with the replay feature is tested in here.
 * Right now, Trace can only be in error mode when its stn flag is 0 but replay runs in error mode.
 */
import { testRumRequest } from '../../../tools/testing-server/utils/expect-tests'
import { config, MODE } from '../session-replay/helpers'
import { notIE, onlyChrome, supportsMultipleTabs } from '../../../tools/browser-matcher/common-matchers.mjs'

const getTraceMode = () => browser.execute(function () {
  const agent = Object.values(newrelic.initializedAgents)[0]
  return [
    agent.runtime.session.state.sessionTraceMode,
    agent.features.session_trace.featAggregate.isStandalone
  ]
})

describe.withBrowsersMatching(notIE)('Trace error mode', () => {
  let getReplayOnErrorUrl
  beforeEach(async () => {
    await browser.destroyAgentSession()
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      permanent: true,
      body: JSON.stringify({ stn: 0, err: 1, ins: 1, spa: 1, sr: 1, loaded: 1 })
    })

    getReplayOnErrorUrl = browser.testHandle.assetURL('stn/instrumented.html', config({ session_replay: { sampling_rate: 0, error_sampling_rate: 100 }, session_trace: { harvestTimeSeconds: 3 } }))
  })

  function simulateErrorInBrowser () { // this is a way to throw error in WdIO / Selenium without killing the test itself
    const errorElem = document.createElement('script')
    errorElem.textContent = 'throw new Error("triggered! 0__0");'
    document.body.append(errorElem)
  }

  it('switches to full mode when an error happens after page load', async () => {
    await Promise.all([
      browser.testHandle.expectResources(5001, true),
      browser.url(await getReplayOnErrorUrl).then(() => browser.waitForFeatureAggregate('session_trace'))
    ])
    await expect(getTraceMode()).resolves.toEqual([MODE.ERROR, false])

    const [resources] = await Promise.all([
      browser.testHandle.expectResources(),
      browser.execute(simulateErrorInBrowser)
    ])
    await expect(getTraceMode()).resolves.toEqual([MODE.FULL, false])
    // The loadEventEnd is part of PT and PNT resource entry and is a node created at start of page life.
    expect(resources.request.body.res).toEqual(expect.arrayContaining([expect.objectContaining({
      n: 'loadEventEnd', o: 'document', t: 'timing'
    })]))

    await expect(browser.testHandle.expectResources(5002)).resolves.toBeTruthy() // double check there's nothing wrong with full mode interval harvest
  })

  it('starts in full mode when an error happens before page load', async () => {
    let getFirstSTPayload = browser.testHandle.expectResources(5010)
    await browser.url(await browser.testHandle.assetURL('js-error-with-error-before-page-load.html', config({ session_replay: { sampling_rate: 0, error_sampling_rate: 100 }, session_trace: { harvestTimeSeconds: 3 } })))
    await browser.waitForAgentLoad()
    await expect(getFirstSTPayload).resolves.toBeTruthy()
    await expect(getTraceMode()).resolves.toEqual([MODE.FULL, false])

    await expect(browser.testHandle.expectResources(5011)).resolves.toBeTruthy()
  })

  it('starts in error mode but shifts to full mode if api is called', async () => {
    let getFirstSTPayload = browser.testHandle.expectResources(5020, true)
    await browser.url(await browser.testHandle.assetURL('instrumented.html', config({ session_replay: { sampling_rate: 0, error_sampling_rate: 100 }, session_trace: { harvestTimeSeconds: 3 } })))
    await browser.waitForAgentLoad()
    // shouldnt get stn data yet
    await expect(getFirstSTPayload).resolves.toBeFalsy()
    await expect(getTraceMode()).resolves.toEqual([MODE.ERROR, false])

    const [actualFirstSTPayload] = await Promise.all([
      browser.testHandle.expectResources(5021),
      browser.execute(function () {
        newrelic.recordReplay()
      })
    ])

    expect(actualFirstSTPayload).toEqual(expect.any(Object))
    await expect(getTraceMode()).resolves.toEqual([MODE.FULL, false])
  })

  it.withBrowsersMatching(onlyChrome)('does not capture more than the last 30 seconds when error happens', async () => {
    await getReplayOnErrorUrl.then(builtUrl => browser.url(builtUrl)).then(() => browser.waitForAgentLoad()).then(async () => {
      await browser.pause(30000)
      await Promise.all([
        browser.testHandle.expectResources(5020), // the setup expectRes promise would've timed out already -- you will see some console errors but they don't impact validity
        browser.execute(simulateErrorInBrowser)
      ]).then(async ([initSTAfterErr]) => {
        expect(initSTAfterErr.request.body.res.find(node => node.n === 'loadEventEnd')).toBeUndefined() // that node should've been tossed out by now
      })
    })
  })

  it('does not perform final harvest while in this mode', async () => {
    let resources = browser.testHandle.expectResources(5030, true)
    await getReplayOnErrorUrl.then(builtUrl => browser.url(builtUrl)).then(() => browser.waitForAgentLoad()).then(async () => {
      await expect(getTraceMode()).resolves.toEqual([MODE.ERROR, false]) // sanity check tbh
      await expect(resources).resolves.toBeUndefined()

      resources = browser.testHandle.expectResources(5031, true)
    }).then(() => browser.refresh()).then(() => browser.waitForAgentLoad()).then(async () => {
      await expect(getTraceMode()).resolves.toEqual([MODE.ERROR, false])
      await expect(resources).resolves.toBeUndefined() // no harvest from either previous unload or from new existing-session load
    })
  })

  it.withBrowsersMatching(supportsMultipleTabs)('catches mode transition from other pages in the session', async () => {
    await getReplayOnErrorUrl.then(builtUrl => browser.url(builtUrl)).then(() => browser.waitForAgentLoad()).then(async () => {
      await getTraceMode().then(([traceMode]) => expect(traceMode).toEqual(MODE.ERROR))
      let firstPageTitle = await browser.getTitle()

      await browser.newWindow(await getReplayOnErrorUrl, { windowName: 'Second page' })
      await getTraceMode().then(([traceMode]) => expect(traceMode).toEqual(MODE.ERROR))
      await browser.execute(simulateErrorInBrowser)
      await browser.pause(500)
      await getTraceMode().then(([traceMode]) => expect(traceMode).toEqual(MODE.FULL))
      // NOTE: replay entitlement must be on (sr = 1) for trace to exhibit this behavior, although this could change in the future to be applicable to standalone trace in a session.

      await browser.switchWindow(firstPageTitle)
      await getTraceMode().then(([traceMode]) => expect(traceMode).toEqual(MODE.FULL))
    })
  })

  /* The mode transition should also work even when replay entitlement is 0 or it is off and trace is standalone, as long as session tracking is enabled.
    However, this particular behavior currently does not need testing because trace can not yet end up in error mode when running by itself. Could change in the future. */
})

describe.withBrowsersMatching(notIE)('Trace when replay runs then is aborted', () => {
  beforeEach(async () => {
    await browser.destroyAgentSession()
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      permanent: true,
      body: JSON.stringify({ stn: 0, err: 1, ins: 1, spa: 1, sr: 1, loaded: 1 })
    })
  })

  const triggerReplayAbort = () => browser.execute(function () { Object.values(NREUM.initializedAgents)[0].runtime.session.reset() })

  ;[
    ['does a last harvest then stops, in full mode', MODE.FULL, { sampling_rate: 100, error_sampling_rate: 0 }],
    ['does not harvest anything, in error mode', MODE.ERROR, { sampling_rate: 0, error_sampling_rate: 100 }]
  ].forEach(([description, supposedMode, replayConfig]) => {
    it(description, async () => {
      let url = await browser.testHandle.assetURL('stn/instrumented.html', config({ session_replay: replayConfig, session_trace: { harvestTimeSeconds: 2 } }))
      let getFirstSTPayload = browser.testHandle.expectResources(3000)
      await browser.url(url)
      await browser.waitForAgentLoad()

      if (supposedMode === MODE.FULL) await expect(getFirstSTPayload).resolves.toBeTruthy()
      else await expect(getFirstSTPayload).rejects.toThrow() // in ERROR mode
      expect(await getTraceMode()).toEqual([supposedMode, false])

      let lastSTHarvest = browser.testHandle.expectResources(1000) // abort should cause a harvest right away (in FULL), rather than the usual interval
      await triggerReplayAbort()
      expect(await getTraceMode()).toEqual([MODE.OFF, false])
      if (supposedMode === MODE.FULL) await expect(lastSTHarvest).resolves.toBeTruthy()
      else await expect(lastSTHarvest).rejects.toThrow()

      let anotherTraceHarvest = browser.testHandle.expectResources(3000, true)
      await expect(anotherTraceHarvest).resolves.toBeUndefined() // we shouldn't see any more harvest after the previous one on abort

      anotherTraceHarvest = browser.testHandle.expectResources(2000, true)
      await browser.url(await browser.testHandle.assetURL('/'))
      await expect(anotherTraceHarvest).resolves.toBeUndefined() // doubly check that nothing else is sent, i.e. on test page's unload logic
    })
  })
})
