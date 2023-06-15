import { testInsRequest } from '../../../tools/testing-server/utils/expect-tests'

describe('ins retry harvesting', () => {
  [408, 429, 500, 503].forEach(statusCode =>
    it(`should send the page action on the next harvest when the first harvest statusCode is ${statusCode}`, async () => {
      await browser.testHandle.scheduleReply('bamServer', {
        test: testInsRequest,
        permanent: true,
        statusCode
      })

      const [firstPageActionsHarvest] = await Promise.all([
        browser.testHandle.expectIns(),
        browser.url(await browser.testHandle.assetURL('instrumented.html'))
          .then(() => browser.waitForAgentLoad())
          .then(() => browser.execute(function () {
            newrelic.addPageAction('DummyEvent', { free: 'tacos' })
          }))
      ])

      // Pause a bit for browsers built-in automated retry logic crap
      await browser.pause(500)
      await browser.testHandle.clearScheduledReplies('bamServer')

      const [secondPageActionsHarvest] = await Promise.all([
        browser.testHandle.expectIns(),
        browser.execute(function () {
          newrelic.addPageAction('DummyEvent2', { free: 'more tacos' })
        })
      ])

      expect(firstPageActionsHarvest.reply.statusCode).toEqual(statusCode)
      expect(secondPageActionsHarvest.request.body.ins).toEqual(expect.arrayContaining(firstPageActionsHarvest.request.body.ins))
    })
  );

  [400, 404, 502, 504, 512].forEach(statusCode =>
    it(`should not send the page action on the next harvest when the first harvest statusCode is ${statusCode}`, async () => {
      await browser.testHandle.scheduleReply('bamServer', {
        test: testInsRequest,
        permanent: true,
        statusCode
      })

      const [firstPageActionsHarvest] = await Promise.all([
        browser.testHandle.expectIns(),
        browser.url(await browser.testHandle.assetURL('instrumented.html'))
          .then(() => browser.waitForAgentLoad())
          .then(() => browser.execute(function () {
            newrelic.addPageAction('DummyEvent', { free: 'tacos' })
          }))
      ])

      // Pause a bit for browsers built-in automated retry logic crap
      await browser.pause(500)
      await browser.testHandle.clearScheduledReplies('bamServer')

      const [secondPageActionsHarvest] = await Promise.all([
        browser.testHandle.expectIns(),
        browser.execute(function () {
          newrelic.addPageAction('DummyEvent2', { free: 'more tacos' })
        })
      ])

      expect(firstPageActionsHarvest.reply.statusCode).toEqual(statusCode)
      expect(secondPageActionsHarvest.request.body.ins).not.toEqual(expect.arrayContaining(firstPageActionsHarvest.request.body.ins))
    })
  )
})
