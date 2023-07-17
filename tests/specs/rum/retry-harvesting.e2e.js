import { testAjaxEventsRequest, testAjaxTimeSlicesRequest, testInsRequest, testInteractionEventsRequest, testResourcesRequest, testRumRequest, testTimingEventsRequest } from '../../../tools/testing-server/utils/expect-tests'

describe('rum retry harvesting', () => {
  [400, 404, 408, 429, 500, 502, 503, 504, 512].forEach(statusCode => {
    it(`should not retry rum and should not continue harvesting when request statusCode is ${statusCode}`, async () => {
      await browser.testHandle.scheduleReply('bamServer', {
        test: testRumRequest,
        permanent: true,
        statusCode,
        body: ''
      })

      const [
        resourcesResults,
        interactionResults,
        timingsResults,
        ajaxSliceResults,
        ajaxEventsResults,
        insResults,
        rumResults
      ] = await Promise.all([
        browser.testHandle.expectResources(10000, true),
        browser.testHandle.expectInteractionEvents(10000, true),
        browser.testHandle.expectTimings(10000, true),
        browser.testHandle.expectAjaxTimeSlices(10000, true),
        browser.testHandle.expectAjaxEvents(10000, true),
        browser.testHandle.expectIns(10000, true),
        browser.testHandle.expectRum(),
        browser.url(await browser.testHandle.assetURL('obfuscate-pii.html'))
          .then(() => $('a').click())
      ])

      // Uncomment this code to reproduce the issue described in https://issues.newrelic.com/browse/NEWRELIC-9348
      // Leave uncommented once that ticket is worked
      // await browser.pause(500)

      // await browser.execute(function () {
      //   newrelic.noticeError(new Error('hippo hangry'))
      //   newrelic.addPageAction('DummyEvent', { free: 'tacos' })
      // })

      // await Promise.all([
      //   browser.testHandle.expectTimings(10000, true),
      //   browser.testHandle.expectAjaxEvents(10000, true),
      //   browser.testHandle.expectMetrics(10000, true),
      //   browser.testHandle.expectErrors(10000, true),
      //   browser.testHandle.expectResources(10000, true),
      //   browser.url(await browser.testHandle.assetURL('/'))
      // ])

      expect(rumResults.reply.statusCode).toEqual(statusCode)
      expect(resourcesResults).toBeUndefined()
      expect(interactionResults).toBeUndefined()
      expect(timingsResults).toBeUndefined()
      expect(ajaxSliceResults).toBeUndefined()
      expect(ajaxEventsResults).toBeUndefined()
      expect(insResults).toBeUndefined()
    })
  })
})
