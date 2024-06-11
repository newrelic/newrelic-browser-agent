import { testRumRequest } from '../../../tools/testing-server/utils/expect-tests'
import { browserClick } from '../util/helpers'

describe('rum retry harvesting', () => {
  [400, 404, 408, 429, 500, 502, 503, 504, 512].forEach(statusCode => {
    it(`should not retry rum and should not continue harvesting when request statusCode is ${statusCode}`, async () => {
      await browser.testHandle.scheduleReply('bamServer', {
        test: testRumRequest,
        permanent: true,
        statusCode,
        body: ''
      })

      const expects = Promise.all([
        browser.testHandle.expectTrace(10000, true),
        browser.testHandle.expectInteractionEvents(10000, true),
        browser.testHandle.expectTimings(10000, true),
        browser.testHandle.expectAjaxTimeSlices(10000, true),
        browser.testHandle.expectAjaxEvents(10000, true),
        browser.testHandle.expectIns(10000, true),
        browser.testHandle.expectRum()
      ])
      await browser.url(await browser.testHandle.assetURL('obfuscate-pii.html'))
      await browserClick('a')

      const [
        resourcesResults,
        interactionResults,
        timingsResults,
        ajaxSliceResults,
        ajaxEventsResults,
        insResults,
        rumResults
      ] = await expects
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
