import { testBlobRequest } from '../../../../tools/testing-server/utils/expect-tests'
import { stConfig, testExpectedTrace } from '../../util/helpers'

describe('stn retry harvesting', () => {
  [408, 429, 500, 503].forEach(statusCode =>
    it(`should send the session trace on the next harvest when the first harvest statusCode is ${statusCode}`, async () => {
      await browser.testHandle.scheduleReply('bamServer', {
        test: testBlobRequest,
        permanent: true,
        statusCode
      })

      const [firstResourcesHarvest] = await Promise.all([
        browser.testHandle.expectTrace(),
        browser.url(await browser.testHandle.assetURL('stn/instrumented.html', stConfig()))
      ])

      // // Pause a bit for browsers built-in automated retry logic crap
      await browser.pause(500)
      await browser.testHandle.clearScheduledReplies('bamServer')

      await browser.testHandle.scheduleReply('bamServer', {
        test: testBlobRequest,
        permanent: true
      })

      const secondResourcesHarvest = await browser.testHandle.expectTrace()

      expect(firstResourcesHarvest.reply.statusCode).toEqual(statusCode)
      expect(secondResourcesHarvest.request.body).toEqual(expect.arrayContaining(firstResourcesHarvest.request.body))
      testExpectedTrace({ data: secondResourcesHarvest.request })
    })
  );

  [400, 404, 502, 504, 512].forEach(statusCode =>
    it(`should not send the session trace on the next harvest when the first harvest statusCode is ${statusCode}`, async () => {
      await browser.testHandle.scheduleReply('bamServer', {
        test: testBlobRequest,
        permanent: true,
        statusCode
      })

      const [firstResourcesHarvest] = await Promise.all([
        browser.testHandle.expectTrace(),
        browser.url(await browser.testHandle.assetURL('stn/instrumented.html', stConfig({ privacy: { cookies_enabled: true } })))
          .then(() => browser.waitForAgentLoad())
      ])
      expect(firstResourcesHarvest.reply.statusCode).toEqual(statusCode)
      await expect(browser.testHandle.expectTrace(10000, true)).resolves.toBeUndefined()
    })
  )
})
