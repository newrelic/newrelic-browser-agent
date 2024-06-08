import { checkAjaxEvents, checkSpa } from '../../util/basic-checks'
import { supportsFetch } from '../../../tools/browser-matcher/common-matchers.mjs'

describe.withBrowsersMatching(supportsFetch)('Fetch SPA Interaction Tracking', () => {
  it('should capture the ajax in the initial interaction when sent before page load', async () => {
    const [interactionResults] = await Promise.all([
      browser.testHandle.expectInteractionEvents(10000),
      await browser.url(
        await browser.testHandle.assetURL('ajax/fetch-before-load.html')
      ).then(() => browser.waitForAgentLoad())
    ])

    checkSpa(interactionResults.request)
    expect(interactionResults.request.body).toEqual([
      expect.objectContaining({
        category: 'Initial page load',
        type: 'interaction',
        trigger: 'initialPageLoad',
        children: expect.arrayContaining([
          expect.objectContaining({
            type: 'ajax',
            requestedWith: 'fetch',
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
      await browser.testHandle.assetURL('ajax/fetch-simple.html')
    ).then(() => browser.waitForAgentLoad())

    const [interactionResults] = await Promise.all([
      browser.testHandle.expectInteractionEvents(10000),
      browser.execute(function () { document.querySelector('#sendAjax').click() })
    ])

    checkSpa(interactionResults.request, { trigger: 'click' })
    expect(interactionResults.request.body).toEqual([
      expect.objectContaining({
        category: 'Route change',
        type: 'interaction',
        trigger: 'click',
        children: expect.arrayContaining([
          expect.objectContaining({
            type: 'ajax',
            requestedWith: 'fetch',
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

  it('should not capture the ajax in the initial interaction when sent after page load', async () => {
    const [interactionResults] = await Promise.all([
      browser.testHandle.expectInteractionEvents(10000),
      await browser.url(
        await browser.testHandle.assetURL('ajax/fetch-after-load.html')
      ).then(() => browser.waitForAgentLoad())
    ])

    checkSpa(interactionResults.request)
    expect(interactionResults.request.body).toEqual([
      expect.objectContaining({
        category: 'Initial page load',
        type: 'interaction',
        trigger: 'initialPageLoad',
        children: expect.arrayContaining([
          expect.not.objectContaining({
            type: 'ajax',
            requestedWith: 'fetch',
            path: '/json'
          })
        ])
      })
    ])
  })

  it('should capture the ajax request and response size', async () => {
    await browser.url(
      await browser.testHandle.assetURL('ajax/fetch-post.html')
    ).then(() => browser.waitForAgentLoad())

    const [interactionResults] = await Promise.all([
      browser.testHandle.expectInteractionEvents(10000),
      browser.execute(function () { document.querySelector('#sendAjax').click() })
    ])

    checkSpa(interactionResults.request, { trigger: 'click' })
    expect(interactionResults.request.body).toEqual([
      expect.objectContaining({
        category: 'Route change',
        type: 'interaction',
        trigger: 'click',
        children: expect.arrayContaining([
          expect.objectContaining({
            type: 'ajax',
            requestedWith: 'fetch',
            path: '/echo',
            requestBodySize: 3,
            responseBodySize: 3
          })
        ])
      })
    ])
  })

  it('should not break the agent when fetch called with no params', async () => {
    await browser.url(
      await browser.testHandle.assetURL('ajax/fetch-empty.html')
    ).then(() => browser.waitForAgentLoad())

    const [, eventResults] = await Promise.all([
      browser.testHandle.expectInteractionEvents(10000, true),
      browser.testHandle.expectEvents(10000),
      browser.execute(function () { document.querySelector('#sendAjax').click() })
    ])

    expect(eventResults.request.body).toEqual(expect.arrayContaining([
      expect.not.objectContaining({
        domain: browser.testHandle.assetServerConfig.host + ':' + browser.testHandle.assetServerConfig.port
      })
    ]))
  })

  it('should create nested ajax nodes when ajax is nested', async () => {
    await browser.url(
      await browser.testHandle.assetURL('ajax/fetch-nested.html')
    ).then(() => browser.waitForAgentLoad())

    const [interactionResults] = await Promise.all([
      browser.testHandle.expectInteractionEvents(10000),
      browser.execute(function () { document.querySelector('#sendAjax').click() })
    ])

    checkSpa(interactionResults.request, { trigger: 'click' })
    expect(interactionResults.request.body).toEqual(expect.arrayContaining([
      expect.objectContaining({
        category: 'Route change',
        type: 'interaction',
        trigger: 'click',
        children: expect.arrayContaining([
          expect.objectContaining({
            type: 'ajax',
            requestedWith: 'fetch',
            path: '/json',
            children: expect.arrayContaining([
              expect.objectContaining({
                type: 'ajax',
                requestedWith: 'fetch',
                path: '/echo'
              })
            ])
          })
        ])
      })
    ]))
  })

  it('should not molest the response object when wrapping', async () => {
    await browser.url(
      await browser.testHandle.assetURL('ajax/fetch-response-object-check.html')
    ).then(() => browser.waitForAgentLoad())

    await browser.waitUntil(
      () => browser.execute(function () {
        return window.checkRunning === false
      }),
      {
        timeout: 10000,
        timeoutMsg: 'Check never finished'
      })

    const initialPageLoadCheck = await browser.execute(function () {
      return window.checkResults
    })

    expect(initialPageLoadCheck).toEqual([[true], [true], [true], [true]])

    await browser.execute(function () {
      window.clearResults()
    })
    await browser.execute(function () { document.querySelector('#sendAjax').click() })
    await browser.waitUntil(
      () => browser.execute(function () {
        return window.checkRunning === false
      }),
      {
        timeout: 10000,
        timeoutMsg: 'Check never finished'
      })
    const clickCheck = await browser.execute(function () {
      return window.checkResults
    })

    expect(clickCheck).toEqual([[true], [true], [true], [true]])
  })

  it('should not molest the response object when wrapping and response is form data', async () => {
    await browser.url(
      await browser.testHandle.assetURL('ajax/fetch-response-form-data-check.html')
    ).then(() => browser.waitForAgentLoad())

    await browser.waitUntil(
      () => browser.execute(function () {
        return window.checkRunning === false
      }),
      {
        timeout: 10000,
        timeoutMsg: 'Check never finished'
      })

    const initialPageLoadCheck = await browser.execute(function () {
      return window.checkResults
    })

    expect(initialPageLoadCheck).toEqual([[true]])

    await browser.execute(function () {
      window.clearResults()
    })
    await browser.execute(function () { document.querySelector('#sendAjax').click() })
    await browser.waitUntil(
      () => browser.execute(function () {
        return window.checkRunning === false
      }),
      {
        timeout: 10000,
        timeoutMsg: 'Check never finished'
      })
    const clickCheck = await browser.execute(function () {
      return window.checkResults
    })

    expect(clickCheck).toEqual([[true]])
  })

  it('should capture distributed tracing properties', async () => {
    const [interactionResults] = await Promise.all([
      browser.testHandle.expectInteractionEvents(10000),
      await browser.url(
        await browser.testHandle.assetURL('distributed_tracing/fetch-sameorigin.html', {
          init: {
            distributed_tracing: { enabled: true }
          },
          injectUpdatedLoaderConfig: true
        })
      ).then(() => browser.waitForAgentLoad())
    ])

    checkSpa(interactionResults.request)
    expect(interactionResults.request.body).toEqual([
      expect.objectContaining({
        category: 'Initial page load',
        type: 'interaction',
        trigger: 'initialPageLoad',
        children: expect.arrayContaining([
          expect.objectContaining({
            type: 'ajax',
            requestedWith: 'fetch',
            path: expect.stringMatching(/^\/dt\/[\w\d]+/),
            guid: expect.stringMatching(/[\w\d]+/),
            traceId: expect.stringMatching(/[\w\d]+/),
            timestamp: expect.toBePositive()
          })
        ])
      })
    ])
  })

  it('creates interaction event data for fetch', async () => {
    await browser.url(await browser.testHandle.assetURL('ajax/fetch-simple.html'))
      .then(() => browser.waitForAgentLoad())

    const [interactionEventsHarvest] = await Promise.all([
      browser.testHandle.expectInteractionEvents(),
      browser.execute(function () { document.querySelector('#sendAjax').click() })
    ])

    checkAjaxEvents({ body: interactionEventsHarvest.request.body[0].children, query: interactionEventsHarvest.request.query }, { specificPath: '/json' })

    const ajaxEvent = interactionEventsHarvest.request.body[0].children.find(event => event.path === '/json')
    expect(ajaxEvent.end).toBeGreaterThanOrEqual(ajaxEvent.start)
    expect(ajaxEvent.callbackEnd).toBeGreaterThanOrEqual(ajaxEvent.end)
  })

  it('creates interaction event data for erred fetch', async () => {
    await browser.url(await browser.testHandle.assetURL('ajax/fetch-404.html'))
      .then(() => browser.waitForAgentLoad())

    const [interactionEventsHarvest] = await Promise.all([
      browser.testHandle.expectInteractionEvents(),
      browser.execute(function () { document.querySelector('#sendAjax').click() })
    ])

    checkAjaxEvents({ body: interactionEventsHarvest.request.body[0].children, query: interactionEventsHarvest.request.query }, { specificPath: '/paththatdoesnotexist' })

    const ajaxEvent = interactionEventsHarvest.request.body[0].children.find(event => event.path === '/paththatdoesnotexist')
    expect(ajaxEvent.status).toEqual(404)
  })
})
