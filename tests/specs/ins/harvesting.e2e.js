const { testInsRequest, testErrorsRequest } = require('../../../tools/testing-server/utils/expect-tests')
const { onlyFirefox, onlyChrome, onlyChromium } = require('../../../tools/browser-matcher/common-matchers.mjs')
const { FEATURE_FLAGS } = require('../../../src/features/generic_events/constants')
const { deepmergeInto } = require('deepmerge-ts')

describe('ins harvesting', () => {
  let insightsCapture

  beforeEach(async () => {
    insightsCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testInsRequest })
  })

  it('should submit PageActions', async () => {
    const testUrl = await browser.testHandle.assetURL('instrumented.html', getInsInit({ page_actions: { enabled: true } }))
    await browser.url(testUrl)
      .then(() => browser.waitForAgentLoad())

    const [[{ request: { body: { ins: pageActionsHarvest }, query } }]] = await Promise.all([
      insightsCapture.waitForResult({ totalCount: 1 }),
      browser.execute(function () {
        newrelic.addPageAction('DummyEvent', { free: 'tacos' })
      })
    ])

    expect(pageActionsHarvest.length).toEqual(1)
    let event = pageActionsHarvest[0]
    expect(event.actionName).toEqual('DummyEvent')
    expect(event.free).toEqual('tacos')
    let receiptTime = Date.now()
    let relativeHarvestTime = query.rst
    let estimatedPageLoad = receiptTime - relativeHarvestTime
    let eventTimeSinceLoad = event.timeSinceLoad * 1000
    let estimatedEventTime = eventTimeSinceLoad + estimatedPageLoad
    expect(relativeHarvestTime > eventTimeSinceLoad).toEqual(true) //, 'harvest time (' + relativeHarvestTime + ') should always be bigger than event time (' + eventTimeSinceLoad + ')')
    expect(estimatedEventTime < receiptTime).toEqual(true) //, 'estimated event time (' + estimatedEventTime + ') < receipt time (' + receiptTime + ')')
  })

  it('should submit Custom Events', async () => {
    const testUrl = await browser.testHandle.assetURL('instrumented.html')
    await browser.url(testUrl)
      .then(() => browser.waitForAgentLoad())

    const [[{ request: { body: { ins: customEventsHarvest } } }]] = await Promise.all([
      insightsCapture.waitForResult({ totalCount: 1 }),
      browser.execute(function () {
        newrelic.recordCustomEvent('event0', { index: 0 })
        newrelic.recordCustomEvent('event1', { index: 1 })
      })
    ])

    expect(customEventsHarvest.length).toEqual(2)
    customEventsHarvest.forEach((event, i) => {
      expect(event.eventType).toEqual(`event${i}`)
      expect(event.index).toEqual(i)
      expect(event.timestamp).toBeGreaterThan(0)
      expect(event.timestamp).toBeLessThan(Date.now())
      expect(Object.keys(event).length).toEqual(5)
    })
  })

  it('should not submit reserved Custom Events', async () => {
    const testUrl = await browser.testHandle.assetURL('instrumented.html')
    await browser.url(testUrl)
      .then(() => browser.waitForAgentLoad())

    const [customEventsHarvest] = await Promise.all([
      insightsCapture.waitForResult({ timeout: 10000 }),
      browser.execute(function () {
        newrelic.recordCustomEvent('PageAction', { index: 0 })
        newrelic.recordCustomEvent('BrowserPerformance', { index: 1 })
        newrelic.recordCustomEvent('UserAction', { index: 2 })
      })
    ])

    expect(customEventsHarvest.length).toEqual(0)
  })

  ;[
    [getInsInit({ performance: { capture_marks: true } }), 'enabled'],
    [getInsInit({ performance: { capture_marks: false }, feature_flags: [FEATURE_FLAGS.MARKS] }), 'feature flag']
  ].forEach(([insInit, type]) => {
    it('should submit Marks - ' + type, async () => {
      const testUrl = await browser.testHandle.assetURL('marks-and-measures.html', insInit)
      await browser.url(testUrl).then(() => browser.waitForAgentLoad())

      const [[{ request: { body: { ins: insHarvest } } }]] = await Promise.all([
        insightsCapture.waitForResult({ totalCount: 1 })
      ])

      expect(insHarvest.length).toEqual(2) // this page sets two marks
      expect(insHarvest[0]).toMatchObject({
        entryDuration: 0,
        eventType: 'BrowserPerformance',
        entryName: 'before-agent',
        pageUrl: expect.any(String),
        timestamp: expect.any(Number),
        entryType: 'mark'
      })
      expect(insHarvest[1]).toMatchObject({
        entryDuration: 0,
        eventType: 'BrowserPerformance',
        entryName: 'after-agent',
        pageUrl: expect.any(String),
        timestamp: expect.any(Number),
        entryType: 'mark'
      })
    })
  })

  ;[
    [getInsInit({ performance: { capture_measures: true } }), 'enabled'],
    [getInsInit({ performance: { capture_measures: false }, feature_flags: [FEATURE_FLAGS.MEASURES] }), 'feature flag']
  ].forEach(([insInit, type]) => {
    it('should submit Measures - ' + type, async () => {
      const testUrl = await browser.testHandle.assetURL('marks-and-measures.html', insInit)
      await browser.url(testUrl).then(() => browser.waitForAgentLoad())

      const [[{ request: { body: { ins: insHarvest } } }]] = await Promise.all([
        insightsCapture.waitForResult({ totalCount: 1 })
      ])

      expect(insHarvest.length).toEqual(1) // this page sets one measure
      expect(insHarvest[0]).toMatchObject({
        'entryDetail.foo': 'bar',
        entryDuration: expect.any(Number),
        eventType: 'BrowserPerformance',
        entryName: 'agent-load',
        pageUrl: expect.any(String),
        timestamp: expect.any(Number),
        entryType: 'measure'
      })
    })
  })

  it('should spread detail', async () => {
    const testUrl = await browser.testHandle.assetURL('marks-and-measures-detail.html', getInsInit({ performance: { capture_measures: true } }))
    await browser.url(testUrl).then(() => browser.waitForAgentLoad())

    const [[{ request: { body: { ins: insHarvest } } }]] = await Promise.all([
      insightsCapture.waitForResult({ totalCount: 1 })
    ])

    expect(insHarvest.length).toEqual(10) // this page sets 10 measures
    // detail: {foo:'bar'}
    expect(insHarvest.find(x => x.entryName === 'simple-object')['entryDetail.foo']).toEqual('bar')
    // detail: {nested1:{nested2:{nested3:{nested4: {foo: 'bar'}}}}
    expect(insHarvest.find(x => x.entryName === 'nested-object')['entryDetail.nested1.nested2.nested3.nested4.foo']).toEqual('bar')
    // detail: 'hi'
    expect(insHarvest.find(x => x.entryName === 'string').entryDetail).toEqual('hi')
    // detail: ''
    expect(insHarvest.find(x => x.entryName === 'falsy-string').entryDetail).toEqual('')
    // detail: 1
    expect(insHarvest.find(x => x.entryName === 'number').entryDetail).toEqual(1)
    // detail: 0
    expect(insHarvest.find(x => x.entryName === 'falsy-number').entryDetail).toEqual(0)
    // detail: true
    expect(insHarvest.find(x => x.entryName === 'boolean').entryDetail).toEqual(true)
    // detail: false
    expect(insHarvest.find(x => x.entryName === 'falsy-boolean').entryDetail).toEqual(false)
    // detail: [1,2,3]
    expect(insHarvest.find(x => x.entryName === 'array').entryDetail).toEqual('[1,2,3]')
    // detail: []
    expect(insHarvest.find(x => x.entryName === 'falsy-array').entryDetail).toEqual('[]')
  })

  ;[
    [getInsInit({ performance: { resources: { enabled: true, ignore_newrelic: false } } }), 'enabled'],
    [getInsInit({ performance: { resources: { enabled: false, ignore_newrelic: false } }, feature_flags: [FEATURE_FLAGS.RESOURCES] }), 'feature flag']
  ].forEach(([insInit, type]) => {
    it('should capture page resources - ignore_newrelic: false - ' + type, async () => {
      const testUrl = await browser.testHandle.assetURL('page-resources.html', insInit)
      await browser.url(testUrl).then(() => browser.waitForAgentLoad())

      const [[{ request: { body: { ins: insHarvest } } }]] = await Promise.all([
        insightsCapture.waitForResult({ totalCount: 1 })
      ])

      const initiatorTypes = [
        'img',
        'link',
        'script',
        'xmlhttprequest'
      ]
      if (!browserMatch(onlyFirefox)) initiatorTypes.push('css')
      if (browserMatch(onlyFirefox)) initiatorTypes.push('other')
      const tester = new PageResourcesTester(initiatorTypes)
      insHarvest.forEach((entry) => tester.test(entry))
      tester.checkAllTested()
    })
  })

  ;[
    [getInsInit({ performance: { resources: { enabled: true, ignore_newrelic: true } } }), 'enabled'],
    [getInsInit({ performance: { resources: { enabled: false, ignore_newrelic: true } }, feature_flags: [FEATURE_FLAGS.RESOURCES] }), 'feature flag']
  ].forEach(([insInit, type]) => {
    it('should capture page resources - ignore_newrelic: true - ' + type, async () => {
      const testUrl = await browser.testHandle.assetURL('page-resources.html', insInit)
      await browser.url(testUrl).then(() => browser.waitForAgentLoad())

      const [[{ request: { body: { ins: insHarvest } } }]] = await Promise.all([
        insightsCapture.waitForResult({ totalCount: 1 })
      ])

      const tester = new PageResourcesTester(['img'])
      insHarvest.forEach((entry) => tester.test(entry))
      tester.checkAllTested()
    })
  })

  ;[
    [getInsInit({ performance: { resources: { enabled: true, ignore_newrelic: false, asset_types: ['img'] } } }), 'enabled'],
    [getInsInit({ performance: { resources: { enabled: false, ignore_newrelic: false, asset_types: ['img'] } }, feature_flags: [FEATURE_FLAGS.RESOURCES] }), 'feature flag']
  ].forEach(([insInit, type]) => {
    // firefox does some weird naming with asset types across its different versions
    it.withBrowsersMatching(onlyChromium)('should capture page resources - asset_types - ' + type, async () => {
      /** allow newrelic, which will try to capture 6 different asset types, but the asset types filter should only keep img types */
      const testUrl = await browser.testHandle.assetURL('page-resources.html', insInit)
      await browser.url(testUrl).then(() => browser.waitForAgentLoad())

      const [[{ request: { body: { ins: insHarvest } } }]] = await Promise.all([
        insightsCapture.waitForResult({ totalCount: 1 })
      ])

      const tester = new PageResourcesTester(['img'])
      insHarvest.forEach((entry) => tester.test(entry))
      tester.checkAllTested()
    })
  })

  ;[
    [getInsInit({ performance: { resources: { enabled: true, first_party_domains: ['upload.wikimedia.org'] } } }), 'enabled'],
    [getInsInit({ performance: { resources: { enabled: false, first_party_domains: ['upload.wikimedia.org'] } }, feature_flags: [FEATURE_FLAGS.RESOURCES] }), 'feature flag']
  ].forEach(([insInit, type]) => {
    it('should capture page resources - first_party_domains - ' + type, async () => {
      const testUrl = await browser.testHandle.assetURL('page-resources.html', insInit)
      await browser.url(testUrl).then(() => browser.waitForAgentLoad())

      const [[{ request: { body: { ins: insHarvest } } }]] = await Promise.all([
        insightsCapture.waitForResult({ totalCount: 1 })
      ])

      const tester = new PageResourcesTester(['img'])
      /** test that the wikimedia asset is reported as first party even though its running on domain bam-test-1.nr-local.net */
      insHarvest.forEach((entry) => tester.test(entry, { img: true }))
      tester.checkAllTested()
    })
  })

  it('should harvest early when buffer gets too large (overall quantity)', async () => {
    const testUrl = await browser.testHandle.assetURL('instrumented.html', { init: { harvest: { interval: 30 } } })
    await browser.url(testUrl)
      .then(() => browser.waitForAgentLoad())

    /** harvest should trigger immediately */
    const [insightsResult] = await Promise.all([
      insightsCapture.waitForResult({ timeout: 10000 }),
      browser.execute(function () {
        let i = 0
        while (i++ < 10000) {
          newrelic.addPageAction('foobar')
        }
      })
    ])
    expect(insightsResult.length).toBeTruthy()
  })

  it('should not harvest if too large', async () => {
    const testUrl = await browser.testHandle.assetURL('instrumented.html')
    await browser.url(testUrl)
      .then(() => browser.waitForAgentLoad())

    const [insightsResult] = await Promise.all([
      insightsCapture.waitForResult({ timeout: 10000 }),
      browser.execute(function () {
        newrelic.addPageAction('foobar', createLargeObject())
        function createLargeObject () {
          let i = 0; let obj = {}
          while (i++ < 1000000) {
            obj[i] = Math.random()
          }
          return obj
        }
      })
    ])

    expect(insightsResult).toEqual([])
  })

  it('should honor payload precedence', async () => {
    const testUrl = await browser.testHandle.assetURL('instrumented.html')
    await browser.url(testUrl)
      .then(() => browser.waitForAgentLoad())

    const [[{ request: { body: { ins: pageActionsHarvest } } }]] = await Promise.all([
      insightsCapture.waitForResult({ totalCount: 1 }),
      browser.execute(function () {
        newrelic.setCustomAttribute('browserHeight', 705)
        newrelic.setCustomAttribute('eventType', 'globalPageAction')
        newrelic.setCustomAttribute('globalCustomAttribute', 12345)
        newrelic.addPageAction('MyEvent', { referrerUrl: 'http://test.com', localCustomAttribute: { bar: 'baz' }, eventType: 'localPageAction' })
      })
    ])

    expect(pageActionsHarvest.length).toEqual(1)

    let event = pageActionsHarvest[0]
    expect(event.actionName).toEqual('MyEvent')
    expect(event.eventType).toEqual('PageAction') //, 'pageAction should not be overwritable (globalPageAction, localPageAction)
    expect(event.browserHeight).not.toEqual(705) //, 'browser height should not be overwritable'
    expect(event.globalCustomAttribute).toEqual(12345) //, 'global custom attributes passed through')
    expect(event.localCustomAttribute).toEqual('{"bar":"baz"}') //, 'local custom attributes passed through')
  })

  it('NEWRELIC-9370: should not throw an exception when calling addPageAction with window.location before navigating', async () => {
    const errorsCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testErrorsRequest })
    const testUrl = await browser.testHandle.assetURL('api/addPageAction-unload.html')
    await browser.url(testUrl)
      .then(() => browser.waitForAgentLoad())

    const [insightsHarvests, errorsHarvests] = await Promise.all([
      insightsCapture.waitForResult({ totalCount: 1 }),
      errorsCapture.waitForResult({ timeout: 10000 }),
      browser.execute(function () {
        window.triggerPageActionNavigation()
      })
    ])

    expect(errorsHarvests).toEqual([])
    expect(insightsHarvests[0].request.body.ins).toEqual(expect.arrayContaining([
      expect.objectContaining({
        actionName: 'pageaction',
        href: testUrl
      })
    ]))
  })
})

class PageResourcesTester {
  constructor (expectedTypes = []) {
    this.typesToTest = {
      css: { tag: 'css', tested: false },
      img: { tag: 'img', tested: false },
      link: { tag: 'link', tested: false },
      script: { tag: 'script', tested: false },
      xmlhttprequest: { tag: 'xmlhttprequest', tested: false },
      other: { tag: 'other', tested: false }
    }

    this.expectedTypes = expectedTypes
  }

  checkAllTested () {
    return browserMatch(onlyFirefox) || Object.entries(this.typesToTest).forEach(([type, { tested }]) => {
      expect(tested).toEqual(this.expectedTypes.includes(type))
    })
  }

  test (entry, firstPartyOverrides = {}) {
    let initiatorType, firstParty
    if (entry.entryName.includes('font.woff')) {
      initiatorType = this.typesToTest.css.tag
      firstParty = firstPartyOverrides[initiatorType] ?? true
    } else if (entry.entryName.includes('House_of_Commons_Chamber_1.png')) {
      initiatorType = this.typesToTest.img.tag
      firstParty = firstPartyOverrides[initiatorType] ?? false
    } else if (entry.entryName.includes('favicon.ico')) {
      initiatorType = this.typesToTest.other.tag
      firstParty = firstPartyOverrides[initiatorType] ?? true
    } else if (entry.entryName.includes('nr-spa.min.js')) {
      initiatorType = this.typesToTest.script.tag
      firstParty = firstPartyOverrides[initiatorType] ?? true
    } else if (entry.entryName.includes('style.css')) {
      initiatorType = this.typesToTest.link.tag
      firstParty = firstPartyOverrides[initiatorType] ?? true
    } else {
      initiatorType = this.typesToTest.xmlhttprequest.tag
      firstParty = firstPartyOverrides[initiatorType] ?? true
    }
    // some firefox versions report the css initiatorType as various values like 'other' for img and css assets, while other browsers report it more concretely.  Just check for any value to eliminate test flakiness
    if (browserMatch(onlyFirefox)) {
      initiatorType = expect.any(String)
    } else {
      this.typesToTest[initiatorType].tested = true
    }

    const allBrowserFields = {
      connectEnd: expect.any(Number),
      connectStart: expect.any(Number),
      currentUrl: expect.any(String),
      decodedBodySize: expect.any(Number),
      domainLookupEnd: expect.any(Number),
      domainLookupStart: expect.any(Number),
      encodedBodySize: expect.any(Number),
      entryDuration: expect.any(Number),
      entryName: expect.any(String),
      entryType: 'resource',
      eventType: 'BrowserPerformance',
      fetchStart: expect.any(Number),
      firstParty,
      initiatorType,
      nextHopProtocol: expect.any(String),
      pageUrl: expect.any(String),
      redirectEnd: expect.any(Number),
      redirectStart: expect.any(Number),
      requestStart: expect.any(Number),
      responseEnd: expect.any(Number),
      responseStart: expect.any(Number),
      secureConnectionStart: expect.any(Number),
      startTime: expect.any(Number),
      timestamp: expect.any(Number),
      transferSize: expect.any(Number),
      workerStart: expect.any(Number)
    }
    const chromeFields = {
      deliveryType: expect.any(String),
      firstInterimResponseStart: expect.any(Number),
      renderBlockingStatus: expect.any(String),
      serverTiming: expect.any(String)
    }

    let testFields = {
      ...allBrowserFields,
      ...(browserMatch(onlyChrome) && chromeFields)
    }

    expect(entry).toMatchObject(testFields)
  }
}

function getInsInit (overrides = {}) {
  const init = {
    user_actions: { enabled: false },
    page_actions: { enabled: false },
    performance: {
      capture_marks: false,
      capture_measures: false,
      resources: { enabled: false, ignore_newrelic: true, asset_types: [], first_party_domains: [] }
    }
  }
  deepmergeInto(init, overrides)
  return { init }
}
