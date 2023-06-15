import { testAjaxEventsRequest, testAjaxTimeSlicesRequest } from '../../../tools/testing-server/utils/expect-tests'

const config = {
  init: {
    harvest: {
      /*
      Ajax Events and Time Slices harvesting does not use any of the delay settings from the harvest module. It should
      just put the ajax events in the next harvest. Setting this value a little higher than the default
      harvest time to verify it's not being used.
      */
      tooManyRequestsDelay: 10
    }
  }
}

/*
These tests need to retry a lot. The ajax events sometimes have their timing values changes on the
second harvest. We will need to investigate this issue at a later date.
*/

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
        browser.url(await browser.testHandle.assetURL('instrumented.html', config))
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

      // Ajax Time Slices are not retried
      const firstTimeSlice = firstAjaxTimeSlicesHarvest.request.body.xhr.find(x => x.params.pathname === '/json')
      expect(secondAjaxTimeSlicesHarvest.request.body.xhr).not.toEqual(expect.arrayContaining([firstTimeSlice]))

      // Ajax events are retried
      const firstEvent = firstAjaxEventsHarvest.request.body.find(x => x.path === '/json')
      expect(secondAjaxEventsHarvest.request.body).toEqual(expect.arrayContaining([firstEvent]))

      const firstEventHarvestTime = Number(firstAjaxEventsHarvest.request.query.rst)
      const secondEventHarvestTime = Number(secondAjaxEventsHarvest.request.query.rst)
      expect(secondEventHarvestTime).toBeWithin(firstEventHarvestTime + 5000, firstEventHarvestTime + 10000)

      const firstTimeSliceHarvestTime = Number(firstAjaxTimeSlicesHarvest.request.query.rst)
      const secondTimeSliceHarvestTime = Number(secondAjaxTimeSlicesHarvest.request.query.rst)
      expect(secondTimeSliceHarvestTime).toBeWithin(firstTimeSliceHarvestTime + 5000, firstTimeSliceHarvestTime + 10000)
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
        browser.url(await browser.testHandle.assetURL('instrumented.html', config))
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

      // Ajax Time Slices are not retried
      const firstTimeSlice = firstAjaxTimeSlicesHarvest.request.body.xhr.find(x => x.params.pathname === '/json')
      expect(secondAjaxTimeSlicesHarvest.request.body.xhr).not.toEqual(expect.arrayContaining([firstTimeSlice]))

      // Ajax events are retried
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
