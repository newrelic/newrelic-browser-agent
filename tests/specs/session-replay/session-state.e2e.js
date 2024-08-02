import { supportsMultipleTabs } from '../../../tools/browser-matcher/common-matchers.mjs'
import { RRWEB_EVENT_TYPES, srConfig, MODE, testExpectedReplay } from '../util/helpers.js'

describe('session manager state behavior', () => {
  afterEach(async () => {
    await browser.destroyAgentSession(browser.testHandle)
  })

  describe('session manager mode matches session replay instance mode', () => {
    it('should match in full mode', async () => {
      await browser.enableSessionReplay()
      await browser.url(await browser.testHandle.assetURL('instrumented.html', srConfig()))
        .then(() => browser.waitForFeatureAggregate('session_replay'))

      await browser.pause(1000)
      const { agentSessions } = await browser.getAgentSessionInfo()
      const sessionClass = Object.values(agentSessions)[0]
      expect(sessionClass.sessionReplayMode).toEqual(MODE.FULL)
    })

    it('should match in error mode', async () => {
      await browser.enableSessionReplay(0, 100)
      await browser.url(await browser.testHandle.assetURL('instrumented.html', srConfig()))
        .then(() => browser.waitForFeatureAggregate('session_replay'))

      await browser.pause(1000)
      const { agentSessions } = await browser.getAgentSessionInfo()
      const sessionClass = Object.values(agentSessions)[0]
      expect(sessionClass.sessionReplayMode).toEqual(MODE.ERROR)
    })

    it('should match in off mode', async () => {
      await browser.enableSessionReplay(0, 0)
      await browser.url(await browser.testHandle.assetURL('instrumented.html', srConfig()))
        .then(() => browser.waitForFeatureAggregate('session_replay'))

      await browser.pause(1000)
      const { agentSessions } = await browser.getAgentSessionInfo()
      const sessionClass = Object.values(agentSessions)[0]
      expect(sessionClass.sessionReplayMode).toEqual(MODE.OFF)
    })
  })

  describe('When session ends', () => {
    it('should end recording and unload', async () => {
      await browser.enableSessionReplay()
      await browser.url(await browser.testHandle.assetURL('rrweb-record.html', { init: { session: { expiresMs: 7500 }, session_replay: { enabled: true } } }))
        .then(() => browser.waitForSessionReplayRecording())

      // session has started, replay should have set mode to "FULL"
      const { agentSessions: oldSession } = await browser.getAgentSessionInfo()
      const oldSessionClass = Object.values(oldSession)[0]
      expect(oldSessionClass.sessionReplayMode).toEqual(MODE.FULL)

      await Promise.all([
        browser.testHandle.expectReplay(10000, true),
        browser.execute(function () {
          document.querySelector('body').click()
          Object.values(newrelic.initializedAgents)[0].runtime.session.reset()
        })
      ])
    })
  })

  describe('When session resumes', () => {
    it.withBrowsersMatching(supportsMultipleTabs)('should take a full snapshot and continue recording', async () => {
      await browser.enableSessionReplay()
      const [{ request: payload }] = await Promise.all([
        browser.testHandle.expectReplay(15000),
        browser.url(await browser.testHandle.assetURL('instrumented.html', srConfig()))
          .then(() => browser.waitForAgentLoad())
      ])

      expect(payload.body.length).toBeGreaterThan(0)
      // type 2 payloads are snapshots
      expect(payload.body.filter(x => x.type === RRWEB_EVENT_TYPES.FullSnapshot).length).toEqual(1)

      /** This is scoped out this way to guarantee we have it staged in time since preload can harvest super early, sometimes earlier than wdio can expect normally */
      /** see next `testExpectedReplay` */
      browser.testHandle.expectReplay(15000).then(async ({ request: page2Contents }) => {
        testExpectedReplay({ data: page2Contents, session: localStorage.value, hasError: false, hasMeta: true, hasSnapshot: true, isFirstChunk: false })
      })
      const newTab = await browser.createWindow('tab')
      await browser.switchToWindow(newTab.handle)
      await browser.enableSessionReplay()
      await browser.url(await browser.testHandle.assetURL('instrumented.html', srConfig()))
        .then(() => browser.waitForSessionReplayRecording())

      await browser.closeWindow()
      await browser.switchToWindow((await browser.getWindowHandles())[0])
    })
  })

  describe('When session pauses', () => {
    it.withBrowsersMatching(supportsMultipleTabs)('should pause recording', async () => {
      await browser.enableSessionReplay()
      await browser.url(await browser.testHandle.assetURL('instrumented.html', srConfig()))
        .then(() => browser.waitForAgentLoad())

      await browser.testHandle.expectReplay(5000)

      const newTab = await browser.createWindow('tab')
      await browser.switchToWindow(newTab.handle)
      await browser.enableSessionReplay()
      await browser.url(await browser.testHandle.assetURL('/'))

      // Waiting for the second blob should time out, indicating no second call to the BAM endpoint.
      // The wait must be longer than harvest interval.
      await browser.testHandle.expectReplay(10000, true)
      await browser.closeWindow()
      await browser.switchToWindow((await browser.getWindowHandles())[0])
    })
  })
})
