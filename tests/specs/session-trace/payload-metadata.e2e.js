import { stConfig, testExpectedTrace } from '../util/helpers'

describe('STN Payload metadata checks', () => {
  afterEach(async () => {
    await browser.destroyAgentSession()
  })

  it('does not run if cookies_enabled is false', async () => {
    const request = await browser.url(await browser.testHandle.assetURL('instrumented.html', { init: { privacy: { cookies_enabled: false } } }))
      .then(() => browser.testHandle.expectTrace(10000, true))

    expect(request).toBeFalsy()
  })

  it('adds metadata query attrs', async () => {
    const [{ request }] = await Promise.all([
      browser.testHandle.expectTrace(),
      browser.url(await browser.testHandle.assetURL('instrumented.html', stConfig()))
    ])

    const firstTimestampOffset = request.body.reduce((acc, next) => (next.s < acc) ? next.s : acc, Infinity)
    const lastTimestampOffset = request.body.reduce((acc, next) => (next.e > acc) ? next.e : acc, 0)
    // first session harvest is not reported if session is disabled
    testExpectedTrace({ data: request, nodeCount: request.body.length, firstTimestampOffset, lastTimestampOffset, firstSessionHarvest: true })
  })
})
