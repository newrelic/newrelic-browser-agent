import { testInsRequest } from '../../../tools/testing-server/utils/expect-tests'

describe('ins retry harvesting', () => {
  let insightsCapture

  beforeEach(async () => {
    insightsCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testInsRequest })
  })

  ;[408, 429, 500, 503].forEach(statusCode =>
    it(`should send the page action on the next harvest when the first harvest statusCode is ${statusCode}`, async () => {
      await browser.testHandle.scheduleReply('bamServer', {
        test: testInsRequest,
        permanent: true,
        statusCode
      })

      const [firstPageActionsHarvest] = await Promise.all([
        insightsCapture.waitForResult({ totalCount: 1 }),
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
        insightsCapture.waitForResult({ totalCount: 2 }),
        browser.execute(function () {
          newrelic.addPageAction('DummyEvent2', { free: 'more tacos' })
        })
      ])

      expect(firstPageActionsHarvest[0].reply.statusCode).toEqual(statusCode)
      expect(secondPageActionsHarvest[1].request.body.ins).toEqual(expect.arrayContaining(firstPageActionsHarvest[0].request.body.ins))
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
        insightsCapture.waitForResult({ totalCount: 1 }),
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
        insightsCapture.waitForResult({ totalCount: 2 }),
        browser.execute(function () {
          newrelic.addPageAction('DummyEvent2', { free: 'more tacos' })
        })
      ])

      expect(firstPageActionsHarvest[0].reply.statusCode).toEqual(statusCode)
      expect(secondPageActionsHarvest[1].request.body.ins).not.toEqual(expect.arrayContaining(firstPageActionsHarvest[0].request.body.ins))
    })
  )
})
