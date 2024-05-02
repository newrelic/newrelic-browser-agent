/*
 * All behavior and mode transition from error mode of Trace in tandem with the replay feature is tested in here.
 * Right now, Trace can only be in error mode when its stn flag is 0 but replay runs in error mode.
 */
import { testRumRequest } from '../../../tools/testing-server/utils/expect-tests'
import { config, MODE } from '../session-replay/helpers'
import { notIE, supportsMultipleTabs } from '../../../tools/browser-matcher/common-matchers.mjs'

const getTraceMode = async () => await browser.execute(function () {
  const agent = Object.values(newrelic.initializedAgents)[0]
  return [
    agent.runtime.session.state.sessionTraceMode,
    agent.features.session_trace.featAggregate.isStandalone
  ]
})

const simulateErrorInBrowser = async () => await browser.execute(function () {
  const errorElem = document.createElement('script')
  errorElem.textContent = 'throw new Error("triggered! 0__0");'
  document.body.append(errorElem)
})

const triggerReplayAbort = () => browser.execute(function () { Object.values(NREUM.initializedAgents)[0].runtime.session.reset() })

describe.withBrowsersMatching(notIE)('Trace error mode', () => {
  let testUrl

  beforeEach(async () => {
    await browser.destroyAgentSession()
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      permanent: true,
      body: JSON.stringify({ stn: 0, err: 1, ins: 1, spa: 1, sr: 1, loaded: 1 })
    })

    testUrl = await browser.testHandle.assetURL('stn/instrumented.html', config({ session_replay: { sampling_rate: 0, error_sampling_rate: 100 }, session_trace: { harvestTimeSeconds: 3 } }, this.test))
  })

  it('switches to full mode when an error happens after page load', async function () {
    await Promise.all([
      browser.testHandle.expectResources(10000, true),
      browser.url(testUrl)
        .then(() => browser.waitForFeatureAggregate('session_trace'))
    ])
    await expect(getTraceMode()).resolves.toEqual([MODE.ERROR, false])

    const [resources] = await Promise.all([
      browser.testHandle.expectResources(),
      simulateErrorInBrowser()
    ])
    await expect(getTraceMode()).resolves.toEqual([MODE.FULL, false])
    // The loadEventEnd is part of PT and PNT resource entry and is a node created at start of page life.
    expect(resources.request.body.res).toEqual(expect.arrayContaining([expect.objectContaining({
      n: 'loadEventEnd', o: 'document', t: 'timing'
    })]))

    await expect(browser.testHandle.expectResources(5000)).resolves.toBeTruthy() // double check there's nothing wrong with full mode interval harvest
  })

  it('starts in full mode when an error happens before page load', async function () {
    testUrl = await browser.testHandle.assetURL('js-error-with-error-before-page-load.html', config({ session_replay: { sampling_rate: 0, error_sampling_rate: 100 }, session_trace: { harvestTimeSeconds: 3 } }, this.test))

    const [resources] = await Promise.all([
      browser.testHandle.expectResources(),
      browser.url(testUrl)
    ])

    expect(resources).toBeTruthy()
    await expect(getTraceMode()).resolves.toEqual([MODE.FULL, false])

    await expect(browser.testHandle.expectResources(5000)).resolves.toBeTruthy()
  })

  it('starts in error mode but shifts to full mode if api is called', async function () {
    const [firstSTPayload] = await Promise.all([
      browser.testHandle.expectResources(10000, true),
      await browser.url(testUrl)
        .then(() => browser.waitForAgentLoad())
    ])

    // shouldnt get stn data yet
    expect(firstSTPayload).toBeFalsy()
    await expect(getTraceMode()).resolves.toEqual([MODE.ERROR, false])

    const [actualFirstSTPayload] = await Promise.all([
      browser.testHandle.expectResources(),
      browser.execute(function () {
        newrelic.recordReplay()
      })
    ])

    expect(actualFirstSTPayload).toEqual(expect.any(Object))
    await expect(getTraceMode()).resolves.toEqual([MODE.FULL, false])
  })

  it('does not capture more than the last 30 seconds when error happens', async function () {
    await browser.url(testUrl)
      .then(() => browser.waitForAgentLoad())
    await browser.pause(35000)

    const [resources] = await Promise.all([
      browser.testHandle.expectResources(),
      simulateErrorInBrowser()
    ])

    expect(resources.request.body.res.find(node => node.n === 'loadEventEnd')).toBeUndefined() // that node should've been tossed out by now
  })

  it('does not perform final harvest while in this mode', async function () {
    let [resources] = await Promise.all([
      browser.testHandle.expectResources(10000, true),
      browser.url(testUrl)
        .then(() => browser.waitForAgentLoad())
    ])

    await expect(getTraceMode()).resolves.toEqual([MODE.ERROR, false]) // sanity check tbh
    expect(resources).toBeUndefined()

    ;[resources] = await Promise.all([
      browser.testHandle.expectResources(10000, true),
      browser.refresh()
        .then(() => browser.waitForAgentLoad())
    ])

    expect(resources).toBeUndefined() // no harvest from either previous unload or from new existing-session load
  })

  it.withBrowsersMatching(supportsMultipleTabs)('catches mode transition from other pages in the session', async function () {
    await browser.url(testUrl)
      .then(() => browser.waitForAgentLoad())
    await expect(getTraceMode()).resolves.toEqual([MODE.ERROR, false])

    let firstPageTitle = await browser.getTitle()

    const newTab = await browser.createWindow('tab')
    await browser.switchToWindow(newTab.handle)
    await browser.url(testUrl)
      .then(() => browser.waitForAgentLoad())
    await expect(getTraceMode()).resolves.toEqual([MODE.ERROR, false])

    await simulateErrorInBrowser()
    await browser.pause(5000)

    await expect(getTraceMode()).resolves.toEqual([MODE.FULL, false])

    await browser.switchWindow(firstPageTitle)
    await expect(getTraceMode()).resolves.toEqual([MODE.FULL, false])

    await browser.closeWindow()
    await browser.switchToWindow((await browser.getWindowHandles())[0])
  })

  /* The mode transition should also work even when replay entitlement is 0 or it is off and trace is standalone, as long as session tracking is enabled.
    However, this particular behavior currently does not need testing because trace can not yet end up in error mode when running by itself. Could change in the future. */

  describe('trace when replay runs then is aborted', () => {
    ;[
      ['does a last harvest then stops, in full mode', MODE.FULL, { sampling_rate: 100, error_sampling_rate: 0 }],
      ['does not harvest anything, in error mode', MODE.ERROR, { sampling_rate: 0, error_sampling_rate: 100 }]
    ].forEach(([description, supposedMode, replayConfig]) => {
      it(description, async () => {
        testUrl = await browser.testHandle.assetURL('stn/instrumented.html', config({ session_replay: replayConfig, session_trace: { harvestTimeSeconds: 2 } }, this.test))

        await Promise.all([
          browser.testHandle.expectResources(10000, supposedMode !== MODE.FULL),
          browser.url(testUrl)
            .then(() => browser.waitForAgentLoad())
        ])

        expect(await getTraceMode()).toEqual([supposedMode, false])

        await Promise.all([
          browser.testHandle.expectResources(10000, supposedMode !== MODE.FULL), // abort should cause a harvest right away (in FULL), rather than the usual interval
          triggerReplayAbort()
        ])

        let anotherTraceHarvest = browser.testHandle.expectResources(10000, true)
        await expect(anotherTraceHarvest).resolves.toBeUndefined() // we shouldn't see any more harvest after the previous one on abort

        anotherTraceHarvest = browser.testHandle.expectResources(10000, true)
        await browser.url(await browser.testHandle.assetURL('/'))
        await expect(anotherTraceHarvest).resolves.toBeUndefined() // doubly check that nothing else is sent, i.e. on test page's unload logic
      })
    })
  })
})
