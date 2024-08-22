import { srConfig, decodeAttributes } from '../util/helpers'
import { testBlobReplayRequest, testErrorsRequest } from '../../../tools/testing-server/utils/expect-tests'

describe('Adjacent Payloads', () => {
  describe('JSErrors', () => {
    let errorsCapture
    let sessionReplaysCapture

    beforeEach(async () => {
      [errorsCapture, sessionReplaysCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
        { test: testErrorsRequest },
        { test: testBlobReplayRequest }
      ])
      await browser.enableSessionReplay(0, 100)
    })

    afterEach(async () => {
      await browser.destroyAgentSession()
    })

    it('error timestamp should be contained within replay timestamp', async () => {
      await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig()))
        .then(() => browser.waitForAgentLoad())

      // this issue was seen when some time had passed from agg load time and was running in error mode
      await browser.pause(5000)

      const [errorsHarvests, sessionReplaysHarvests] = await Promise.all([
        errorsCapture.waitForResult({ timeout: 10000 }),
        sessionReplaysCapture.waitForResult({ timeout: 10000 }),
        browser.execute(function () {
          newrelic.noticeError(new Error('test'))
        })
      ])

      expect(errorsHarvests.length).toEqual(1)

      const errorTimestamp = errorsHarvests[0].request.body.err[0].params.firstOccurrenceTimestamp
      const SRTimestamp = decodeAttributes(sessionReplaysHarvests[0].request.query.attributes)['replay.firstTimestamp']
      expect(errorTimestamp).toBeGreaterThan(SRTimestamp)
      expect(errorsHarvests[0].request.body.err[0].params.hasReplay).toEqual(true)
    })

    it('error should have hasReplay removed when preloaded but not autostarted', async () => {
      await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig({
        session_replay: { preload: true, autoStart: false }
      }))).then(() => browser.waitForAgentLoad())

      // this issue was seen when some time had passed from agg load time and was running in error mode
      await browser.pause(5000)

      const [errorsHarvests, sessionReplaysHarvests] = await Promise.all([
        errorsCapture.waitForResult({ timeout: 10000 }),
        sessionReplaysCapture.waitForResult({ timeout: 10000 }),
        browser.execute(function () {
          newrelic.noticeError(new Error('test'))
        })
      ])

      expect(errorsHarvests.length).toEqual(1)
      expect(errorsHarvests[0].request.body.err[0].params.hasReplay).toBeUndefined()
      expect(sessionReplaysHarvests.length).toEqual(0)
    })
  })
})
