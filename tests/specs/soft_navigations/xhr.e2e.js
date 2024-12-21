import { checkAjaxEvents, checkSpa } from '../../util/basic-checks'
import { testInteractionEventsRequest } from '../../../tools/testing-server/utils/expect-tests'

describe('XHR SPA Interaction Tracking', () => {
  const config = { loader: 'spa', init: { feature_flags: ['soft_nav'] } }
  let interactionsCapture

  beforeEach(async () => {
    interactionsCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testInteractionEventsRequest })
  })

  it('should capture the ajax in the initial interaction when sent before load', async () => {
    const [interactionHarvests] = await Promise.all([
      interactionsCapture.waitForResult({ totalCount: 1 }),
      await browser.url(
        await browser.testHandle.assetURL('soft_navigations/ajax/xhr-before-load.html', config)
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
      await browser.testHandle.assetURL('soft_navigations/ajax/xhr-simple.html', config)
    ).then(() => browser.waitForAgentLoad())

    const [interactionHarvests] = await Promise.all([
      interactionsCapture.waitForResult({ timeout: 10000 }),
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
        await browser.testHandle.assetURL('soft_navigations/ajax/xhr-after-load.html', config)
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
    expect(interactionHarvests[0].request.body[0].children).toBeEmpty()
  })

  it('should capture the ajax request and response size', async () => {
    await browser.url(
      await browser.testHandle.assetURL('soft_navigations/ajax/xhr-post.html', config)
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
      await browser.testHandle.assetURL('soft_navigations/ajax/xhr-no-send.html', config)
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
            feature_flags: ['soft_nav'],
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
    await browser.url(await browser.testHandle.assetURL('soft_navigations/ajax/xhr-404.html', config))
      .then(() => browser.waitForAgentLoad())

    const [interactionHarvests] = await Promise.all([
      interactionsCapture.waitForResult({ timeout: 10000 }),
      browser.execute(function () {
        document.getElementById('sendAjax').click()
      })
    ])

    checkAjaxEvents({ body: interactionHarvests[1].request.body[0].children, query: interactionHarvests[1].request.query }, { specificPath: '/paththatdoesnotexist' })

    const ajaxEvent = interactionHarvests[1].request.body[0].children.find(event => event.path === '/paththatdoesnotexist')
    expect(ajaxEvent.status).toEqual(404)
  })

  it('creates interaction event data for xhr with network error', async () => {
    await browser.url(await browser.testHandle.assetURL('soft_navigations/ajax/xhr-network-error.html', config))
      .then(() => browser.waitForAgentLoad())

    const [interactionHarvests] = await Promise.all([
      interactionsCapture.waitForResult({ timeout: 10000 }),
      browser.execute(function () {
        document.getElementById('sendAjax').click()
      })
    ])

    checkAjaxEvents({ body: interactionHarvests[1].request.body[0].children, query: interactionHarvests[1].request.query }, { specificPath: '/bizbaz' })

    const ajaxEvent = interactionHarvests[1].request.body[0].children.find(event => event.path === '/bizbaz')
    expect(ajaxEvent.status).toEqual(0)
  })

  it('produces interaction event data when xhr is 3rd party listener patched after agent', async () => {
    await browser.url(await browser.testHandle.assetURL('soft_navigations/ajax/xhr-patch-listener-after.html', config))
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
})
