import { testAjaxEventsRequest, testAjaxTimeSlicesRequest, testInsRequest } from '../../tools/testing-server/utils/expect-tests'

describe('web worker scope', () => {
  it('should capture XHR events and metrics', async () => {
    const [ajaxEventsCapture, ajaxMetricsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testAjaxEventsRequest },
      { test: testAjaxTimeSlicesRequest }
    ])

    const [events, metrics] = await Promise.all([
      ajaxEventsCapture.waitForResult({ totalCount: 2 }),
      ajaxMetricsCapture.waitForResult({ totalCount: 2 }),
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

    expect(events.some(payload => payload.request.body.find(x => x.path === '/json'))).toBe(true)
    expect(metrics.some(payload => payload.request.body.xhr.find(x => x.params.pathname === '/json'))).toBe(true)
  })

  it('should capture fetch events', async () => {
    const [ajaxEventsCapture, ajaxMetricsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testAjaxEventsRequest },
      { test: testAjaxTimeSlicesRequest }
    ])

    const [events, metrics] = await Promise.all([
      ajaxEventsCapture.waitForResult({ totalCount: 2 }),
      ajaxMetricsCapture.waitForResult({ totalCount: 2 }),
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

    expect(events.some(payload => payload.request.body.find(x => x.path === '/json'))).toBe(true)
    expect(metrics.some(payload => payload.request.body.xhr.find(x => x.params.pathname === '/json'))).toBe(true)
  })

  it('should capture error metrics', async () => {
    const ajaxMetricsCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testAjaxTimeSlicesRequest })

    const [metrics] = await Promise.all([
      ajaxMetricsCapture.waitForResult({ totalCount: 2 }),
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

    expect(metrics.some(payload => payload.request.body.err.find(x => x.params.message === 'taco party'))).toBe(true)
  })

  it('should capture page action events', async () => {
    const insightsCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testInsRequest })

    const [events] = await Promise.all([
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

    expect(events.some(payload => payload.request.body.ins.find(x => {
      return x.actionName === 'DummyEvent' && x.eventType === 'PageAction' && x.isWorker && x.currentUrl.includes('/tests/assets/test-builds/browser-agent-wrapper/worker-wrapper.js') && x.pageUrl.includes('/tests/assets/test-builds/browser-agent-wrapper/worker-wrapper.js')
    }))).toBe(true)
  })
})
