import { testInteractionEventsRequest } from '../../../tools/testing-server/utils/expect-tests'

describe.skip('retry harvesting', () => {
  let interactionsCapture

  beforeEach(async () => {
    interactionsCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testInteractionEventsRequest })
  })

  ;[408, 429, 500, 502, 504, 520].forEach(statusCode =>
    it(`should send the interaction on the next harvest when the first harvest statusCode is ${statusCode}`, async () => {
      await browser.testHandle.scheduleReply('bamServer', {
        test: testInteractionEventsRequest,
        permanent: true,
        statusCode
      })

      const [firstInteractionEventHarvest] = await Promise.all([
        interactionsCapture.waitForResult({ totalCount: 1 }),
        browser.url(await browser.testHandle.assetURL('instrumented.html'))
          .then(() => browser.waitForAgentLoad())
      ])

      // Pause a bit for browsers built-in automated retry logic crap
      await browser.pause(500)
      await browser.testHandle.clearScheduledReplies('bamServer')

      const [secondInteractionEventHarvest] = await Promise.all([
        interactionsCapture.waitForResult({ totalCount: 2 }),
        await browser.execute(function () {
          newrelic.interaction().setName('interaction1').save().end()
        })
      ])

      expect(firstInteractionEventHarvest[0].reply.statusCode).toEqual(statusCode)
      expect(secondInteractionEventHarvest[1].request.body).toEqual(expect.arrayContaining(firstInteractionEventHarvest[0].request.body))
    })
  )

  ;[400, 404].forEach(statusCode =>
    it(`should not send the page action on the next harvest when the first harvest statusCode is ${statusCode}`, async () => {
      await browser.testHandle.scheduleReply('bamServer', {
        test: testInteractionEventsRequest,
        permanent: true,
        statusCode
      })

      const [firstInteractionEventHarvest] = await Promise.all([
        interactionsCapture.waitForResult({ totalCount: 1 }),
        browser.url(await browser.testHandle.assetURL('instrumented.html'))
          .then(() => browser.waitForAgentLoad())
      ])

      // Pause a bit for browsers built-in automated retry logic crap
      await browser.pause(500)
      await browser.testHandle.clearScheduledReplies('bamServer')

      const [secondInteractionEventHarvest] = await Promise.all([
        interactionsCapture.waitForResult({ totalCount: 2 }),
        await browser.execute(function () {
          newrelic.interaction().setName('interaction1').save().end()
        })
      ])

      expect(firstInteractionEventHarvest[0].reply.statusCode).toEqual(statusCode)
      expect(secondInteractionEventHarvest[1].request.body).not.toEqual(expect.arrayContaining(firstInteractionEventHarvest[0].request.body))
    })
  )
})
