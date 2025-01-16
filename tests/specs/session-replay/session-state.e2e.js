import { supportsMultiTabSessions } from '../../../tools/browser-matcher/common-matchers.mjs'
import { RRWEB_EVENT_TYPES, srConfig, MODE, decodeAttributes } from '../util/helpers.js'
import { testBlobReplayRequest } from '../../../tools/testing-server/utils/expect-tests'
import { JSONPath } from 'jsonpath-plus'

describe('session manager state behavior', () => {
  afterEach(async () => {
    await browser.destroyAgentSession(browser.testHandle)
  })

  describe('session manager mode matches session replay instance mode', () => {
    it('should match in full mode', async () => {
      await browser.enableSessionReplay()
      await browser.url(await browser.testHandle.assetURL('instrumented.html', srConfig()))
        .then(() => browser.waitForFeatureAggregate('session_replay'))

      await browser.pause(1000) // Give the agent time to update the session replay state

      const { agentSessions } = await browser.getAgentSessionInfo()
      const sessionClass = Object.values(agentSessions)[0]
      expect(sessionClass.sessionReplayMode).toEqual(MODE.FULL)
    })

    it('should match in error mode', async () => {
      await browser.enableSessionReplay(0, 100)
      await browser.url(await browser.testHandle.assetURL('instrumented.html', srConfig()))
        .then(() => browser.waitForFeatureAggregate('session_replay'))

      await browser.pause(1000) // Give the agent time to update the session replay state

      const { agentSessions } = await browser.getAgentSessionInfo()
      const sessionClass = Object.values(agentSessions)[0]
      expect(sessionClass.sessionReplayMode).toEqual(MODE.ERROR)
    })

    it('should match in off mode', async () => {
      await browser.enableSessionReplay(0, 0)
      await browser.url(await browser.testHandle.assetURL('instrumented.html', srConfig()))
        .then(() => browser.waitForFeatureAggregate('session_replay'))

      await browser.pause(1000) // Give the agent time to update the session replay state

      const { agentSessions } = await browser.getAgentSessionInfo()
      const sessionClass = Object.values(agentSessions)[0]
      expect(sessionClass.sessionReplayMode).toEqual(MODE.OFF)
    })
  })

  describe('when session ends', () => {
    it('should end recording and clear the buffer', async () => {
      await browser.enableSessionReplay()
      await browser.url(await browser.testHandle.assetURL('rrweb-record.html', { init: { session: { expiresMs: 7500 }, session_replay: { enabled: true } } }))
        .then(() => browser.waitForSessionReplayRecording())

      // session has started, replay should have set mode to "FULL"
      const { agentSessions: oldSession } = await browser.getAgentSessionInfo()
      const oldSessionClass = Object.values(oldSession)[0]
      expect(oldSessionClass.sessionReplayMode).toEqual(MODE.FULL)

      const sessionReplayCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testBlobReplayRequest })
      const [sessionReplayHarvests] = await Promise.all([
        sessionReplayCapture.waitForResult({ timeout: 10000 }),
        browser.execute(function () {
          document.querySelector('body').click()
          Object.values(newrelic.initializedAgents)[0].runtime.session.reset()
        })
      ])

      expect(sessionReplayHarvests.length).toEqual(1)
    })
  })

  describe.withBrowsersMatching(supportsMultiTabSessions)('when session resumes', () => {
    it('should take a full snapshot and continue recording', async () => {
      const sessionReplayCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testBlobReplayRequest })

      await browser.enableSessionReplay()
      let [sessionReplayHarvests] = await Promise.all([
        sessionReplayCapture.waitForResult({ timeout: 10000 }),
        browser.url(await browser.testHandle.assetURL('instrumented.html', srConfig()))
          .then(() => browser.waitForAgentLoad())
      ])
      const page1ptid = decodeAttributes(sessionReplayHarvests[0].request.query.attributes).harvestId.split('_')[1]

      expect(sessionReplayHarvests.length).toBeGreaterThanOrEqual(1)
      expect(
        JSONPath({ path: `$.[*].request.body.[?(!!@ && @.type===${RRWEB_EVENT_TYPES.FullSnapshot} && !!@.data)]`, json: sessionReplayHarvests }).length
      ).toEqual(1)

      ;[sessionReplayHarvests] = await Promise.all([
        sessionReplayCapture.waitForResult({ timeout: 10000 }),
        browser.createWindow('tab')
          .then((newTab) => browser.switchToWindow(newTab.handle))
          .then(async () => browser.url(await browser.testHandle.assetURL('instrumented.html', srConfig())))
          .then(() => browser.waitForAgentLoad())
      ])

      const newTabHarvests = sessionReplayHarvests
        .filter(harvest => decodeAttributes(harvest.request.query.attributes).harvestId.indexOf(page1ptid) === -1)
      expect(newTabHarvests.length).toBeGreaterThan(0)
      expect(
        JSONPath({ path: `$.[*].request.body.[?(!!@ && @.type===${RRWEB_EVENT_TYPES.FullSnapshot} && !!@.data)]`, json: newTabHarvests }).length
      ).toEqual(1)

      /**
       * Preloaded payloads may be sent after the first page load harvest. See https://new-relic.atlassian.net/browse/NR-305669
       * Once that ticket is fixed, the below checks should pass
       */
      // testExpectedReplay({ data: refreshHarvests[0].request, session: localStorage.value, hasError: false, hasMeta: true, hasSnapshot: true, isFirstChunk: false })
      // refreshHarvests.slice(1).forEach(harvest =>
      //   testExpectedReplay({ data: harvest.request, session: localStorage.value, hasError: false, hasMeta: false, hasSnapshot: false, isFirstChunk: false })
      // )

      await browser.closeWindow()
      await browser.switchToWindow((await browser.getWindowHandles())[0])
    })
  })

  describe.withBrowsersMatching(supportsMultiTabSessions)('when session pauses', () => {
    it('should pause recording', async () => {
      const sessionReplayCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testBlobReplayRequest })

      await browser.enableSessionReplay()
      let [sessionReplayHarvests] = await Promise.all([
        sessionReplayCapture.waitForResult({ timeout: 10000 }),
        browser.url(await browser.testHandle.assetURL('instrumented.html', srConfig()))
          .then(() => browser.waitForAgentLoad())
      ])

      expect(sessionReplayHarvests.length).toBeGreaterThanOrEqual(1)

      /*
      Switch to a new tab to force the existing tab to final harvest. Then wait for 10 seconds
      to be sure we have captured all the session replay harvests before loading the new page
      in the new tab.
       */
      await browser.createWindow('tab')
        .then((newTab) => browser.switchToWindow(newTab.handle))

      await sessionReplayCapture.waitForResult({ timeout: 10000 })
      const totalHarvestCount = (await sessionReplayCapture.getCurrentResults()).length

      ;[sessionReplayHarvests] = await Promise.all([
        sessionReplayCapture.waitForResult({ timeout: 10000 }),
        browser.url(await browser.testHandle.assetURL('/', srConfig()))
      ])

      expect(sessionReplayHarvests.length).toEqual(totalHarvestCount)

      await browser.closeWindow()
      await browser.switchToWindow((await browser.getWindowHandles())[0])
    })
  })
})
