import { testBlobRequest, testBlobTraceRequest } from '../../../tools/testing-server/utils/expect-tests'
import { stConfig, testExpectedTrace } from '../util/helpers'

describe('stn retry harvesting', () => {
  let sessionTraceCapture

  beforeEach(async () => {
    sessionTraceCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testBlobTraceRequest })
  })

  ;[408, 429, 500, 503].forEach(statusCode =>
    it(`should send the session trace on the next harvest when the first harvest statusCode is ${statusCode}`, async () => {
      await browser.testHandle.scheduleReply('bamServer', {
        test: testBlobRequest,
        permanent: true,
        statusCode
      })

      let [sessionTraceHarvests] = await Promise.all([
        sessionTraceCapture.waitForResult({ timeout: 10000 }),
        browser.url(await browser.testHandle.assetURL('stn/instrumented.html', stConfig()))
      ])

      sessionTraceHarvests.forEach(harvest => expect(harvest.reply.statusCode).toEqual(statusCode))

      // Pause a bit for browsers built-in automated retry logic crap
      await browser.pause(500)
      await browser.testHandle.clearScheduledReplies('bamServer')

      sessionTraceHarvests = await sessionTraceCapture.waitForResult({ timeout: 10000 })
      const successSessionTraceHarvests = sessionTraceHarvests.filter(harvest => harvest.reply.statusCode !== statusCode)

      expect(successSessionTraceHarvests.length).toBeGreaterThan(0)
      expect(successSessionTraceHarvests[0].request.body).toEqual(expect.arrayContaining(sessionTraceHarvests[0].request.body))
      successSessionTraceHarvests.forEach(harvest => testExpectedTrace({ data: harvest.request }))
    })
  )
})
