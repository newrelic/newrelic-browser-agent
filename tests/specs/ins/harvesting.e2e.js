const { testInsRequest, testErrorsRequest } = require('../../../tools/testing-server/utils/expect-tests')

describe('ins harvesting', () => {
  let insightsCapture

  beforeEach(async () => {
    insightsCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testInsRequest })
  })

  it('should submit PageActions', async () => {
    const testUrl = await browser.testHandle.assetURL('instrumented.html')
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

  it('should submit PageActions even with other features disabled', async () => {
    const testUrl = await browser.testHandle.assetURL('instrumented.html', { init: { user_actions: { enabled: false } } })
    await browser.url(testUrl).then(() => browser.waitForAgentLoad())

    const [[{ request: { body: { ins: pageActionsHarvest } } }]] = await Promise.all([
      insightsCapture.waitForResult({ totalCount: 1 }),
      browser.execute(function () {
        newrelic.addPageAction('DummyEvent', { free: 'tacos' })
      })
    ])

    expect(pageActionsHarvest.length).toEqual(1)
    expect(pageActionsHarvest[0].actionName).toEqual('DummyEvent')
  })

  it('should submit UserAction', async () => {
    const testUrl = await browser.testHandle.assetURL('user-actions.html')
    await browser.url(testUrl).then(() => browser.waitForAgentLoad())

    const [[{ request: { body: { ins: userActionsHarvest } } }]] = await Promise.all([
      insightsCapture.waitForResult({ totalCount: 1 }),
      $('#pay-btn').click().then(async () => await $('#textbox').click())
    ])

    expect(await $('#pay-btn').isFocused()).toEqual(false) // should've shifted focus to textbox
    expect(userActionsHarvest.length).toEqual(2) // these are the 2 clicks, as element blurs should not be captured
    expect(userActionsHarvest[0]).toMatchObject({
      eventType: 'UserAction',
      action: 'click',
      targetId: 'pay-btn',
      targetTag: 'BUTTON',
      targetType: 'submit',
      targetClass: 'btn-cart-add flex-grow container',
      pageUrl: expect.any(String),
      timestamp: expect.any(Number)
    })
    expect(userActionsHarvest[1]).toMatchObject({
      eventType: 'UserAction',
      action: 'click',
      targetId: 'textbox',
      targetTag: 'INPUT',
      targetType: 'text',
      targetClass: '',
      pageUrl: expect.any(String),
      timestamp: expect.any(Number)
    })
  })

  it('should harvest early when buffer gets too large (overall quantity)', async () => {
    const testUrl = await browser.testHandle.assetURL('instrumented.html', { init: { generic_events: { harvestTimeSeconds: 30 } } })
    await browser.url(testUrl)
      .then(() => browser.waitForAgentLoad())

    /** harvest should trigger immediately */
    const [insightsResult] = await Promise.all([
      insightsCapture.waitForResult({ timeout: 10000 }),
      browser.execute(function () {
        let i = 0
        while (i++ < 1010) {
          newrelic.addPageAction('foobar')
        }
      })
    ])
    expect(insightsResult.length).toBeTruthy()
  })

  it('should harvest early when buffer gets too large (one big event)', async () => {
    const testUrl = await browser.testHandle.assetURL('instrumented.html', { init: { generic_events: { harvestTimeSeconds: 30 } } })
    await browser.url(testUrl)
      .then(() => browser.waitForAgentLoad())

    const [insightsResult] = await Promise.all([
      insightsCapture.waitForResult({ timeout: 10000 }),
      browser.execute(function () {
        newrelic.addPageAction('foobar', createLargeObject())
        function createLargeObject () {
          let i = 0; let obj = {}
          while (i++ < 64000) {
            obj[i] = 'x'
          }
          return obj
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
          while (i++ < 100000) {
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
