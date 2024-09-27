import { stConfig, testExpectedTrace } from '../util/helpers'
import { testBlobTraceRequest } from '../../../tools/testing-server/utils/expect-tests'

describe('STN Payload metadata checks', () => {
  let sessionTraceCapture

  beforeEach(async () => {
    sessionTraceCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testBlobTraceRequest })
  })

  afterEach(async () => {
    await browser.destroyAgentSession()
  })

  it('does not run if cookies_enabled is false', async () => {
    const [sessionTraceHarvests] = await Promise.all([
      sessionTraceCapture.waitForResult({ timeout: 10000 }),
      browser.url(await browser.testHandle.assetURL('instrumented.html', { init: { privacy: { cookies_enabled: false } } }))
        .then(() => browser.waitForAgentLoad())
    ])

    expect(sessionTraceHarvests.length).toBe(0)
  })

  it('adds metadata query attrs', async () => {
    const [[{ request }]] = await Promise.all([
      sessionTraceCapture.waitForResult({ totalCount: 1 }),
      browser.url(await browser.testHandle.assetURL('instrumented.html', stConfig()))
        .then(() => browser.waitForAgentLoad())
    ])

    const firstTimestampOffset = request.body.reduce((acc, next) => (next.s < acc) ? next.s : acc, Infinity)
    const lastTimestampOffset = request.body.reduce((acc, next) => (next.e > acc) ? next.e : acc, 0)
    // first session harvest is not reported if session is disabled
    testExpectedTrace({
      data: request,
      nodeCount: request.body.length,
      firstTimestampOffset,
      lastTimestampOffset,
      firstSessionHarvest: true
    })
  })
})
