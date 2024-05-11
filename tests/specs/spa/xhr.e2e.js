import { checkSpa } from '../../util/basic-checks'

describe('XHR SPA Interaction Tracking', () => {
  it('should capture the ajax in the initial interaction when sent before load', async () => {
    const [interactionResults] = await Promise.all([
      browser.testHandle.expectInteractionEvents(10000),
      await browser.url(
        await browser.testHandle.assetURL('ajax/xhr-before-load.html')
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

    const [interactionResults] = await Promise.all([
      browser.testHandle.expectInteractionEvents(10000),
      $('#sendAjax').click()
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
    const [interactionResults] = await Promise.all([
      browser.testHandle.expectInteractionEvents(10000),
      await browser.url(
        await browser.testHandle.assetURL('ajax/xhr-after-load.html')
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

    const [interactionResults] = await Promise.all([
      browser.testHandle.expectInteractionEvents(10000),
      $('#sendAjax').click()
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

    const [interactionResults] = await Promise.all([
      browser.testHandle.expectInteractionEvents(10000),
      $('#sendAjax').click()
    ])

    checkSpa(interactionResults.request, { trigger: 'click' })
    expect(interactionResults.request.body).toEqual(expect.arrayContaining([
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

    const [interactionResults] = await Promise.all([
      browser.testHandle.expectInteractionEvents(10000),
      $('#sendAjax').click()
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
    const [interactionResults] = await Promise.all([
      browser.testHandle.expectInteractionEvents(10000),
      await browser.url(
        await browser.testHandle.assetURL('distributed_tracing/xhr-sameorigin.html', {
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
})
