const config = {
  loader: 'experimental',
  init: {
    privacy: { cookies_enabled: true },
    session_replay: { enabled: true, harvestTimeSeconds: 5, sampleRate: 1, errorSampleRate: 0 }
  }
}

/** The "mode" with which the session replay is recording */
const MODE = {
  OFF: 0,
  FULL: 1,
  ERROR: 2
}

export default function () {
  describe('session manager state behavior', () => {
    afterEach(async () => {
      await browser.destroyAgentSession(browser.testHandle)
    })

    describe('session manager mode matches session replay instance mode', () => {
      it('should match in full mode', async () => {
        await browser.url(await browser.testHandle.assetURL('instrumented.html', config))
          .then(() => browser.waitForAgentLoad())

        const { agentSessions } = await browser.getAgentSessionInfo()
        const sessionClass = Object.values(agentSessions)[0]
        expect(sessionClass.sessionReplay).toEqual(MODE.FULL)
      })

      it('should match in error mode', async () => {
        await browser.url(await browser.testHandle.assetURL('instrumented.html', { ...config, init: { ...config.init, session_replay: { enabled: true, harvestTimeSeconds: 5, errorSampleRate: 1, sampleRate: 0 } } }))
          .then(() => browser.waitForAgentLoad())

        const { agentSessions } = await browser.getAgentSessionInfo()
        const sessionClass = Object.values(agentSessions)[0]
        expect(sessionClass.sessionReplay).toEqual(MODE.ERROR)
      })

      it('should match in off mode', async () => {
        await browser.url(await browser.testHandle.assetURL('instrumented.html', { ...config, init: { ...config.init, session_replay: { enabled: true, harvestTimeSeconds: 5, errorSampleRate: 0, sampleRate: 0 } } }))
          .then(() => browser.waitForAgentLoad())

        const { agentSessions } = await browser.getAgentSessionInfo()
        const sessionClass = Object.values(agentSessions)[0]
        expect(sessionClass.sessionReplay).toEqual(MODE.OFF)
      })
    })

    describe('When session ends', () => {
      it('should end recording and unload', async () => {
        await browser.url(await browser.testHandle.assetURL('instrumented.html', {
          ...config,
          init: {
            ...config.init,
            // harvest intv longer than the session expiry time
            session_replay: { enabled: true, harvestTimeSeconds: 10, errorSampleRate: 0, sampleRate: 1 },
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
  })
}
