import { testAjaxEventsRequest, testAjaxTimeSlicesRequest, testInsRequest } from '../../tools/testing-server/utils/expect-tests'

describe('web worker scope', () => {
  it('should capture XHR events and metrics', async () => {
    const [ajaxEventsCapture, ajaxMetricsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testAjaxEventsRequest },
      { test: testAjaxTimeSlicesRequest }
    ])

    const [[events], [metrics]] = await Promise.all([
      ajaxEventsCapture.waitForResult({ totalCount: 1 }),
      ajaxMetricsCapture.waitForResult({ totalCount: 1 }),
      browser.url(
        await browser.testHandle.assetURL(
          'test-builds/browser-agent-wrapper/worker-agent.html',
          {
            workerCommands: [
              function () {
                setTimeout(function () {
                  var xhr = new XMLHttpRequest()
                  xhr.open('GET', '/json')
                  xhr.send()
                }, 2000)
              }
            ]
          }
        )
      )
    ])

    expect(events.request.body).toEqual(expect.arrayContaining([
      expect.objectContaining({
        domain: expect.stringContaining('bam-test-1.nr-local.net'),
        path: '/json',
        type: 'ajax',
        requestedWith: 'XMLHttpRequest'
      })
    ]))
    expect(metrics.request.body.xhr).toEqual(expect.arrayContaining([
      expect.objectContaining({
        params: expect.objectContaining({
          pathname: '/json'
        })
      })
    ]))
  })

  it('should capture fetch events', async () => {
    const [ajaxEventsCapture, ajaxMetricsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testAjaxEventsRequest },
      { test: testAjaxTimeSlicesRequest }
    ])

    const [[events], [metrics]] = await Promise.all([
      ajaxEventsCapture.waitForResult({ totalCount: 1 }),
      ajaxMetricsCapture.waitForResult({ totalCount: 1 }),
      browser.url(
        await browser.testHandle.assetURL(
          'test-builds/browser-agent-wrapper/worker-agent.html',
          {
            workerCommands: [
              function () {
                setTimeout(function () {
                  fetch('/json')
                }, 2000)
              }
            ]
          }
        )
      )
    ])

    expect(events.request.body).toEqual(expect.arrayContaining([
      expect.objectContaining({
        domain: expect.stringContaining('bam-test-1.nr-local.net'),
        path: '/json',
        type: 'ajax',
        requestedWith: 'fetch'
      })
    ]))
    expect(metrics.request.body.xhr).toEqual(expect.arrayContaining([
      expect.objectContaining({
        params: expect.objectContaining({
          pathname: '/json'
        })
      })
    ]))
  })

  it('should capture error metrics', async () => {
    const ajaxMetricsCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testAjaxTimeSlicesRequest })

    const [[metrics]] = await Promise.all([
      ajaxMetricsCapture.waitForResult({ totalCount: 1 }),
      browser.url(
        await browser.testHandle.assetURL(
          'test-builds/browser-agent-wrapper/worker-agent.html',
          {
            workerCommands: [
              function () {
                setTimeout(function () {
                  throw new Error('taco party')
                }, 2000)
              }
            ]
          }
        )
      )
    ])

    expect(metrics.request.body.err).toEqual(expect.arrayContaining([
      expect.objectContaining({
        custom: expect.objectContaining({ isWorker: true }),
        params: expect.objectContaining({
          exceptionClass: 'Error',
          message: 'taco party'
        })
      })
    ]))
  })

  it('should capture page action events', async () => {
    const insightsCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testInsRequest })

    const [[events]] = await Promise.all([
      insightsCapture.waitForResult({ totalCount: 1 }),
      browser.url(
        await browser.testHandle.assetURL(
          'test-builds/browser-agent-wrapper/worker-agent.html',
          {
            workerCommands: [
              function () {
                newrelic.addPageAction('DummyEvent', { free: 'tacos' })
              }
            ]
          }
        )
      )
    ])

    expect(events.request.body.ins).toEqual(expect.arrayContaining([
      expect.objectContaining({
        actionName: 'DummyEvent',
        eventType: 'PageAction',
        isWorker: true,
        currentUrl: expect.stringContaining('/tests/assets/test-builds/browser-agent-wrapper/worker-wrapper.js'),
        pageUrl: expect.stringContaining('/tests/assets/test-builds/browser-agent-wrapper/worker-wrapper.js')
      })
    ]))
  })
})
