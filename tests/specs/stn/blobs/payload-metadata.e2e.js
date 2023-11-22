import { stConfig, testExpectedTrace } from '../../util/helpers'

describe('STN Payload metadata checks', () => {
  it('does not run if cookies_enabled is false', async () => {
    const request = await browser.url(await browser.testHandle.assetURL('instrumented-stv2-flags.html'))
      .then(() => browser.testHandle.expectTrace(10000, true))

    expect(request).toBeFalsy()
  })

  it('adds metadata query attrs', async () => {
    const { request } = await browser.url(await browser.testHandle.assetURL('instrumented-stv2-flags.html', stConfig()))
      .then(() => browser.testHandle.expectTrace())

    const firstTimestampOffset = request.body.reduce((acc, next) => (next.s < acc) ? next.s : acc, Infinity)
    const lastTimestampOffset = request.body.reduce((acc, next) => (next.e > acc) ? next.e : acc, 0)
    // first session harvest is not reported if session is disabled
    testExpectedTrace({ data: request, nodeCount: request.body.length, firstTimestampOffset, lastTimestampOffset, firstSessionHarvest: true })
  })
})
