import { supportsMultipleTabs } from '../../../tools/browser-matcher/common-matchers.mjs'
import { testRumRequest } from '../../../tools/testing-server/utils/expect-tests.js'
import { RRWEB_EVENT_TYPES, config, getSR } from './helpers.js'

/** The "mode" with which the session replay is recording */
const MODE = {
  OFF: 0,
  FULL: 1,
  ERROR: 2
}

describe('session manager state behavior', () => {
  beforeEach(async () => {
    await browser.enableSessionReplay()
  })

  afterEach(async () => {
    await browser.destroyAgentSession(browser.testHandle)
  })

  describe('session manager mode matches session replay instance mode', () => {
    it('should match in full mode', async () => {
      await browser.url(await browser.testHandle.assetURL('instrumented.html', config()))
        .then(() => browser.waitForAgentLoad())

      await browser.pause(1000)
      const { agentSessions } = await browser.getAgentSessionInfo()
      const sessionClass = Object.values(agentSessions)[0]
      expect(sessionClass.sessionReplay).toEqual(MODE.FULL)
    })

    it('should match in error mode', async () => {
      await browser.url(await browser.testHandle.assetURL('instrumented.html', config({ sampleRate: 0, errorSampleRate: 1 })))
        .then(() => browser.waitForAgentLoad())

      const { agentSessions } = await browser.getAgentSessionInfo()
      const sessionClass = Object.values(agentSessions)[0]
      expect(sessionClass.sessionReplay).toEqual(MODE.ERROR)
    })

    it('should match in off mode', async () => {
      await browser.url(await browser.testHandle.assetURL('instrumented.html', config({ sampleRate: 0, errorSampleRate: 0 })))
        .then(() => browser.waitForAgentLoad())

      const { agentSessions } = await browser.getAgentSessionInfo()
      const sessionClass = Object.values(agentSessions)[0]
      expect(sessionClass.sessionReplay).toEqual(MODE.OFF)
    })
  })

  describe('When session ends', () => {
    it('should end recording and unload', async () => {
      await browser.url(await browser.testHandle.assetURL('instrumented.html', {
        ...config(),
        init: {
          // harvest intv longer than the session expiry time
          ...config({ harvestTimeSeconds: 10 }).init,
          session: { expiresMs: 7500 }
        }
      }))
        .then(() => Promise.all([
          browser.waitForAgentLoad()
        ]))

      // session has started, replay should have set mode to "FULL"
      const { agentSessions: oldSession } = await browser.getAgentSessionInfo()
      const oldSessionClass = Object.values(oldSession)[0]
      expect(oldSessionClass.sessionReplay).toEqual(MODE.FULL)

      await Promise.all([
        browser.testHandle.expectBlob(),
        browser.execute(function () { document.querySelector('body').click() })
      ])

      // session has ended, replay should have set mode to "OFF"
      const { agentSessions: newSession } = await browser.getAgentSessionInfo()
      const newSessionClass = Object.values(newSession)[0]
      expect(newSessionClass.sessionReplay).toEqual(MODE.OFF)
    })
  })

  describe('When session resumes', () => {
    withBrowsersMatching(supportsMultipleTabs)('should take a full snapshot and continue recording', async () => {
      await browser.url(await browser.testHandle.assetURL('instrumented.html', config()))
        .then(() => browser.waitForAgentLoad())

      await browser.pause(1000)

      const { events: currentPayload } = await getSR()

      expect(currentPayload.length).toBeGreaterThan(0)
      // type 2 payloads are snapshots
      expect(currentPayload.filter(x => x.type === RRWEB_EVENT_TYPES.FullSnapshot).length).toEqual(1)

      const newTab = await browser.createWindow('tab')
      await browser.switchToWindow(newTab.handle)
      await browser.testHandle.scheduleReply('bamServer', {
        test: testRumRequest,
        body: JSON.stringify({
          stn: 1,
          err: 1,
          ins: 1,
          cap: 1,
          spa: 1,
          loaded: 1,
          sr: 1
        })
      })
      await browser.url(await browser.testHandle.assetURL('instrumented.html', config()))
        .then(() => browser.waitForAgentLoad())

      await browser.pause(1000)
      const { events: resumedPayload } = await getSR()

      // payload was harvested, new vis change should trigger a new recording which includes a new full snapshot
      expect(resumedPayload.length).toBeGreaterThan(0)
      // type 2 payloads are snapshots
      expect(resumedPayload.filter(x => x.type === RRWEB_EVENT_TYPES.FullSnapshot).length).toEqual(1)

      await browser.closeWindow()
      await browser.switchToWindow((await browser.getWindowHandles())[0])
    })
  })

  describe('When session pauses', () => {
    withBrowsersMatching(supportsMultipleTabs)('should pause recording', async () => {
      await browser.url(await browser.testHandle.assetURL('instrumented.html', config()))
        .then(() => browser.waitForAgentLoad())

      await browser.testHandle.expectBlob(5000)

      const newTab = await browser.createWindow('tab')
      await browser.switchToWindow(newTab.handle)
      await browser.testHandle.scheduleReply('bamServer', {
        test: testRumRequest,
        body: JSON.stringify({
          stn: 1,
          err: 1,
          ins: 1,
          cap: 1,
          spa: 1,
          loaded: 1,
          sr: 1
        })
      })
      await Promise.all([
        browser.url(await browser.testHandle.assetURL('instrumented.html', { ...config(), loader: 'full' })),
        browser.waitForAgentLoad()
      ])

      // Waiting for the second blob should time out, indicating no second call to the BAM endpoint.
      // The wait must be longer than harvest interval.
      await browser.testHandle.expectBlob(6000, true)
      await browser.closeWindow()
      await browser.switchToWindow((await browser.getWindowHandles())[0])
    })
  })
})
