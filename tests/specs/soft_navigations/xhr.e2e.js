import { checkAjaxEvents, checkSpa } from '../../util/basic-checks'
import { testInteractionEventsRequest } from '../../../tools/testing-server/utils/expect-tests'
import { lambdaTestWebdriverFalse } from '../../../tools/browser-matcher/common-matchers.mjs'

describe('XHR SPA Interaction Tracking', () => {
  let interactionsCapture

  beforeEach(async () => {
    interactionsCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testInteractionEventsRequest })
  })

  it('should capture the ajax in the initial interaction when sent before load', async () => {
    const [interactionHarvests] = await Promise.all([
      interactionsCapture.waitForResult({ totalCount: 1 }),
      await browser.url(
        await browser.testHandle.assetURL('soft_navigations/ajax/xhr-before-load.html')
      ).then(() => browser.waitForAgentLoad())
    ])

    checkSpa(interactionHarvests[0].request)
    expect(interactionHarvests[0].request.body).toEqual([
      expect.objectContaining({
        category: 'Initial page load',
        type: 'interaction',
        trigger: 'initialPageLoad',
        children: expect.arrayContaining([
          expect.objectContaining({
            type: 'ajax',
            requestedWith: 'XMLHttpRequest',
            path: '/json',
            nodeId: expect.any(String),
            children: [],
            method: 'GET',
            status: 200,
            domain: browser.testHandle.assetServerConfig.host + ':' + browser.testHandle.assetServerConfig.port,
            requestBodySize: 0,
            responseBodySize: 14,
            callbackDuration: expect.any(Number),
            callbackEnd: expect.any(Number),
            end: expect.any(Number),
            guid: null,
            timestamp: null,
            traceId: null
          })
        ])
      })
    ])
  })

  it('should capture the ajax in the click interaction', async () => {
    await browser.url(
      await browser.testHandle.assetURL('soft_navigations/ajax/xhr-simple.html')
    ).then(() => browser.waitForAgentLoad())

    const [interactionHarvests] = await Promise.all([
      interactionsCapture.waitForResult({ totalCount: 2 }),
      browser.execute(function () {
        document.getElementById('sendAjax').click()
      })
    ])

    checkSpa(interactionHarvests[1].request, { trigger: 'click' })
    expect(interactionHarvests[1].request.body).toEqual([
      expect.objectContaining({
        category: 'Route change',
        type: 'interaction',
        trigger: 'click',
        children: expect.arrayContaining([
          expect.objectContaining({
            type: 'ajax',
            requestedWith: 'XMLHttpRequest',
            path: '/json',
            nodeId: expect.any(String),
            children: [],
            method: 'GET',
            status: 200,
            domain: browser.testHandle.assetServerConfig.host + ':' + browser.testHandle.assetServerConfig.port,
            requestBodySize: 0,
            responseBodySize: 14,
            callbackDuration: expect.any(Number),
            callbackEnd: expect.any(Number),
            end: expect.any(Number),
            guid: null,
            timestamp: null,
            traceId: null
          })
        ])
      })
    ])
  })

  it('should not capture the ajax in the initial interaction when sent after load', async () => {
    const [interactionHarvests] = await Promise.all([
      interactionsCapture.waitForResult({ totalCount: 1 }),
      await browser.url(
        await browser.testHandle.assetURL('soft_navigations/ajax/xhr-after-load.html')
      ).then(() => browser.waitForAgentLoad())
    ])

    checkSpa(interactionHarvests[0].request)
    expect(interactionHarvests[0].request.body).toEqual([
      expect.objectContaining({
        category: 'Initial page load',
        type: 'interaction',
        trigger: 'initialPageLoad',
        children: expect.any(Array)
      })
    ])
    const expectedAttributeType = browserMatch(lambdaTestWebdriverFalse) ? 'falseAttribute' : 'trueAttribute'
    expect(interactionHarvests[0].request.body[0].children).toEqual([{ key: 'webdriverDetected', type: expectedAttributeType }])
  })

  it('should capture the ajax request and response size', async () => {
    await browser.url(
      await browser.testHandle.assetURL('soft_navigations/ajax/xhr-post.html')
    ).then(() => browser.waitForAgentLoad())

    const [interactionHarvests] = await Promise.all([
      interactionsCapture.waitForResult({ totalCount: 2 }),
      browser.execute(function () {
        document.getElementById('sendAjax').click()
      })
    ])

    checkSpa(interactionHarvests[1].request, { trigger: 'click' })
    expect(interactionHarvests[1].request.body).toEqual([
      expect.objectContaining({
        category: 'Route change',
        type: 'interaction',
        trigger: 'click',
        children: expect.arrayContaining([
          expect.objectContaining({
            type: 'ajax',
            requestedWith: 'XMLHttpRequest',
            path: '/echo',
            requestBodySize: 3,
            responseBodySize: 3
          })
        ])
      })
    ])
  })

  it('should not create an interaction node for a xhr that never sends', async () => {
    await browser.url(
      await browser.testHandle.assetURL('soft_navigations/ajax/xhr-no-send.html')
    ).then(() => browser.waitForAgentLoad())

    const [interactionHarvests] = await Promise.all([
      interactionsCapture.waitForResult({ timeout: 10000 }),
      browser.execute(function () {
        document.getElementById('sendAjax').click()
      })
    ])

    checkSpa(interactionHarvests[1].request, { trigger: 'click' })
    expect(interactionHarvests[1].request.body).toEqual(expect.arrayContaining([
      expect.objectContaining({
        category: 'Route change',
        type: 'interaction',
        trigger: 'click',
        children: expect.any(Array)
      })
    ]))
    interactionHarvests.forEach(interaction => {
      interaction.request.body.forEach(body => {
        expect(body.children).not.toContainEqual(expect.objectContaining({ type: 'ajax' }))
      })
    })
  })

  it('should capture distributed tracing properties', async () => {
    const [interactionHarvests] = await Promise.all([
      interactionsCapture.waitForResult({ totalCount: 1 }),
      await browser.url(
        await browser.testHandle.assetURL('soft_navigations/distributed_tracing/xhr-sameorigin.html', {
          loader: 'spa',
          init: {
            feature_flags: [],
            distributed_tracing: { enabled: true }
          },
          injectUpdatedLoaderConfig: true
        })
      ).then(() => browser.waitForAgentLoad())
    ])

    checkSpa(interactionHarvests[0].request)
    expect(interactionHarvests[0].request.body).toEqual([
      expect.objectContaining({
        category: 'Initial page load',
        type: 'interaction',
        trigger: 'initialPageLoad',
        children: expect.arrayContaining([
          expect.objectContaining({
            type: 'ajax',
            requestedWith: 'XMLHttpRequest',
            path: expect.stringMatching(/^\/dt\/[\w\d]+/),
            guid: expect.stringMatching(/[\w\d]+/),
            traceId: expect.stringMatching(/[\w\d]+/),
            timestamp: expect.toBePositive()
          })
        ])
      })
    ])
  })

  it('creates interaction event data for erred xhr', async () => {
    await Promise.all([
      interactionsCapture.waitForResult({ totalCount: 1 }),
      await browser.url(await browser.testHandle.assetURL('soft_navigations/ajax/xhr-404.html'))
        .then(() => browser.waitForAgentLoad())
    ])

    const [interactionHarvests] = await Promise.all([
      interactionsCapture.waitForResult({ totalCount: 2 }),
      browser.execute(function () {
        document.getElementById('sendAjax').click()
      })
    ])

    checkAjaxEvents({ body: interactionHarvests[1].request.body[0].children, query: interactionHarvests[1].request.query }, { specificPath: '/paththatdoesnotexist' })

    const ajaxEvent = interactionHarvests[1].request.body[0].children.find(event => event.path === '/paththatdoesnotexist')
    expect(ajaxEvent.status).toEqual(404)
  })

  it('creates interaction event data for xhr with network error', async () => {
    await browser.url(await browser.testHandle.assetURL('soft_navigations/ajax/xhr-network-error.html'))
      .then(() => browser.waitForAgentLoad())

    const [interactionHarvests] = await Promise.all([
      interactionsCapture.waitForResult({ totalCount: 2 }),
      browser.execute(function () {
        document.getElementById('sendAjax').click()
      })
    ])

    checkAjaxEvents({ body: interactionHarvests[1].request.body[0].children, query: interactionHarvests[1].request.query }, { specificPath: '/bizbaz' })

    const ajaxEvent = interactionHarvests[1].request.body[0].children.find(event => event.path === '/bizbaz')
    expect(ajaxEvent.status).toEqual(0)
  })

  it('produces interaction event data when xhr is 3rd party listener patched after agent', async () => {
    await browser.url(await browser.testHandle.assetURL('soft_navigations/ajax/xhr-patch-listener-after.html'))
      .then(() => browser.waitForAgentLoad())

    const [interactionHarvests] = await Promise.all([
      interactionsCapture.waitForResult({ totalCount: 2 }),
      browser.execute(function () {
        document.getElementById('sendAjax').click()
      })
    ])

    checkSpa(interactionHarvests[1].request, { trigger: 'click' })
    checkAjaxEvents({ body: interactionHarvests[1].request.body[0].children, query: interactionHarvests[1].request.query }, { specificPath: '/json' })

    await expect(browser.execute(function () {
      return window.wrapperInvoked
    })).resolves.toEqual(true)
  })

  it('accounts for long tasks in XHR listeners after soft navigations', async () => {
    await Promise.all([
      interactionsCapture.waitForResult({ totalCount: 1 }),
      await browser.url(
        await browser.testHandle.assetURL('soft_navigations/ajax/xhr-long-task.html')
      ).then(() => browser.waitForAgentLoad())
    ])

    const [interactionHarvests] = await Promise.all([
      interactionsCapture.waitForResult({ totalCount: 2 }),
      browser.execute(function () {
        document.getElementById('sendXhr').click()
      })
    ])

    const clickIxn = interactionHarvests[1].request.body[0]
    expect(clickIxn).toEqual(expect.objectContaining({
      category: 'Route change',
      type: 'interaction',
      trigger: 'click'
    }))
    const ajaxEvents = clickIxn.children.filter(e => e.type === 'ajax')
    expect(ajaxEvents.length).toEqual(1)
    expect(ajaxEvents[0].callbackDuration).toBeGreaterThanOrEqual(1000) // this is the task duration on that html
    expect(ajaxEvents[0].callbackEnd).toBeGreaterThanOrEqual(ajaxEvents[0].end + 1000) // callbackEnd ~= end + lt duration
    expect(clickIxn.end).toBeLessThan(ajaxEvents[0].callbackEnd + 3) // interaction end should be about the same as XHR cb end with some tolerance for rounding errors & cycle delays
  })
})
