const { testInsRequest, testErrorsRequest } = require('../../../tools/testing-server/utils/expect-tests')

describe('ins harvesting', () => {
  let insightsCapture

  beforeEach(async () => {
    insightsCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testInsRequest })
  })

  // it('should submit PageActions', async () => {
  //   const testUrl = await browser.testHandle.assetURL('instrumented.html')
  //   await browser.url(testUrl)
  //     .then(() => browser.waitForAgentLoad())

  //   const [[{ request: { body: { ins: pageActionsHarvest }, query } }]] = await Promise.all([
  //     insightsCapture.waitForResult({ totalCount: 1 }),
  //     browser.execute(function () {
  //       newrelic.addPageAction('DummyEvent', { free: 'tacos' })
  //     })
  //   ])

  //   expect(pageActionsHarvest.length).toEqual(1)
  //   let event = pageActionsHarvest[0]
  //   expect(event.actionName).toEqual('DummyEvent')
  //   expect(event.free).toEqual('tacos')
  //   let receiptTime = Date.now()
  //   let relativeHarvestTime = query.rst
  //   let estimatedPageLoad = receiptTime - relativeHarvestTime
  //   let eventTimeSinceLoad = event.timeSinceLoad * 1000
  //   let estimatedEventTime = eventTimeSinceLoad + estimatedPageLoad
  //   expect(relativeHarvestTime > eventTimeSinceLoad).toEqual(true) //, 'harvest time (' + relativeHarvestTime + ') should always be bigger than event time (' + eventTimeSinceLoad + ')')
  //   expect(estimatedEventTime < receiptTime).toEqual(true) //, 'estimated event time (' + estimatedEventTime + ') < receipt time (' + receiptTime + ')')
  // })

  // it('should submit UserAction (when enabled)', async () => {
  //   const testUrl = await browser.testHandle.assetURL('user-actions.html', { init: { user_actions: { enabled: true } } })
  //   await browser.url(testUrl).then(() => browser.waitForAgentLoad())

  //   const [insHarvests] = await Promise.all([
  //     insightsCapture.waitForResult({ timeout: 7500 }),
  //     $('#pay-btn').click().then(async () => {
  //       // rage click
  //       await browser.execute(function () {
  //         for (let i = 0; i < 5; i++) {
  //           document.querySelector('#textbox').click()
  //         }
  //       })
  //       // stop aggregating textbox clicks
  //       await $('body').click()
  //     })
  //   ])

  //   const userActionsHarvest = insHarvests.flatMap(harvest => harvest.request.body.ins) // firefox sends a window focus event on load, so we may end up with 2 harvests
  //   const clickUAs = userActionsHarvest.filter(ua => ua.action === 'click')
  //   expect(clickUAs.length).toBeGreaterThanOrEqual(2)
  //   expect(clickUAs[0]).toMatchObject({
  //     eventType: 'UserAction',
  //     action: 'click',
  //     actionCount: 1,
  //     actionDuration: 0,
  //     actionMs: '[0]',
  //     target: 'html>body>button#pay-btn:nth-of-type(1)',
  //     targetId: 'pay-btn',
  //     targetTag: 'BUTTON',
  //     targetType: 'submit',
  //     targetClass: 'btn-cart-add flex-grow container',
  //     pageUrl: expect.any(String),
  //     timestamp: expect.any(Number)
  //   })
  //   expect(clickUAs[1]).toMatchObject({
  //     eventType: 'UserAction',
  //     action: 'click',
  //     actionCount: 5,
  //     actionDuration: expect.any(Number),
  //     actionMs: expect.any(String),
  //     rageClick: true,
  //     target: 'html>body>input#textbox:nth-of-type(1)',
  //     targetId: 'textbox',
  //     targetTag: 'INPUT',
  //     targetType: 'text',
  //     pageUrl: expect.any(String),
  //     timestamp: expect.any(Number)
  //   })
  //   expect(clickUAs[1].actionDuration).toBeGreaterThan(0)
  //   expect(clickUAs[1].actionMs).toEqual(expect.stringMatching(/^\[\d+(,\d+){4}\]$/))
  // })

  // it('should detect iframes on UserActions if agent is running inside iframe', async () => {
  //   const testUrl = await browser.testHandle.assetURL('iframe/same-origin.html', { init: { user_actions: { enabled: true } } })
  //   await browser.url(testUrl).then(() => browser.pause(2000))

  //   const [insHarvests] = await Promise.all([
  //     insightsCapture.waitForResult({ timeout: 5000 }),
  //     browser.execute(function () {
  //       const frame = document.querySelector('iframe')
  //       const frameBody = frame.contentWindow.document.querySelector('body')
  //       frame.focus()
  //       frameBody.click()
  //       window.focus()
  //       window.location.reload()
  //     })

  //   ])

  //   const userActionsHarvest = insHarvests.flatMap(harvest => harvest.request.body.ins) // firefox sends a window focus event on load, so we may end up with 2 harvests
  //   expect(userActionsHarvest.length).toBeGreaterThanOrEqual(3) // 3 page events above, plus the occasional window focus event mentioned above
  //   userActionsHarvest.forEach(ua => {
  //     expect(ua.eventType).toEqual('UserAction')
  //     expect(ua.iframe).toEqual(true)
  //   })
  // })

  // it('should submit Marks', async () => {
  //   const testUrl = await browser.testHandle.assetURL('marks-and-measures.html', { init: { performance: { capture_marks: true, capture_measures: false } } })
  //   await browser.url(testUrl).then(() => browser.waitForAgentLoad())

  //   const [[{ request: { body: { ins: insHarvest } } }]] = await Promise.all([
  //     insightsCapture.waitForResult({ totalCount: 1 })
  //   ])

  //   expect(insHarvest.length).toEqual(2) // this page sets two marks
  //   expect(insHarvest[0]).toMatchObject({
  //     entryDuration: 0,
  //     eventType: 'BrowserPerformance',
  //     entryName: 'before-agent',
  //     pageUrl: expect.any(String),
  //     timestamp: expect.any(Number),
  //     entryType: 'mark'
  //   })
  //   expect(insHarvest[1]).toMatchObject({
  //     entryDuration: 0,
  //     eventType: 'BrowserPerformance',
  //     entryName: 'after-agent',
  //     pageUrl: expect.any(String),
  //     timestamp: expect.any(Number),
  //     entryType: 'mark'
  //   })
  // })

  // it('should submit Measures', async () => {
  //   const testUrl = await browser.testHandle.assetURL('marks-and-measures.html', { init: { performance: { capture_marks: false, capture_measures: true } } })
  //   await browser.url(testUrl).then(() => browser.waitForAgentLoad())

  //   const [[{ request: { body: { ins: insHarvest } } }]] = await Promise.all([
  //     insightsCapture.waitForResult({ totalCount: 1 })
  //   ])

  //   expect(insHarvest.length).toEqual(1) // this page sets one measure
  //   expect(insHarvest[0]).toMatchObject({
  //     entryDetail: '{"foo":"bar"}',
  //     entryDuration: expect.any(Number),
  //     eventType: 'BrowserPerformance',
  //     entryName: 'agent-load',
  //     pageUrl: expect.any(String),
  //     timestamp: expect.any(Number),
  //     entryType: 'measure'
  //   })
  // })

  it('should capture page resources - newrelic allowed', async () => {
    const testUrl = await browser.testHandle.assetURL('page-resources.html', { init: { performance: { resources: { enabled: true, ignore_newrelic: false } } } })
    await browser.url(testUrl).then(() => browser.waitForAgentLoad())

    const logs = await browser.execute(function () {
      return window.logs
    })
    console.log(logs)

    const [[{ request: { body: { ins: insHarvest } } }]] = await Promise.all([
      insightsCapture.waitForResult({ totalCount: 1 })
    ])

    expect(insHarvest.length).toEqual(5)
    const typesToTest = {
      css: { tag: 'css', tested: false },
      img: { tag: 'img', tested: false },
      script: { tag: 'script', tested: false },
      xmlhttprequest: { tag: 'xmlhttprequest', tested: false },
      other: { tag: 'other', tested: false }
    }
    insHarvest.forEach((entry) => {
      let initiatorType, firstParty
      if (entry.entryName.includes('font.woff')) {
        initiatorType = typesToTest.css.tag
        firstParty = true
      } else if (entry.entryName.includes('House_of_Commons_Chamber_1.png')) {
        initiatorType = typesToTest.img.tag
        firstParty = false
      } else if (entry.entryName.includes('favicon.ico')) {
        initiatorType = typesToTest.other.tag
        firstParty = true
      } else if (entry.entryName.includes('nr-spa.min.js')) {
        initiatorType = typesToTest.script.tag
        firstParty = true
      } else {
        initiatorType = typesToTest.xmlhttprequest.tag
        firstParty = true
      }
      typesToTest[initiatorType].tested = true

      expect(entry).toMatchObject({
        connectEnd: expect.any(Number),
        connectStart: expect.any(Number),
        currentUrl: expect.any(String),
        decodedBodySize: expect.any(Number),
        deliveryType: expect.any(String),
        domainLookupEnd: expect.any(Number),
        domainLookupStart: expect.any(Number),
        encodedBodySize: expect.any(Number),
        entryDuration: expect.any(Number),
        entryName: expect.any(String),
        entryType: 'resource',
        eventType: 'BrowserPerformance',
        fetchStart: expect.any(Number),
        firstInterimResponseStart: expect.any(Number),
        firstParty,
        initiatorType,
        nextHopProtocol: expect.any(String),
        pageUrl: expect.any(String),
        redirectEnd: expect.any(Number),
        redirectStart: expect.any(Number),
        renderBlockingStatus: expect.any(String),
        requestStart: expect.any(Number),
        responseEnd: expect.any(Number),
        responseStart: expect.any(Number),
        responseStatus: expect.any(Number),
        secureConnectionStart: expect.any(Number),
        serverTiming: expect.any(String),
        startTime: expect.any(Number),
        timestamp: expect.any(Number),
        transferSize: expect.any(Number),
        workerStart: expect.any(Number)
      })
    })

    expect(Object.values(typesToTest).every(type => type.tested)).toEqual(true)
  })

  it('should capture page resources - newrelic not allowed', async () => {
    const testUrl = await browser.testHandle.assetURL('page-resources.html', { init: { performance: { resources: { enabled: true } } } })
    await browser.url(testUrl).then(() => browser.waitForAgentLoad())

    const logs = await browser.execute(function () {
      return window.logs
    })
    console.log(logs)

    const [[{ request: { body: { ins: insHarvest } } }]] = await Promise.all([
      insightsCapture.waitForResult({ totalCount: 1 })
    ])

    expect(insHarvest.length).toEqual(1)
    const typesToTest = {
      css: { tag: 'css', tested: false },
      img: { tag: 'img', tested: false },
      script: { tag: 'script', tested: false },
      xmlhttprequest: { tag: 'xmlhttprequest', tested: false },
      other: { tag: 'other', tested: false }
    }
    insHarvest.forEach((entry) => {
      let initiatorType, firstParty
      if (entry.entryName.includes('font.woff')) {
        initiatorType = typesToTest.css.tag
        firstParty = true
      } else if (entry.entryName.includes('House_of_Commons_Chamber_1.png')) {
        initiatorType = typesToTest.img.tag
        firstParty = false
      } else if (entry.entryName.includes('favicon.ico')) {
        initiatorType = typesToTest.other.tag
        firstParty = true
      } else if (entry.entryName.includes('nr-spa.min.js')) {
        initiatorType = typesToTest.script.tag
        firstParty = true
      } else {
        initiatorType = typesToTest.xmlhttprequest.tag
        firstParty = true
      }
      typesToTest[initiatorType].tested = true

      expect(entry).toMatchObject({
        connectEnd: expect.any(Number),
        connectStart: expect.any(Number),
        currentUrl: expect.any(String),
        decodedBodySize: expect.any(Number),
        deliveryType: expect.any(String),
        domainLookupEnd: expect.any(Number),
        domainLookupStart: expect.any(Number),
        encodedBodySize: expect.any(Number),
        entryDuration: expect.any(Number),
        entryName: expect.any(String),
        entryType: 'resource',
        eventType: 'BrowserPerformance',
        fetchStart: expect.any(Number),
        firstInterimResponseStart: expect.any(Number),
        firstParty,
        initiatorType,
        nextHopProtocol: expect.any(String),
        pageUrl: expect.any(String),
        redirectEnd: expect.any(Number),
        redirectStart: expect.any(Number),
        renderBlockingStatus: expect.any(String),
        requestStart: expect.any(Number),
        responseEnd: expect.any(Number),
        responseStart: expect.any(Number),
        responseStatus: expect.any(Number),
        secureConnectionStart: expect.any(Number),
        serverTiming: expect.any(String),
        startTime: expect.any(Number),
        timestamp: expect.any(Number),
        transferSize: expect.any(Number),
        workerStart: expect.any(Number)
      })
    })

    /** only the img asset was hosted externally, it should be the only thing tested */
    expect(typesToTest.img.tested).toEqual(true)
    expect(typesToTest.other.tested).toEqual(false)
    expect(typesToTest.script.tested).toEqual(false)
    expect(typesToTest.xmlhttprequest.tested).toEqual(false)
    expect(typesToTest.css.tested).toEqual(false)
  })

  // it('should harvest early when buffer gets too large (overall quantity)', async () => {
  //   const testUrl = await browser.testHandle.assetURL('instrumented.html', { init: { generic_events: { harvestTimeSeconds: 30 } } })
  //   await browser.url(testUrl)
  //     .then(() => browser.waitForAgentLoad())

  //   /** harvest should trigger immediately */
  //   const [insightsResult] = await Promise.all([
  //     insightsCapture.waitForResult({ timeout: 10000 }),
  //     browser.execute(function () {
  //       let i = 0
  //       while (i++ < 1010) {
  //         newrelic.addPageAction('foobar')
  //       }
  //     })
  //   ])
  //   expect(insightsResult.length).toBeTruthy()
  // })

  // it('should harvest early when buffer gets too large (one big event)', async () => {
  //   const testUrl = await browser.testHandle.assetURL('instrumented.html', { init: { generic_events: { harvestTimeSeconds: 30 } } })
  //   await browser.url(testUrl)
  //     .then(() => browser.waitForAgentLoad())

  //   const [insightsResult] = await Promise.all([
  //     insightsCapture.waitForResult({ timeout: 10000 }),
  //     browser.execute(function () {
  //       newrelic.addPageAction('foobar', createLargeObject())
  //       function createLargeObject () {
  //         let i = 0; let obj = {}
  //         while (i++ < 64000) {
  //           obj[i] = 'x'
  //         }
  //         return obj
  //       }
  //     })
  //   ])
  //   expect(insightsResult.length).toBeTruthy()
  // })

  // it('should not harvest if too large', async () => {
  //   const testUrl = await browser.testHandle.assetURL('instrumented.html')
  //   await browser.url(testUrl)
  //     .then(() => browser.waitForAgentLoad())

  //   const [insightsResult] = await Promise.all([
  //     insightsCapture.waitForResult({ timeout: 10000 }),
  //     browser.execute(function () {
  //       newrelic.addPageAction('foobar', createLargeObject())
  //       function createLargeObject () {
  //         let i = 0; let obj = {}
  //         while (i++ < 100000) {
  //           obj[i] = Math.random()
  //         }
  //         return obj
  //       }
  //     })
  //   ])

  //   expect(insightsResult).toEqual([])
  // })

  // it('should honor payload precedence', async () => {
  //   const testUrl = await browser.testHandle.assetURL('instrumented.html')
  //   await browser.url(testUrl)
  //     .then(() => browser.waitForAgentLoad())

  //   const [[{ request: { body: { ins: pageActionsHarvest } } }]] = await Promise.all([
  //     insightsCapture.waitForResult({ totalCount: 1 }),
  //     browser.execute(function () {
  //       newrelic.setCustomAttribute('browserHeight', 705)
  //       newrelic.setCustomAttribute('eventType', 'globalPageAction')
  //       newrelic.setCustomAttribute('globalCustomAttribute', 12345)
  //       newrelic.addPageAction('MyEvent', { referrerUrl: 'http://test.com', localCustomAttribute: { bar: 'baz' }, eventType: 'localPageAction' })
  //     })
  //   ])

  //   expect(pageActionsHarvest.length).toEqual(1)

  //   let event = pageActionsHarvest[0]
  //   expect(event.actionName).toEqual('MyEvent')
  //   expect(event.eventType).toEqual('PageAction') //, 'pageAction should not be overwritable (globalPageAction, localPageAction)
  //   expect(event.browserHeight).not.toEqual(705) //, 'browser height should not be overwritable'
  //   expect(event.globalCustomAttribute).toEqual(12345) //, 'global custom attributes passed through')
  //   expect(event.localCustomAttribute).toEqual('{"bar":"baz"}') //, 'local custom attributes passed through')
  // })

  // it('NEWRELIC-9370: should not throw an exception when calling addPageAction with window.location before navigating', async () => {
  //   const errorsCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testErrorsRequest })
  //   const testUrl = await browser.testHandle.assetURL('api/addPageAction-unload.html')
  //   await browser.url(testUrl)
  //     .then(() => browser.waitForAgentLoad())

  //   const [insightsHarvests, errorsHarvests] = await Promise.all([
  //     insightsCapture.waitForResult({ totalCount: 1 }),
  //     errorsCapture.waitForResult({ timeout: 10000 }),
  //     browser.execute(function () {
  //       window.triggerPageActionNavigation()
  //     })
  //   ])

  //   expect(errorsHarvests).toEqual([])
  //   expect(insightsHarvests[0].request.body.ins).toEqual(expect.arrayContaining([
  //     expect.objectContaining({
  //       actionName: 'pageaction',
  //       href: testUrl
  //     })
  //   ]))
  // })
})
