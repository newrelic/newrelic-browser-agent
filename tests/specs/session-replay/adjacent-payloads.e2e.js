import { config, decodeAttributes } from './helpers'

describe('errors', () => {
  beforeEach(async () => {
    await browser.enableSessionReplay()
  })

  afterEach(async () => {
    await browser.destroyAgentSession()
  })

  it('error timestamp should be contained within replay timestamp', async () => {
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({
      session_replay: { error_sampling_rate: 100, sampling_rate: 0 }
    })))
      .then(() => browser.waitForAgentLoad())

    await browser.testHandle.expectBlob(10000, true)

    const [errorPayload, blobPayload] = await Promise.all([
      await browser.testHandle.expectErrors(15000),
      await browser.testHandle.expectBlob(15000)
    ])

    const errorTimestamp = errorPayload.request.body.err[0].params.firstOccurrenceTimestamp
    const SRTimestamp = decodeAttributes(blobPayload.request.query.attributes)['replay.firstTimestamp']
    expect(errorTimestamp).toBeGreaterThan(SRTimestamp)
  })
})
