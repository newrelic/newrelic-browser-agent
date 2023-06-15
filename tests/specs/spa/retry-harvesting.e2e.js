import { testInteractionEventsRequest } from '../../../tools/testing-server/utils/expect-tests'

const config = {
  init: {
    harvest: {
      /*
      Interaction harvesting does not use any of the delay settings from the harvest module. It should
      just put the interactions in the next harvest. Setting this value a little higher than the default
      harvest time to verify it's not being used.
      */
      tooManyRequestsDelay: 10
    }
  }
}

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
        browser.url(await browser.testHandle.assetURL('instrumented.html', config))
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

      const firstHarvestTime = Number(firstInteractionEventHarvest.request.query.rst)
      const secondHarvestTime = Number(secondInteractionEventHarvest.request.query.rst)
      expect(secondHarvestTime).toBeWithin(firstHarvestTime + 5000, firstHarvestTime + 10000)
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
        browser.url(await browser.testHandle.assetURL('instrumented.html', config))
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

      const firstHarvestTime = Number(firstInteractionEventHarvest.request.query.rst)
      const secondHarvestTime = Number(secondInteractionEventHarvest.request.query.rst)
      expect(secondHarvestTime).toBeGreaterThan(firstHarvestTime)
    })
  )
})
