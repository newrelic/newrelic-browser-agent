import { supportsMultipleTabs, notIE } from '../../../tools/browser-matcher/common-matchers.mjs'
import { RRWEB_EVENT_TYPES, config, MODE, testExpectedReplay } from './helpers.js'

describe.withBrowsersMatching(notIE)('session manager state behavior', () => {
  beforeEach(async () => {
    await browser.enableSessionReplay()
  })

  afterEach(async () => {
    await browser.destroyAgentSession(browser.testHandle)
  })

  describe('session manager mode matches session replay instance mode', () => {
    it('should match in full mode', async () => {
      await browser.url(await browser.testHandle.assetURL('instrumented.html', config()))
        .then(() => browser.waitForFeatureAggregate('session_replay'))

      await browser.pause(1000)
      const { agentSessions } = await browser.getAgentSessionInfo()
      const sessionClass = Object.values(agentSessions)[0]
      expect(sessionClass.sessionReplayMode).toEqual(MODE.FULL)
    })

    it('should match in error mode', async () => {
      await browser.url(await browser.testHandle.assetURL('instrumented.html', config({ session_replay: { sampling_rate: 0, error_sampling_rate: 100 } })))
        .then(() => browser.waitForFeatureAggregate('session_replay'))

      await browser.pause(1000)
      const { agentSessions } = await browser.getAgentSessionInfo()
      const sessionClass = Object.values(agentSessions)[0]
      expect(sessionClass.sessionReplayMode).toEqual(MODE.ERROR)
    })

    it('should match in off mode', async () => {
      await browser.url(await browser.testHandle.assetURL('instrumented.html', config({ session_replay: { sampling_rate: 0, error_sampling_rate: 0 } })))
        .then(() => browser.waitForFeatureAggregate('session_replay'))

      await browser.pause(1000)
      const { agentSessions } = await browser.getAgentSessionInfo()
      const sessionClass = Object.values(agentSessions)[0]
      expect(sessionClass.sessionReplayMode).toEqual(MODE.OFF)
    })
  })

  describe('When session ends', () => {
    it('should end recording and unload', async () => {
      await browser.url(await browser.testHandle.assetURL('instrumented.html', config({ session: { expiresMs: 7500 }, session_replay: { harvestTimeSeconds: 10 } })))
        .then(() => browser.waitForSessionReplayRecording())

      // session has started, replay should have set mode to "FULL"
      const { agentSessions: oldSession } = await browser.getAgentSessionInfo()
      const oldSessionClass = Object.values(oldSession)[0]
      expect(oldSessionClass.sessionReplayMode).toEqual(MODE.FULL)

      await Promise.all([
        browser.testHandle.expectBlob(),
        browser.execute(function () {
          document.querySelector('body').click()
        })
      ])

      // session has ended, replay should have set mode to "OFF"
      const { agentSessions: newSession } = await browser.getAgentSessionInfo()
      const newSessionClass = Object.values(newSession)[0]
      expect(newSessionClass.sessionReplayMode).toEqual(MODE.OFF)
    })
  })

  describe('When session resumes', () => {
    it.withBrowsersMatching(supportsMultipleTabs)('should take a full snapshot and continue recording', async () => {
      const [{ request: payload }] = await Promise.all([
        browser.testHandle.expectBlob(15000),
        browser.url(await browser.testHandle.assetURL('instrumented.html', config()))
          .then(() => browser.waitForAgentLoad())
      ])

      expect(payload.body.length).toBeGreaterThan(0)
      // type 2 payloads are snapshots
      expect(payload.body.filter(x => x.type === RRWEB_EVENT_TYPES.FullSnapshot).length).toEqual(1)

      /** This should fire when the tab changes, it's easier to stage it this way before hand, and allows for the super early staging for the next expect */
      browser.testHandle.expectBlob(15000).then(({ request: page1UnloadContents }) => {
        testExpectedReplay({ data: page1UnloadContents, session: localStorage.value, hasError: false, hasMeta: false, hasSnapshot: false, isFirstChunk: false })
      })

      /** This is scoped out this way to guarantee we have it staged in time since preload can harvest super early, sometimes earlier than wdio can expect normally */
      /** see next `testExpectedReplay` */
      browser.testHandle.expectBlob(15000).then(async ({ request: page2Contents }) => {
        testExpectedReplay({ data: page2Contents, session: localStorage.value, hasError: false, hasMeta: true, hasSnapshot: true, isFirstChunk: false })
      })
      const newTab = await browser.createWindow('tab')
      await browser.switchToWindow(newTab.handle)
      await browser.enableSessionReplay()
      await browser.url(await browser.testHandle.assetURL('instrumented.html', config()))
        .then(() => browser.waitForSessionReplayRecording())
    })
  })

  describe('When session pauses', () => {
    it.withBrowsersMatching(supportsMultipleTabs)('should pause recording', async () => {
      await browser.url(await browser.testHandle.assetURL('instrumented.html', config()))
        .then(() => browser.waitForAgentLoad())

      await browser.testHandle.expectBlob(5000)

      const newTab = await browser.createWindow('tab')
      await browser.switchToWindow(newTab.handle)
      await browser.enableSessionReplay()
      await browser.url(await browser.testHandle.assetURL('/'))

      // Waiting for the second blob should time out, indicating no second call to the BAM endpoint.
      // The wait must be longer than harvest interval.
      await browser.testHandle.expectBlob(10000, true)
      await browser.closeWindow()
      await browser.switchToWindow((await browser.getWindowHandles())[0])
    })
  })
})
