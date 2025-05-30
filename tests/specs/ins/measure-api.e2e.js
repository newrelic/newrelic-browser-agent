const { testInsRequest } = require('../../../tools/testing-server/utils/expect-tests')

describe('ins harvesting', () => {
  let insightsCapture

  const init = {
    user_actions: { enabled: false },
    page_actions: { enabled: false },
    performance: {
      capture_marks: false,
      capture_measures: false,
      resources: { enabled: false, ignore_newrelic: true, asset_types: [], first_party_domains: [] }
    }
  }

  beforeEach(async () => {
    insightsCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testInsRequest })
  })

  ;['preload', 'postload'].forEach(initTime => {
    it(`creates BrowserPerformance events as expected - ${initTime}`, async () => {
      const testUrl = await browser.testHandle.assetURL(`measure-api-${initTime}.html`, { init })
      await browser.url(testUrl).then(() => browser.waitForAgentLoad())

      const [{ request: { body: { ins: insHarvest } } }] = await insightsCapture.waitForResult({ totalCount: 1 })
      const browserPerformanceEvents = insHarvest.filter(x => x.eventType === 'BrowserPerformance' && x.entryType === 'measure')

      browserPerformanceEvents.forEach(event => {
        switch (event.entryName) {
          case 'no-args':
          case 'start-only-number':
          case 'start-end-mixed-2':
            expect(event.entryDuration).toBeLessThan(1000)
            break
          case 'end-only-number':
            expect(event.entryDuration).toEqual(2000)
            break
          case 'start-end-number':
            expect(event.entryDuration).toEqual(1000)
            break
          case 'custom-attributes':
            expect(event.foo).toEqual('bar')
            break
          case 'start-only-mark':
          case 'end-only-mark':
          case 'start-end-performance-marks':
          case 'start-end-mixed':
            expect(event.entryDuration).toBeGreaterThan(1000)
            break
        }
        expect(event.entryDuration).toBeGreaterThan(0)
        expect(event.pageUrl).toBeTruthy()
        expect(event.eventType).toEqual('BrowserPerformance')
        expect(event.entryType).toEqual('measure')
      })

      expect(await browser.execute(function () {
        return window.unexpectedErrors
      })).toEqual([])
    })
  })
})
