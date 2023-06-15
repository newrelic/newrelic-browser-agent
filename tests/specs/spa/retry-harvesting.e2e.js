import { testInteractionEventsRequest } from '../../../tools/testing-server/utils/expect-tests'

describe('retry harvesting', () => {
  [408, 429, 500, 503].forEach(statusCode =>
    it(`should send the interaction on the next harvest when the first harvest statusCode is ${statusCode}`, async () => {
      await browser.testHandle.scheduleReply('bamServer', {
        test: testInteractionEventsRequest,
        permanent: true,
        statusCode
      })

      const [firstInteractionEventHarvest] = await Promise.all([
        browser.testHandle.expectInteractionEvents(),
        browser.url(await browser.testHandle.assetURL('instrumented.html'))
          .then(() => browser.waitForAgentLoad())
      ])

      // Pause a bit for browsers built-in automated retry logic crap
      await browser.pause(500)
      await browser.testHandle.clearScheduledReplies('bamServer')

      const [secondInteractionEventHarvest] = await Promise.all([
        browser.testHandle.expectInteractionEvents(),
        await browser.execute(function () {
          newrelic.interaction().setName('interaction1').save().end()
        })
      ])

      expect(firstInteractionEventHarvest.reply.statusCode).toEqual(statusCode)
      expect(secondInteractionEventHarvest.request.body).toEqual(expect.arrayContaining(firstInteractionEventHarvest.request.body))
    })
  );

  [400, 404, 502, 504, 512].forEach(statusCode =>
    it(`should not send the page action on the next harvest when the first harvest statusCode is ${statusCode}`, async () => {
      await browser.testHandle.scheduleReply('bamServer', {
        test: testInteractionEventsRequest,
        permanent: true,
        statusCode
      })

      const [firstInteractionEventHarvest] = await Promise.all([
        browser.testHandle.expectInteractionEvents(),
        browser.url(await browser.testHandle.assetURL('instrumented.html'))
          .then(() => browser.waitForAgentLoad())
      ])

      // Pause a bit for browsers built-in automated retry logic crap
      await browser.pause(500)
      await browser.testHandle.clearScheduledReplies('bamServer')

      const [secondInteractionEventHarvest] = await Promise.all([
        browser.testHandle.expectInteractionEvents(),
        await browser.execute(function () {
          newrelic.interaction().setName('interaction1').save().end()
        })
      ])

      expect(firstInteractionEventHarvest.reply.statusCode).toEqual(statusCode)
      expect(secondInteractionEventHarvest.request.body).not.toEqual(expect.arrayContaining(firstInteractionEventHarvest.request.body))
    })
  )
})
