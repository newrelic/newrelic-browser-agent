import { srConfig, decodeAttributes } from '../util/helpers'

describe('errors', () => {
  afterEach(async () => {
    await browser.destroyAgentSession()
  })

  it('error timestamp should be contained within replay timestamp', async () => {
    await browser.enableSessionReplay(0, 100)
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig()))
      .then(() => browser.waitForAgentLoad())

    // this issue was seen when some time had passed from agg load time and was running in error mode
    await browser.pause(5000)

    const [errorPayload, blobPayload] = await Promise.all([
      browser.testHandle.expectErrors(10000),
      browser.testHandle.expectReplay(10000),
      browser.execute(function () {
        newrelic.noticeError(new Error('test'))
      })
    ])

    const errorTimestamp = errorPayload.request.body.err[0].params.firstOccurrenceTimestamp
    const SRTimestamp = decodeAttributes(blobPayload.request.query.attributes)['replay.firstTimestamp']
    expect(errorTimestamp).toBeGreaterThan(SRTimestamp)
  })
})
