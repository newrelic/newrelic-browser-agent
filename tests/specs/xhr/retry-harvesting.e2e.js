import { testAjaxEventsRequest, testAjaxTimeSlicesRequest } from '../../../tools/testing-server/utils/expect-tests'

describe('xhr retry harvesting', () => {
  [408, 429, 500, 503].forEach(statusCode =>
    it(`should send the ajax event and time slice on the next harvest when the first harvest statusCode is ${statusCode}`, async () => {
      await browser.testHandle.scheduleReply('bamServer', {
        test: testAjaxEventsRequest,
        permanent: true,
        statusCode
      })
      await browser.testHandle.scheduleReply('bamServer', {
        test: testAjaxTimeSlicesRequest,
        permanent: true,
        statusCode
      })

      const [firstAjaxEventsHarvest, firstAjaxTimeSlicesHarvest] = await Promise.all([
        browser.testHandle.expectAjaxEvents(),
        browser.testHandle.expectAjaxTimeSlices(),
        browser.url(await browser.testHandle.assetURL('instrumented.html'))
          .then(() => browser.waitForAgentLoad())
          .then(() => browser.executeAsync(function (done) {
            var xhr = new XMLHttpRequest()
            xhr.onload = function () {
              done()
            }
            xhr.open('GET', '/json')
            xhr.send()
          }))
      ])

      // Pause a bit for browsers built-in automated retry logic crap
      await browser.pause(500)
      await browser.testHandle.clearScheduledReplies('bamServer')

      const [secondAjaxEventsHarvest, secondAjaxTimeSlicesHarvest] = await Promise.all([
        browser.testHandle.expectAjaxEvents(),
        browser.testHandle.expectAjaxTimeSlices(),
        browser.executeAsync(function (done) {
          var xhr = new XMLHttpRequest()
          xhr.onload = function () {
            done()
          }
          xhr.open('GET', '/text')
          xhr.send()
        })
      ])

      expect(firstAjaxEventsHarvest.reply.statusCode).toEqual(statusCode)
      expect(firstAjaxTimeSlicesHarvest.reply.statusCode).toEqual(statusCode)

      const firstTimeSlice = firstAjaxTimeSlicesHarvest.request.body.xhr.find(x => x.params.pathname === '/json')
      expect(secondAjaxTimeSlicesHarvest.request.body.xhr).toEqual(expect.arrayContaining([firstTimeSlice]))

      const firstEvent = firstAjaxEventsHarvest.request.body.find(x => x.path === '/json')
      expect(secondAjaxEventsHarvest.request.body).toEqual(expect.arrayContaining([firstEvent]))
    })
  );

  [400, 404, 502, 504, 512].forEach(statusCode =>
    it(`should not send the ajax event and time slice on the next harvest when the first harvest statusCode is ${statusCode}`, async () => {
      await browser.testHandle.scheduleReply('bamServer', {
        test: testAjaxEventsRequest,
        permanent: true,
        statusCode
      })
      await browser.testHandle.scheduleReply('bamServer', {
        test: testAjaxTimeSlicesRequest,
        permanent: true,
        statusCode
      })

      const [firstAjaxEventsHarvest, firstAjaxTimeSlicesHarvest] = await Promise.all([
        browser.testHandle.expectAjaxEvents(),
        browser.testHandle.expectAjaxTimeSlices(),
        browser.url(await browser.testHandle.assetURL('instrumented.html'))
          .then(() => browser.waitForAgentLoad())
          .then(() => browser.executeAsync(function (done) {
            var xhr = new XMLHttpRequest()
            xhr.onload = function () {
              done()
            }
            xhr.open('GET', '/json')
            xhr.send()
          }))
      ])

      // Pause a bit for browsers built-in automated retry logic crap
      await browser.pause(500)
      await browser.testHandle.clearScheduledReplies('bamServer')

      const [secondAjaxEventsHarvest, secondAjaxTimeSlicesHarvest] = await Promise.all([
        browser.testHandle.expectAjaxEvents(),
        browser.testHandle.expectAjaxTimeSlices(),
        browser.executeAsync(function (done) {
          var xhr = new XMLHttpRequest()
          xhr.onload = function () {
            done()
          }
          xhr.open('GET', '/text')
          xhr.send()
        })
      ])

      expect(firstAjaxEventsHarvest.reply.statusCode).toEqual(statusCode)
      expect(firstAjaxTimeSlicesHarvest.reply.statusCode).toEqual(statusCode)

      const firstTimeSlice = firstAjaxTimeSlicesHarvest.request.body.xhr.find(x => x.params.pathname === '/json')
      expect(secondAjaxTimeSlicesHarvest.request.body.xhr).not.toEqual(expect.arrayContaining([firstTimeSlice]))

      const firstEvent = firstAjaxEventsHarvest.request.body.find(x => x.path === '/json')
      expect(secondAjaxEventsHarvest.request.body).not.toEqual(expect.arrayContaining([firstEvent]))

      const firstEventHarvestTime = Number(firstAjaxEventsHarvest.request.query.rst)
      const secondEventHarvestTime = Number(secondAjaxEventsHarvest.request.query.rst)
      expect(secondEventHarvestTime).toBeWithin(firstEventHarvestTime + 5000, firstEventHarvestTime + 10000)

      const firstTimeSliceHarvestTime = Number(firstAjaxTimeSlicesHarvest.request.query.rst)
      const secondTimeSliceHarvestTime = Number(secondAjaxTimeSlicesHarvest.request.query.rst)
      expect(secondTimeSliceHarvestTime).toBeWithin(firstTimeSliceHarvestTime + 5000, firstTimeSliceHarvestTime + 10000)
    })
  )
})
