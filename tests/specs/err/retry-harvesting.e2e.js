import { testErrorsRequest } from '../../../tools/testing-server/utils/expect-tests'

describe('err retry harvesting', () => {
  let errorsCapture

  beforeEach(async () => {
    errorsCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testErrorsRequest })
  })

  ;[408, 429, 500, 503].forEach(statusCode =>
    it(`should send the error on the next harvest when the first harvest statusCode is ${statusCode}`, async () => {
      await browser.testHandle.scheduleReply('bamServer', {
        test: testErrorsRequest,
        permanent: true,
        statusCode
      })

      const [firstErrorsHarvest] = await Promise.all([
        errorsCapture.waitForResult({ totalCount: 1 }),
        browser.url(await browser.testHandle.assetURL('instrumented.html'))
          .then(() => browser.waitForAgentLoad())
          .then(() => browser.execute(function () {
            newrelic.noticeError(new Error('hippo hangry'))
          }))
      ])

      // Pause a bit for browsers built-in automated retry logic crap
      await browser.pause(500)
      await browser.testHandle.clearScheduledReplies('bamServer')

      const [secondErrorsHarvest] = await Promise.all([
        errorsCapture.waitForResult({ totalCount: 2 }),
        browser.execute(function () {
          newrelic.noticeError(new Error('hippo hangry 2'))
        })
      ])

      expect(firstErrorsHarvest[0].reply.statusCode).toEqual(statusCode)
      expect(secondErrorsHarvest[1].request.body.err).toEqual(expect.arrayContaining(firstErrorsHarvest[0].request.body.err))
    })
  )

  ;[400, 404, 502, 504, 512].forEach(statusCode =>
    it(`should not send the error on the next harvest when the first harvest statusCode is ${statusCode}`, async () => {
      await browser.testHandle.scheduleReply('bamServer', {
        test: testErrorsRequest,
        permanent: true,
        statusCode
      })

      const [firstErrorsHarvest] = await Promise.all([
        errorsCapture.waitForResult({ totalCount: 1 }),
        browser.url(await browser.testHandle.assetURL('instrumented.html'))
          .then(() => browser.waitForAgentLoad())
          .then(() => browser.execute(function () {
            newrelic.noticeError(new Error('hippo hangry'))
          }))
      ])

      // Pause a bit for browsers built-in automated retry logic crap
      await browser.pause(500)
      await browser.testHandle.clearScheduledReplies('bamServer')

      const [secondErrorsHarvest] = await Promise.all([
        errorsCapture.waitForResult({ totalCount: 2 }),
        browser.execute(function () {
          newrelic.noticeError(new Error('hippo hangry 2'))
        })
      ])

      expect(firstErrorsHarvest[0].reply.statusCode).toEqual(statusCode)
      expect(secondErrorsHarvest[1].request.body.err).not.toEqual(expect.arrayContaining(firstErrorsHarvest[0].request.body.err))
    })
  )
})
