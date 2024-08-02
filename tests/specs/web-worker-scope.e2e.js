describe('web worker scope', () => {
  it('should capture XHR events and metrics', async () => {
    const [events, metrics] = await Promise.all([
      browser.testHandle.expectAjaxEvents(),
      browser.testHandle.expectAjaxTimeSlices(),
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
    const [events, metrics] = await Promise.all([
      browser.testHandle.expectAjaxEvents(),
      browser.testHandle.expectAjaxTimeSlices(),
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
    const [metrics] = await Promise.all([
      browser.testHandle.expectErrors(),
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
    const [events] = await Promise.all([
      browser.testHandle.expectIns(),
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
