import { notIE } from '../../../tools/browser-matcher/common-matchers.mjs'
import { config, decodeAttributes } from './helpers'

describe('errors', () => {
  beforeEach(async () => {
    await browser.enableSessionReplay()
  })

  afterEach(async () => {
    await browser.destroyAgentSession()
  })

  it.withBrowsersMatching(notIE)('error timestamp should be contained within replay timestamp', async () => {
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({
      session_replay: { error_sampling_rate: 100, sampling_rate: 0 }
    })))
      .then(() => browser.waitForAgentLoad())

    // this issue was seen when some time had passed from agg load time and was running in error mode
    await browser.pause(5000)

    const [errorPayload, blobPayload] = await Promise.all([
      browser.testHandle.expectErrors(10000),
      browser.testHandle.expectBlob(10000),
      browser.execute(function () {
        newrelic.noticeError(new Error('test'))
      })
    ])

    const errorTimestamp = errorPayload.request.body.err[0].params.firstOccurrenceTimestamp
    const SRTimestamp = decodeAttributes(blobPayload.request.query.attributes)['replay.firstTimestamp']
    expect(errorTimestamp).toBeGreaterThan(SRTimestamp)
  })
})
