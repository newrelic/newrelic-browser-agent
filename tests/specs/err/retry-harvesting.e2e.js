import { testErrorsRequest } from '../../../tools/testing-server/utils/expect-tests'

describe('err retry harvesting', () => {
  [408, 429, 500, 503].forEach(statusCode =>
    it(`should send the error on the next harvest when the first harvest statusCode is ${statusCode}`, async () => {
      await browser.testHandle.scheduleReply('bamServer', {
        test: testErrorsRequest,
        permanent: true,
        statusCode
      })

      const [firstErrorsHarvest] = await Promise.all([
        browser.testHandle.expectErrors(),
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
        browser.testHandle.expectErrors(),
        browser.execute(function () {
          newrelic.noticeError(new Error('hippo hangry 2'))
        })
      ])

      expect(firstErrorsHarvest.reply.statusCode).toEqual(statusCode)
      expect(secondErrorsHarvest.request.body.err).toEqual(expect.arrayContaining(firstErrorsHarvest.request.body.err))
    })
  );

  [400, 404, 502, 504, 512].forEach(statusCode =>
    it(`should not send the error on the next harvest when the first harvest statusCode is ${statusCode}`, async () => {
      await browser.testHandle.scheduleReply('bamServer', {
        test: testErrorsRequest,
        permanent: true,
        statusCode
      })

      const [firstErrorsHarvest] = await Promise.all([
        browser.testHandle.expectErrors(),
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
        browser.testHandle.expectErrors(),
        browser.execute(function () {
          newrelic.noticeError(new Error('hippo hangry 2'))
        })
      ])

      expect(firstErrorsHarvest.reply.statusCode).toEqual(statusCode)
      expect(secondErrorsHarvest.request.body.err).not.toEqual(expect.arrayContaining(firstErrorsHarvest.request.body.err))
    })
  )
})
