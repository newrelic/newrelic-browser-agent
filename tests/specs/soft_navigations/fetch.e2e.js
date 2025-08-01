import { JSONPath } from 'jsonpath-plus'
import { checkAjaxEvents, checkSpa } from '../../util/basic-checks'
import { testInteractionEventsRequest } from '../../../tools/testing-server/utils/expect-tests'

describe('Fetch SPA Interaction Tracking', () => {
  const config = { loader: 'spa', init: { feature_flags: ['soft_nav'] } }
  let interactionsCapture

  beforeEach(async () => {
    interactionsCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testInteractionEventsRequest })
  })

  it('should capture the ajax request and response size', async () => {
    await browser.url(
      await browser.testHandle.assetURL('soft_navigations/ajax/fetch-post.html', config)
    ).then(() => browser.waitForAgentLoad())

    const [interactionHarvests] = await Promise.all([
      interactionsCapture.waitForResult({ totalCount: 2 }),
      browser.execute(function () {
        document.getElementById('sendAjax').click()
      })
    ])

    interactionHarvests.forEach(harvest => console.log(harvest.request.body))
    checkSpa(interactionHarvests[1].request, { trigger: 'click' })
    expect(
      JSONPath({ path: '$.[*].request.body.[?(!!@ && @.path===\'/echo\')]', json: interactionHarvests })
    ).toEqual([
      expect.objectContaining({ requestedWith: 'fetch', path: '/echo', requestBodySize: 3, responseBodySize: 3 })
    ])
  })

  it('should not break the agent when fetch called with no params', async () => {
    await browser.url(
      await browser.testHandle.assetURL('soft_navigations/ajax/fetch-empty.html', config)
    ).then(() => browser.waitForAgentLoad())

    const [interactionHarvests] = await Promise.all([
      interactionsCapture.waitForResult({ timeout: 10000 }),
      browser.execute(function () {
        document.getElementById('sendAjax').click()
      })
    ])

    expect(
      JSONPath({ path: `$.[*].request.body.[?(!!@ && @.domain==='${browser.testHandle.assetServerConfig.host + ':' + browser.testHandle.assetServerConfig.port}')]`, json: interactionHarvests })
    ).toEqual([])
  })

  it('should not modify the response object when wrapping', async () => {
    await browser.url(
      await browser.testHandle.assetURL('soft_navigations/ajax/fetch-response-object-check.html', config)
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
    await browser.execute(function () {
      document.getElementById('sendAjax').click()
    })
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

  it('should not modify the response object when wrapping and response is form data', async () => {
    await browser.url(
      await browser.testHandle.assetURL('soft_navigations/ajax/fetch-response-form-data-check.html', config)
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
    await browser.execute(function () {
      document.getElementById('sendAjax').click()
    })
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
        await browser.testHandle.assetURL('soft_navigations/distributed_tracing/fetch-sameorigin.html', {
          loader: 'spa',
          init: {
            distributed_tracing: { enabled: true },
            feature_flags: ['soft_nav']
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

  it('creates interaction event data for erred fetch', async () => {
    await browser.url(await browser.testHandle.assetURL('soft_navigations/ajax/fetch-404.html', config))
      .then(() => browser.waitForAgentLoad())

    const [interactionHarvests] = await Promise.all([
      interactionsCapture.waitForResult({ totalCount: 2 }),
      browser.execute(function () {
        document.getElementById('sendAjax').click()
      })
    ])

    checkAjaxEvents({ body: interactionHarvests[1].request.body[0].children, query: interactionHarvests[1].request.query }, { specificPath: '/paththatdoesnotexist' })

    const ajaxEvent = JSONPath({ path: '$.[*].request.body.[?(!!@ && @.path===\'/paththatdoesnotexist\')]', json: interactionHarvests })[0]
    expect(ajaxEvent.status).toEqual(404)
  })
})
