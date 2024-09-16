import { JSONPath } from 'jsonpath-plus'
import { checkAjaxEvents, checkSpa } from '../../util/basic-checks'
import { supportsFetch } from '../../../tools/browser-matcher/common-matchers.mjs'
import { testAjaxEventsRequest, testInteractionEventsRequest } from '../../../tools/testing-server/utils/expect-tests'

describe.withBrowsersMatching(supportsFetch)('Fetch SPA Interaction Tracking', () => {
  let interactionsCapture, ajaxEventsCapture

  beforeEach(async () => {
    [interactionsCapture, ajaxEventsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testInteractionEventsRequest },
      { test: testAjaxEventsRequest }
    ])
  })

  it('should capture the ajax in the initial interaction when sent before page load', async () => {
    const [interactionHarvests, ajaxEventsHarvests] = await Promise.all([
      interactionsCapture.waitForResult({ totalCount: 1 }),
      ajaxEventsCapture.waitForResult({ timeout: 10000 }),
      await browser.url(
        await browser.testHandle.assetURL('ajax/fetch-before-load.html')
      ).then(() => browser.waitForAgentLoad())
    ])

    checkSpa(interactionHarvests[0].request)
    expect(
      JSONPath({ path: '$.[*].request.body.[?(!!@ && @.path===\'/json\')]', json: interactionHarvests })
    ).toEqual(expect.arrayContaining([
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
    ]))
    expect(
      JSONPath({ path: '$.[*].request.body.[?(!!@ && @.path===\'/json\')]', json: ajaxEventsHarvests })
    ).toEqual([])
  })

  it('should capture the ajax in the click interaction', async () => {
    await browser.url(
      await browser.testHandle.assetURL('ajax/fetch-simple.html')
    ).then(() => browser.waitForAgentLoad())

    const [interactionHarvests, ajaxEventsHarvests] = await Promise.all([
      interactionsCapture.waitForResult({ totalCount: 2 }),
      ajaxEventsCapture.waitForResult({ timeout: 10000 }),
      $('#sendAjax').click()
    ])

    checkSpa(interactionHarvests[1].request, { trigger: 'click' })
    expect(
      JSONPath({ path: '$.[*].request.body.[?(!!@ && @.path===\'/json\')]', json: interactionHarvests })
    ).toEqual(expect.arrayContaining([
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
    ]))
    expect(
      JSONPath({ path: '$.[*].request.body.[?(!!@ && @.path===\'/json\')]', json: ajaxEventsHarvests })
    ).toEqual([])
  })

  it('should not capture the ajax in the initial interaction when sent after page load', async () => {
    const [interactionHarvests, ajaxEventsHarvests] = await Promise.all([
      interactionsCapture.waitForResult({ totalCount: 1 }),
      ajaxEventsCapture.waitForResult({ timeout: 10000 }),
      await browser.url(
        await browser.testHandle.assetURL('ajax/fetch-after-load.html')
      ).then(() => browser.waitForAgentLoad())
    ])

    checkSpa(interactionHarvests[0].request)
    expect(
      JSONPath({ path: '$.[*].request.body.[?(!!@ && @.path===\'/json\')]', json: interactionHarvests })
    ).toEqual([])
    expect(
      JSONPath({ path: '$.[*].request.body.[?(!!@ && @.path===\'/json\')]', json: ajaxEventsHarvests })
    ).toEqual([
      expect.objectContaining({ requestedWith: 'fetch', path: '/json' })
    ])
  })

  it('should capture the ajax request and response size', async () => {
    await browser.url(
      await browser.testHandle.assetURL('ajax/fetch-post.html')
    ).then(() => browser.waitForAgentLoad())

    const [interactionHarvests] = await Promise.all([
      interactionsCapture.waitForResult({ totalCount: 2 }),
      $('#sendAjax').click()
    ])

    checkSpa(interactionHarvests[1].request, { trigger: 'click' })
    expect(
      JSONPath({ path: '$.[*].request.body.[?(!!@ && @.path===\'/echo\')]', json: interactionHarvests })
    ).toEqual([
      expect.objectContaining({ requestedWith: 'fetch', path: '/echo', requestBodySize: 3, responseBodySize: 3 })
    ])
  })

  it('should not break the agent when fetch called with no params', async () => {
    await browser.url(
      await browser.testHandle.assetURL('ajax/fetch-empty.html')
    ).then(() => browser.waitForAgentLoad())

    const [interactionHarvests] = await Promise.all([
      interactionsCapture.waitForResult({ timeout: 10000 }),
      $('#sendAjax').click()
    ])

    expect(
      JSONPath({ path: `$.[*].request.body.[?(!!@ && @.domain==='${browser.testHandle.assetServerConfig.host + ':' + browser.testHandle.assetServerConfig.port}')]`, json: interactionHarvests })
    ).toEqual([])
  })

  it('should create nested ajax nodes when ajax is nested', async () => {
    await browser.url(
      await browser.testHandle.assetURL('ajax/fetch-nested.html')
    ).then(() => browser.waitForAgentLoad())

    const [interactionHarvests] = await Promise.all([
      interactionsCapture.waitForResult({ totalCount: 2 }),
      $('#sendAjax').click()
    ])

    checkSpa(interactionHarvests[1].request, { trigger: 'click' })
    const jsonFetch = JSONPath({ path: '$.[*].request.body.[?(!!@ && @.path===\'/json\')]', json: interactionHarvests })
    expect(jsonFetch.length).toEqual(1)
    expect(
      JSONPath({ path: '$.children.[?(!!@ && @.path===\'/echo\')]', json: jsonFetch[0] })
    ).toEqual([
      expect.objectContaining({ requestedWith: 'fetch', path: '/echo' })
    ])
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
    await $('#sendAjax').click()
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
    await $('#sendAjax').click()
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
    const [interactionHarvests] = await Promise.all([
      interactionsCapture.waitForResult({ totalCount: 1 }),
      await browser.url(
        await browser.testHandle.assetURL('distributed_tracing/fetch-sameorigin.html', {
          init: {
            distributed_tracing: { enabled: true }
          },
          injectUpdatedLoaderConfig: true
        })
      ).then(() => browser.waitForAgentLoad())
    ])

    checkSpa(interactionHarvests[0].request)
    expect(
      JSONPath({ path: '$.[*].request.body.[?(!!@ && @.path && @.path.match(/^\\/dt\\/[\\w\\d]+/i))]', json: interactionHarvests })
    ).toEqual([
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

  it('creates interaction event data for fetch', async () => {
    await browser.url(await browser.testHandle.assetURL('ajax/fetch-simple.html'))
      .then(() => browser.waitForAgentLoad())

    const [interactionHarvests] = await Promise.all([
      interactionsCapture.waitForResult({ totalCount: 2 }),
      $('#sendAjax').click()
    ])

    checkAjaxEvents({ body: interactionHarvests[1].request.body[0].children, query: interactionHarvests[1].request.query }, { specificPath: '/json' })

    const ajaxEvent = JSONPath({ path: '$.[*].request.body.[?(!!@ && @.path===\'/json\')]', json: interactionHarvests })[0]
    expect(ajaxEvent.end).toBeGreaterThanOrEqual(ajaxEvent.start)
    expect(ajaxEvent.callbackEnd).toBeGreaterThanOrEqual(ajaxEvent.end)
  })

  it('creates interaction event data for erred fetch', async () => {
    await browser.url(await browser.testHandle.assetURL('ajax/fetch-404.html'))
      .then(() => browser.waitForAgentLoad())

    const [interactionHarvests] = await Promise.all([
      interactionsCapture.waitForResult({ totalCount: 2 }),
      $('#sendAjax').click()
    ])

    checkAjaxEvents({ body: interactionHarvests[1].request.body[0].children, query: interactionHarvests[1].request.query }, { specificPath: '/paththatdoesnotexist' })

    const ajaxEvent = JSONPath({ path: '$.[*].request.body.[?(!!@ && @.path===\'/paththatdoesnotexist\')]', json: interactionHarvests })[0]
    expect(ajaxEvent.status).toEqual(404)
  })

  it('only captures pre-load ajax calls in the spa payload', async () => {
    const [interactionHarvests, ajaxEventsHarvests] = await Promise.all([
      interactionsCapture.waitForResult({ totalCount: 1 }),
      ajaxEventsCapture.waitForResult({ timeout: 10000 }),
      browser.url(await browser.testHandle.assetURL('ajax/fetch-before-load.html'))
        .then(() => browser.waitForAgentLoad())
    ])

    expect(
      JSONPath({ path: '$.[*].request.body.[?(!!@ && @.path===\'/json\')]', json: interactionHarvests }).length
    ).toEqual(1)
    expect(
      JSONPath({ path: '$.[*].request.body.[?(!!@ && @.path===\'/json\')]', json: ajaxEventsHarvests }).length
    ).toEqual(0)
  })
})
