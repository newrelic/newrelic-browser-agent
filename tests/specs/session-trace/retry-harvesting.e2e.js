import { testBlobRequest, testBlobTraceRequest } from '../../../tools/testing-server/utils/expect-tests'
import { stConfig, testExpectedTrace } from '../util/helpers'

describe('stn retry harvesting', () => {
  let sessionTraceCapture

  beforeEach(async () => {
    sessionTraceCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testBlobTraceRequest })
  })

  ;[408, 429, 500, 502, 504, 520].forEach(statusCode =>
    it(`should send the session trace on the next harvest when the first harvest statusCode is ${statusCode}`, async () => {
      await browser.testHandle.scheduleReply('bamServer', {
        test: testBlobRequest,
        permanent: false,
        statusCode
      })

      let [sessionTraceHarvests] = await Promise.all([
        sessionTraceCapture.waitForResult({ totalCount: 1 }),
        browser.url(await browser.testHandle.assetURL('stn/instrumented.html', stConfig()))
      ])

      await browser.pause(500)
      await browser.testHandle.clearScheduledReplies('bamServer')

      sessionTraceHarvests = await sessionTraceCapture.waitForResult({ timeout: 6000 })
      const failureSessionTraceHarvests = sessionTraceHarvests.filter(harvest => harvest.reply.statusCode === statusCode)
      const successSessionTraceHarvests = sessionTraceHarvests.filter(harvest => harvest.reply.statusCode !== statusCode)

      expect(failureSessionTraceHarvests.length).toBeGreaterThan(0)
      expect(successSessionTraceHarvests.length).toBeGreaterThanOrEqual(failureSessionTraceHarvests.length)

      expect(failureSessionTraceHarvests[0].request.body.every(failedNode => {
        return !!successSessionTraceHarvests.find(successHarvest => successHarvest.request.body.find(successNode => {
          return successNode.n === failedNode.n && successNode.t === failedNode.t
        }))
      })).toBe(true)

      successSessionTraceHarvests.forEach(harvest => testExpectedTrace({ data: harvest.request }))
    })
  )
})
