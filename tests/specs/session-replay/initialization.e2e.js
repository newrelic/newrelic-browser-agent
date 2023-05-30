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
    afterEach(() => {
      browser.destroyAgentSession()
    })

    describe('session manager mode matches session replay instance mode', () => {
      it('should match in full mode', async () => {
        await browser.url(await browser.testHandle.assetURL('session-entity.html', config))
          .then(() => browser.waitForAgentLoad())

        const { localStorage } = await browser.getAgentSessionInfo()

        expect(localStorage.sessionReplay).toEqual(MODE.FULL)
      })
    })
  })
}
