const { testInsRequest } = require('../../../tools/testing-server/utils/expect-tests')

describe('ins harvesting', () => {
  let insightsCapture

  beforeEach(async () => {
    insightsCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testInsRequest })

    const init = {
      user_actions: { enabled: false },
      page_actions: { enabled: false },
      performance: {
        capture_marks: false,
        capture_measures: false,
        resources: { enabled: false, ignore_newrelic: true, asset_types: [], first_party_domains: [] }
      }
    }

    const testUrl = await browser.testHandle.assetURL('instrumented.html', { init })
    await browser.url(testUrl).then(() => browser.waitForAgentLoad())
  })

  it('creates BrowserPerformance event without options argument', async () => {
    browser.execute(function () {
      newrelic.measure('testMeasure')
    })

    const [[{ request: { body: { ins: insHarvest } } }]] = await Promise.all([
      insightsCapture.waitForResult({ totalCount: 1 })
    ])

    expect(insHarvest.length).toEqual(1)
    expect(insHarvest[0]).toMatchObject({
      currentUrl: expect.any(String),
      pageUrl: expect.any(String),
      eventType: 'BrowserPerformance',
      timestamp: expect.any(Number),
      entryName: 'testMeasure',
      entryDuration: expect.any(Number)
    })
  })

  it.only('creates BrowserPerformance event with start', async () => {
    browser.execute(function () {
      newrelic.measure('testMeasure', { start: 1234, timeout: 20000 })
    })

    const [[{ request: { body: { ins: insHarvest } } }]] = await Promise.all([
      insightsCapture.waitForResult({ totalCount: 1 })
    ])

    expect(insHarvest.length).toEqual(1)
    expect(insHarvest[0]).toMatchObject({
      currentUrl: expect.any(String),
      pageUrl: expect.any(String),
      eventType: 'BrowserPerformance',
      timestamp: expect.any(Number),
      entryName: 'testMeasure',
      entryDuration: expect.any(Number)
    })
  })

  it('creates BrowserPerformance event with end', async () => {
    browser.execute(function () {
      newrelic.measure('testMeasure', { end: 1234 })
    })

    const [[{ request: { body: { ins: insHarvest } } }]] = await Promise.all([
      insightsCapture.waitForResult({ totalCount: 1 })
    ])

    expect(insHarvest.length).toEqual(1)
    expect(insHarvest[0]).toMatchObject({
      currentUrl: expect.any(String),
      pageUrl: expect.any(String),
      eventType: 'BrowserPerformance',
      timestamp: expect.any(Number),
      entryName: 'testMeasure',
      entryDuration: 1234
    })
  })

  it('creates BrowserPerformance event with custom attributes', async () => {
    browser.execute(function () {
      newrelic.setCustomAttribute('abc', 123)
      newrelic.setCustomAttribute('def', '456')
      newrelic.measure('testMeasure', { customAttributes: { abc: 789, ghi: false } })
    })

    const [[{ request: { body: { ins: insHarvest } } }]] = await Promise.all([
      insightsCapture.waitForResult({ totalCount: 1 })
    ])

    expect(insHarvest.length).toEqual(1)
    expect(insHarvest[0]).toMatchObject({
      abc: 789,
      def: '456',
      ghi: false,
      currentUrl: expect.any(String),
      pageUrl: expect.any(String),
      eventType: 'BrowserPerformance',
      timestamp: expect.any(Number),
      entryName: 'testMeasure',
      entryDuration: expect.any(Number)
    })
  })

  it('creates BrowserPerformance event with number start and end', async () => {
    browser.execute(function () {
      newrelic.measure('testMeasure', { start: 50, end: 144 })
    })

    const [[{ request: { body: { ins: insHarvest } } }]] = await Promise.all([
      insightsCapture.waitForResult({ totalCount: 1 })
    ])

    expect(insHarvest.length).toEqual(1)
    expect(insHarvest[0]).toMatchObject({
      currentUrl: expect.any(String),
      pageUrl: expect.any(String),
      eventType: 'BrowserPerformance',
      timestamp: expect.any(Number),
      entryName: 'testMeasure',
      entryDuration: 94
    })
  })

  it('creates BrowserPerformance event with performance marks', async () => {
    browser.execute(function () {
      const start = performance.mark('start', { startTime: 30 })
      const end = performance.mark('start', { startTime: 65 })
      newrelic.measure('testMeasure', { start, end })
    })

    const [[{ request: { body: { ins: insHarvest } } }]] = await Promise.all([
      insightsCapture.waitForResult({ totalCount: 1 })
    ])

    expect(insHarvest.length).toEqual(1)
    expect(insHarvest[0]).toMatchObject({
      currentUrl: expect.any(String),
      pageUrl: expect.any(String),
      eventType: 'BrowserPerformance',
      timestamp: expect.any(Number),
      entryName: 'testMeasure',
      entryDuration: 35
    })
  })
})
