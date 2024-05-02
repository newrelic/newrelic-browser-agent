import { notIE } from '../../../tools/browser-matcher/common-matchers.mjs'
import { config, decodeAttributes } from './helpers'

describe.withBrowsersMatching(notIE)('Adjacent Payloads', () => {
  describe('JSErrors', () => {
    beforeEach(async () => {
      await browser.enableSessionReplay()
    })

    afterEach(async () => {
      await browser.destroyAgentSession()
    })

    it('error timestamp should be contained within replay timestamp', async function () {
      await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({
        session_replay: { error_sampling_rate: 100, sampling_rate: 0 }
      }, this.test)))
        .then(() => browser.waitForAgentLoad())

      // this issue was seen when some time had passed from agg load time and was running in error mode
      await browser.pause(5000)

      const [errorPayload, blobPayload] = await Promise.all([
        browser.testHandle.expectErrors(10000),
        browser.testHandle.expectBlob(10000),
        browser.execute(function () {
          newrelic.noticeError(new Error('test'))
          document.querySelector('#err').classList.remove('hidden')
        })
      ])

      const errorTimestamp = errorPayload.request.body.err[0].params.firstOccurrenceTimestamp
      const SRTimestamp = decodeAttributes(blobPayload.request.query.attributes)['replay.firstTimestamp']
      expect(errorTimestamp).toBeGreaterThan(SRTimestamp)
      expect(errorPayload.request.body.err[0].params.hasReplay).toEqual(true)
    })

    it('error should have hasReplay removed when preloaded but not autostarted', async function () {
      await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({
        session_replay: { preload: true, error_sampling_rate: 0, sampling_rate: 100, autoStart: false }
      }, this.test)))
        .then(() => browser.waitForAgentLoad())

      // this issue was seen when some time had passed from agg load time and was running in error mode
      await browser.pause(5000)

      const [errorPayload] = await Promise.all([
        browser.testHandle.expectErrors(10000),
        browser.execute(function () {
          newrelic.noticeError(new Error('test'))
          document.querySelector('#err').classList.remove('hidden')
        })
      ])

      expect(errorPayload.request.body.err[0].params.hasReplay).toBeUndefined()
    })
  })
})
