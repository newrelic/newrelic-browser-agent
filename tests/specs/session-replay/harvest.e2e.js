import { config, getSR } from './helpers'

export default (function () {
  describe('Session Replay Harvest Behavior', () => {
    afterEach(async () => {
      await browser.destroyAgentSession(browser.testHandle)
    })

    it('Should harvest early if exceeds preferred size', async () => {
      const startTime = Date.now()
      const [{ request: blobHarvest }] = await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({ harvestTimeSeconds: 60 })))
        .then(() => Promise.all([
          browser.testHandle.expectBlob(),
          // preferred size = 64kb, compression estimation is 88%
          browser.execute(function () {
            Object.values(newrelic.initializedAgents)[0].features.session_replay.featAggregate.payloadBytesEstimation = 64000 / 0.12
          }),
          browser.testHandle.expectRum()
        ]))

      expect(blobHarvest.body.blob.length).toBeGreaterThan(0)
      expect(Date.now() - startTime).toBeLessThan(60000)
    })

    it('Should abort if exceeds maximum size', async () => {
      const startTime = Date.now()
      await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({ harvestTimeSeconds: 60 })))
        .then(() => Promise.all([
          // preferred size = 64kb, compression estimation is 88%
          browser.execute(function () {
            Object.values(newrelic.initializedAgents)[0].features.session_replay.featAggregate.payloadBytesEstimation = 1000001 / 0.12
          }),
          browser.waitForAgentLoad()
        ]))
      expect((await getSR())).toEqual(expect.objectContaining({
        blocked: true,
        events: [],
        initialized: true,
        mode: 0
      }))
      expect(Date.now() - startTime).toBeLessThan(60000)
    })
  })
})()