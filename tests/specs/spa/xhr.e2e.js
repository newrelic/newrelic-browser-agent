import { checkAjaxEvents, checkSpa } from '../../util/basic-checks'
import { testAjaxEventsRequest, testInteractionEventsRequest } from '../../../tools/testing-server/utils/expect-tests'
import { JSONPath } from 'jsonpath-plus'

describe('XHR SPA Interaction Tracking', () => {
  let interactionsCapture

  beforeEach(async () => {
    interactionsCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testInteractionEventsRequest })
  })

  it('should capture the ajax in the initial interaction when sent before load', async () => {
    const [interactionsHarvests] = await Promise.all([
      interactionsCapture.waitForResult({ totalCount: 1 }),
      await browser.url(
        await browser.testHandle.assetURL('ajax/xhr-before-load.html')
      ).then(() => browser.waitForAgentLoad())
    ])

    checkSpa(interactionsHarvests[0].request)
    expect(interactionsHarvests[0].request.body).toEqual([
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
      await browser.testHandle.assetURL('ajax/xhr-simple.html')
    ).then(() => browser.waitForAgentLoad())

    const [interactionsHarvests] = await Promise.all([
      interactionsCapture.waitForResult({ timeout: 10000 }),
      $('#sendAjax').click()
    ])

    checkSpa(interactionsHarvests[1].request, { trigger: 'click' })
    expect(interactionsHarvests[1].request.body).toEqual([
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
    const [interactionsHarvests] = await Promise.all([
      interactionsCapture.waitForResult({ totalCount: 1 }),
      await browser.url(
        await browser.testHandle.assetURL('ajax/xhr-after-load.html')
      ).then(() => browser.waitForAgentLoad())
    ])

    checkSpa(interactionsHarvests[0].request)
    expect(interactionsHarvests[0].request.body).toEqual([
      expect.objectContaining({
        category: 'Initial page load',
        type: 'interaction',
        trigger: 'initialPageLoad',
        children: expect.arrayContaining([
          expect.not.objectContaining({
            type: 'ajax',
            requestedWith: 'XMLHttpRequest',
            path: '/json'
          })
        ])
      })
    ])
  })

  it('should capture the ajax request and response size', async () => {
    await browser.url(
      await browser.testHandle.assetURL('ajax/xhr-post.html')
    ).then(() => browser.waitForAgentLoad())

    const [interactionsHarvests] = await Promise.all([
      interactionsCapture.waitForResult({ timeout: 10000 }),
      $('#sendAjax').click()
    ])

    checkSpa(interactionsHarvests[1].request, { trigger: 'click' })
    expect(interactionsHarvests[1].request.body).toEqual([
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
      await browser.testHandle.assetURL('ajax/xhr-no-send.html')
    ).then(() => browser.waitForAgentLoad())

    const [interactionsHarvests] = await Promise.all([
      interactionsCapture.waitForResult({ timeout: 10000 }),
      $('#sendAjax').click()
    ])

    checkSpa(interactionsHarvests[1].request, { trigger: 'click' })
    expect(interactionsHarvests[1].request.body).toEqual(expect.arrayContaining([
      expect.objectContaining({
        category: 'Route change',
        type: 'interaction',
        trigger: 'click',
        children: [{ key: 'actionText', type: 'stringAttribute', value: 'Send Ajax' }]
      })
    ]))
  })

  it('should create nested ajax nodes when ajax is nested', async () => {
    await browser.url(
      await browser.testHandle.assetURL('ajax/xhr-nested.html')
    ).then(() => browser.waitForAgentLoad())

    const [interactionsHarvests] = await Promise.all([
      interactionsCapture.waitForResult({ timeout: 10000 }),
      $('#sendAjax').click()
    ])

    checkSpa(interactionsHarvests[1].request, { trigger: 'click' })
    expect(interactionsHarvests[1].request.body).toEqual(expect.arrayContaining([
      expect.objectContaining({
        category: 'Route change',
        type: 'interaction',
        trigger: 'click',
        children: expect.arrayContaining([
          expect.objectContaining({
            type: 'ajax',
            requestedWith: 'XMLHttpRequest',
            path: '/json',
            children: expect.arrayContaining([
              expect.objectContaining({
                type: 'ajax',
                requestedWith: 'XMLHttpRequest',
                path: '/echo'
              })
            ])
          })
        ])
      })
    ]))
  })

  it('should capture distributed tracing properties', async () => {
    const [interactionsHarvests] = await Promise.all([
      interactionsCapture.waitForResult({ totalCount: 1 }),
      await browser.url(
        await browser.testHandle.assetURL('distributed_tracing/xhr-sameorigin.html', {
          init: {
            distributed_tracing: { enabled: true }
          },
          injectUpdatedLoaderConfig: true
        })
      ).then(() => browser.waitForAgentLoad())
    ])

    checkSpa(interactionsHarvests[0].request)
    expect(interactionsHarvests[0].request.body).toEqual([
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

  it('creates interaction event data for xhr', async () => {
    await browser.url(await browser.testHandle.assetURL('ajax/xhr-simple.html'))
      .then(() => browser.waitForAgentLoad())

    const [interactionsHarvests] = await Promise.all([
      interactionsCapture.waitForResult({ timeout: 10000 }),
      $('#sendAjax').click()
    ])

    checkAjaxEvents({ body: interactionsHarvests[1].request.body[0].children, query: interactionsHarvests[1].request.query }, { specificPath: '/json' })

    const ajaxEvent = interactionsHarvests[1].request.body[0].children.find(event => event.path === '/json')
    expect(ajaxEvent.end).toBeGreaterThanOrEqual(ajaxEvent.start)
    expect(ajaxEvent.callbackEnd).toBeGreaterThanOrEqual(ajaxEvent.end)
  })

  it('creates interaction event data for erred xhr', async () => {
    await browser.url(await browser.testHandle.assetURL('ajax/xhr-404.html'))
      .then(() => browser.waitForAgentLoad())

    const [interactionsHarvests] = await Promise.all([
      interactionsCapture.waitForResult({ timeout: 10000 }),
      $('#sendAjax').click()
    ])

    checkAjaxEvents({ body: interactionsHarvests[1].request.body[0].children, query: interactionsHarvests[1].request.query }, { specificPath: '/paththatdoesnotexist' })

    const ajaxEvent = interactionsHarvests[1].request.body[0].children.find(event => event.path === '/paththatdoesnotexist')
    expect(ajaxEvent.status).toEqual(404)
  })

  it('creates interaction event data for xhr with network error', async () => {
    await browser.url(await browser.testHandle.assetURL('ajax/xhr-network-error.html'))
      .then(() => browser.waitForAgentLoad())

    const [interactionsHarvests] = await Promise.all([
      interactionsCapture.waitForResult({ timeout: 10000 }),
      $('#sendAjax').click()
    ])

    checkAjaxEvents({ body: interactionsHarvests[1].request.body[0].children, query: interactionsHarvests[1].request.query }, { specificPath: '/bizbaz' })

    const ajaxEvent = interactionsHarvests[1].request.body[0].children.find(event => event.path === '/bizbaz')
    expect(ajaxEvent.status).toEqual(0)
  })

  it('includes callbackDuration with spa loader', async () => {
    await browser.url(await browser.testHandle.assetURL('ajax/xhr-callback-duration.html'))
      .then(() => browser.waitForAgentLoad())

    const [interactionsHarvests] = await Promise.all([
      interactionsCapture.waitForResult({ timeout: 10000 }),
      $('#sendAjax').click()
    ])

    checkAjaxEvents({ body: interactionsHarvests[1].request.body[0].children, query: interactionsHarvests[1].request.query }, { specificPath: '/json' })

    const ajaxEvent = interactionsHarvests[1].request.body[0].children.find(event => event.path === '/json')
    // Ajax event should have a callbackDuration when picked up by the SPA feature
    expect(ajaxEvent.callbackDuration).toBeGreaterThan(0)
  })

  it('produces the correct interaction event timings when xhr times out', async () => {
    await browser.url(await browser.testHandle.assetURL('ajax/xhr-timeout.html'))
      .then(() => browser.waitForAgentLoad())

    const [interactionsHarvests] = await Promise.all([
      interactionsCapture.waitForResult({ timeout: 10000 }),
      $('#sendAjax').click()
    ])

    checkAjaxEvents({ body: interactionsHarvests[1].request.body[0].children, query: interactionsHarvests[1].request.query }, { specificPath: '/delayed' })

    const ajaxEvent = interactionsHarvests[1].request.body[0].children.find(event => event.path === '/delayed')
    // Ajax event should have a callbackDuration when picked up by the SPA feature
    expect(ajaxEvent.callbackDuration).toBeGreaterThan(0)
    // Ajax event should have a 0 status when timed out
    expect(ajaxEvent.status).toEqual(0)
  })

  it('produces interaction event data when xhr is aborted', async () => {
    await browser.url(await browser.testHandle.assetURL('ajax/xhr-abort.html'))
      .then(() => browser.waitForAgentLoad())

    const [interactionsHarvests] = await Promise.all([
      interactionsCapture.waitForResult({ timeout: 10000 }),
      $('#sendAjax').click()
    ])

    checkAjaxEvents({ body: interactionsHarvests[1].request.body[0].children, query: interactionsHarvests[1].request.query }, { specificPath: '/delayed' })

    const ajaxEvent = interactionsHarvests[1].request.body[0].children.find(event => event.path === '/delayed')
    expect(ajaxEvent.status).toEqual(0)
  })

  it('produces interaction event data when xhr is 3rd party listener patched after agent', async () => {
    await browser.url(await browser.testHandle.assetURL('ajax/xhr-patch-listener-after.html'))
      .then(() => browser.waitForAgentLoad())

    const [interactionsHarvests] = await Promise.all([
      interactionsCapture.waitForResult({ timeout: 10000 }),
      $('#sendAjax').click()
    ])

    checkSpa(interactionsHarvests[1].request, { trigger: 'click' })
    checkAjaxEvents({ body: interactionsHarvests[1].request.body[0].children, query: interactionsHarvests[1].request.query }, { specificPath: '/json' })

    await expect(browser.execute(function () {
      return window.wrapperInvoked
    })).resolves.toEqual(true)
  })

  it('produces interaction event data for multiple simultaneous xhr and timers', async () => {
    await browser.url(await browser.testHandle.assetURL('ajax/xhr-with-timer.html'))
      .then(() => browser.waitForAgentLoad())

    const [interactionsHarvests] = await Promise.all([
      interactionsCapture.waitForResult({ timeout: 10000 }),
      $('#sendAjax').click()
    ])

    const ajaxCalls = interactionsHarvests[1].request.body[0].children.filter(xhr =>
      xhr.type === 'ajax' && xhr.path === '/json'
    )
    expect(ajaxCalls.length).toEqual(2)

    const timers = interactionsHarvests[1].request.body[0].children.filter(tracer =>
      tracer.type === 'customTracer' && tracer.name === 'timer'
    )
    expect(timers.length).toEqual(2)
  })

  it('only captures pre-load ajax calls in the spa payload', async () => {
    const ajaxEventsCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testAjaxEventsRequest })
    const [interactionResults, eventsResults] = await Promise.all([
      interactionsCapture.waitForResult({ totalCount: 1 }),
      ajaxEventsCapture.waitForResult({ timeout: 10000 }),
      browser.url(await browser.testHandle.assetURL('ajax/xhr-before-load.html'))
        .then(() => browser.waitForAgentLoad())
    ])

    const spaAjaxCalls = JSONPath({ path: '$.[*].request.body.[?(!!@ && @.type===\'ajax\' && @.path===\'/json\')]', json: interactionResults })
    expect(spaAjaxCalls.length).toEqual(1)

    const eventsAjaxCalls = JSONPath({ path: '$.[*].request.body.[?(!!@ && @.type===\'ajax\' && @.path===\'/json\')]', json: eventsResults })
    expect(eventsAjaxCalls.length).toEqual(0)
  })
})
