import { onlyFirefox } from '../../../tools/browser-matcher/common-matchers.mjs'

describe('XHR Ajax', () => {
  it('creates event and metric data for xhr', async () => {
    await browser.url(await browser.testHandle.assetURL('ajax/xhr-simple.html'))
      .then(() => browser.waitForAgentLoad())

    const [ajaxEventsHarvest, ajaxTimeSlicesHarvest] = await Promise.all([
      browser.testHandle.expectAjaxEvents(),
      browser.testHandle.expectAjaxTimeSlices(),
      browser.execute(function () {
        // We don't want the spa feature to pick up the ajax call
        window.disableAjaxHashChange = true
      }).then(() => $('#sendAjax').click())
    ])

    const ajaxEvent = ajaxEventsHarvest.request.body.find(event => event.path === '/json')
    expect(ajaxEvent).toEqual({
      type: 'ajax',
      children: [],
      start: expect.toBeWithin(1, Infinity),
      end: expect.toBeWithin(1, Infinity),
      callbackEnd: expect.toBeWithin(1, Infinity),
      callbackDuration: 0,
      method: 'GET',
      status: 200,
      domain: browser.testHandle.assetServerConfig.host + ':' + browser.testHandle.assetServerConfig.port,
      path: '/json',
      requestBodySize: 0,
      responseBodySize: 14,
      requestedWith: 'XMLHttpRequest',
      nodeId: '0',
      guid: null,
      traceId: null,
      timestamp: null
    })
    expect(ajaxEvent.end).toBeGreaterThanOrEqual(ajaxEvent.start)
    expect(ajaxEvent.callbackEnd).toEqual(ajaxEvent.end)

    const ajaxMetric = ajaxTimeSlicesHarvest.request.body.xhr.find(metric => metric.params.pathname === '/json')
    expect(ajaxMetric).toEqual({
      params: {
        hostname: browser.testHandle.assetServerConfig.host,
        port: browser.testHandle.assetServerConfig.port.toString(),
        protocol: 'http',
        host: browser.testHandle.assetServerConfig.host + ':' + browser.testHandle.assetServerConfig.port,
        pathname: '/json',
        method: 'GET',
        status: 200
      },
      metrics: {
        cbTime: {
          t: expect.toBeWithin(0, 10)
        },
        count: 1,
        duration: {
          t: expect.toBeWithin(0, Infinity)
        },
        rxSize: {
          t: 14
        },
        time: {
          t: expect.toBeWithin(1, Infinity)
        }
      }
    })

    // Metric duration is not an exact calculation of `end - start`
    const calculatedDuration = ajaxEvent.end - ajaxEvent.start
    expect(ajaxMetric.metrics.duration.t).toBeWithin(calculatedDuration - 10, calculatedDuration + 11)
  })

  it('creates event and metric data for erred xhr', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented.html'))
      .then(() => browser.waitForAgentLoad())

    const [ajaxEventsHarvest, ajaxTimeSlicesHarvest] = await Promise.all([
      browser.testHandle.expectAjaxEvents(),
      browser.testHandle.expectAjaxTimeSlices(),
      browser.execute(function () {
        var xhr = new XMLHttpRequest()
        xhr.open('GET', '/paththatdoesnotexist')
        xhr.send()
      })
    ])

    const ajaxEvent = ajaxEventsHarvest.request.body.find(event => event.path === '/paththatdoesnotexist')
    expect(ajaxEvent).toEqual({
      type: 'ajax',
      children: [],
      start: expect.toBeWithin(1, Infinity),
      end: expect.toBeWithin(1, Infinity),
      callbackEnd: expect.toBeWithin(1, Infinity),
      callbackDuration: 0,
      method: 'GET',
      status: 404,
      domain: browser.testHandle.assetServerConfig.host + ':' + browser.testHandle.assetServerConfig.port,
      path: '/paththatdoesnotexist',
      requestBodySize: 0,
      responseBodySize: 92,
      requestedWith: 'XMLHttpRequest',
      nodeId: '0',
      guid: null,
      traceId: null,
      timestamp: null
    })

    const ajaxMetric = ajaxTimeSlicesHarvest.request.body.xhr.find(metric => metric.params.pathname === '/paththatdoesnotexist')
    expect(ajaxMetric).toEqual({
      params: {
        hostname: browser.testHandle.assetServerConfig.host,
        port: browser.testHandle.assetServerConfig.port.toString(),
        protocol: 'http',
        host: browser.testHandle.assetServerConfig.host + ':' + browser.testHandle.assetServerConfig.port,
        pathname: '/paththatdoesnotexist',
        method: 'GET',
        status: 404
      },
      metrics: {
        cbTime: {
          t: expect.toBeWithin(0, 10)
        },
        count: 1,
        duration: {
          t: expect.toBeWithin(0, Infinity)
        },
        rxSize: {
          t: 92
        },
        time: {
          t: expect.toBeWithin(1, Infinity)
        }
      }
    })
  })

  it('creates event and metric data for xhr with network error', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented.html'))
      .then(() => browser.waitForAgentLoad())

    const [ajaxEventsHarvest, ajaxTimeSlicesHarvest] = await Promise.all([
      browser.testHandle.expectAjaxEvents(),
      browser.testHandle.expectAjaxTimeSlices(),
      browser.execute(function () {
        var xhr = new XMLHttpRequest()
        xhr.open('GET', 'http://foobar')
        xhr.send()
      })
    ])

    const ajaxEvent = ajaxEventsHarvest.request.body.find(event => event.path === '/')
    expect(ajaxEvent).toEqual({
      type: 'ajax',
      children: [],
      start: expect.toBeWithin(1, Infinity),
      end: expect.toBeWithin(1, Infinity),
      callbackEnd: expect.toBeWithin(1, Infinity),
      callbackDuration: 0,
      method: 'GET',
      status: 0,
      domain: 'foobar:80',
      path: '/',
      requestBodySize: 0,
      responseBodySize: 0,
      requestedWith: 'XMLHttpRequest',
      nodeId: '0',
      guid: null,
      traceId: null,
      timestamp: null
    })

    const ajaxMetric = ajaxTimeSlicesHarvest.request.body.xhr.find(metric => metric.params.pathname === '/')
    expect(ajaxMetric).toEqual({
      params: {
        hostname: 'foobar',
        port: '80',
        protocol: 'http',
        host: 'foobar:80',
        pathname: '/',
        method: 'GET',
        status: 0
      },
      metrics: {
        cbTime: {
          t: expect.toBeWithin(0, 10)
        },
        count: 1,
        duration: {
          t: expect.toBeWithin(0, Infinity)
        },
        rxSize: expect.toBeNil(),
        time: {
          t: expect.toBeWithin(1, Infinity)
        }
      }
    })
  })

  it('only includes load handlers in metric timings', async () => {
    await browser.url(await browser.testHandle.assetURL('ajax/xhr-callback-duration.html'))
      .then(() => browser.waitForAgentLoad())

    const [ajaxEventsHarvest, ajaxTimeSlicesHarvest] = await Promise.all([
      browser.testHandle.expectAjaxEvents(),
      browser.testHandle.expectAjaxTimeSlices(),
      browser.execute(function () {
        // We don't want the spa feature to pick up the ajax call
        window.disableAjaxHashChange = true
      }).then(() => $('#sendAjax').click())
    ])

    const ajaxEvent = ajaxEventsHarvest.request.body.find(event => event.path === '/json')
    // Ajax event should have a 0 callbackDuration when not picked up by the SPA feature
    expect(ajaxEvent.callbackDuration).toEqual(0)

    const ajaxMetric = ajaxTimeSlicesHarvest.request.body.xhr.find(metric => metric.params.pathname === '/json')
    // Callback duration can be flaky, but we are expecting around 100 milliseconds
    expect(ajaxMetric.metrics.cbTime.t).toBeWithin(75, 126)
  })

  it('produces the correct event and metric timings when xhr times out', async () => {
    await browser.url(await browser.testHandle.assetURL('ajax/xhr-timeout.html'))
      .then(() => browser.waitForAgentLoad())

    const [ajaxEventsHarvest, ajaxTimeSlicesHarvest] = await Promise.all([
      browser.testHandle.expectAjaxEvents(),
      browser.testHandle.expectAjaxTimeSlices(),
      browser.execute(function () {
        // We don't want the spa feature to pick up the ajax call
        window.disableAjaxHashChange = true
      }).then(() => $('#sendAjax').click())
    ])

    const ajaxEvent = ajaxEventsHarvest.request.body.find(event => event.path === '/delayed')
    // Ajax event should have a 0 callbackDuration when not picked up by the SPA feature
    expect(ajaxEvent.callbackDuration).toEqual(0)
    // Ajax event should have a 0 status when timed out
    expect(ajaxEvent.status).toEqual(0)

    const ajaxMetric = ajaxTimeSlicesHarvest.request.body.xhr.find(metric => metric.params.pathname === '/delayed')
    // Callback duration should be 0 since the xhr timed out and the load handlers should not have ran
    expect(ajaxMetric.metrics.cbTime.t).toEqual(0)
    // Ajax metric should have a 0 status when timed out
    expect(ajaxMetric.params.status).toEqual(0)
  })

  it('produces no event and metric data when xhr is aborted', async () => {
    await browser.url(await browser.testHandle.assetURL('ajax/xhr-abort.html'))
      .then(() => browser.waitForAgentLoad())

    const [ajaxEventsHarvest, ajaxTimeSlicesHarvest] = await Promise.all([
      browser.testHandle.expectAjaxEvents(),
      browser.testHandle.expectAjaxTimeSlices(),
      browser.execute(function () {
        // We don't want the spa feature to pick up the ajax call
        window.disableAjaxHashChange = true
      }).then(() => $('#sendAjax').click())
    ])

    const ajaxEvent = ajaxEventsHarvest.request.body.find(event => event.path === '/delayed')
    expect(ajaxEvent).toBeUndefined()

    const ajaxMetric = ajaxTimeSlicesHarvest.request.body.xhr.find(metric => metric.params.pathname === '/delayed')
    expect(ajaxMetric).toBeUndefined()
  })

  it('produces event and metric with correct transmit size calculated', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented.html'))
      .then(() => browser.waitForAgentLoad())

    const [ajaxEventsHarvest, ajaxTimeSlicesHarvest] = await Promise.all([
      browser.testHandle.expectAjaxEvents(),
      browser.testHandle.expectAjaxTimeSlices(),
      browser.execute(function () {
        var xhr = new XMLHttpRequest()
        xhr.open('POST', '/echo')
        xhr.send('foobar-bizbaz')
      })
    ])

    const ajaxEvent = ajaxEventsHarvest.request.body.find(event => event.path === '/echo')
    expect(ajaxEvent.requestBodySize).toEqual(13)
    expect(ajaxEvent.responseBodySize).toEqual(13)

    const ajaxMetric = ajaxTimeSlicesHarvest.request.body.xhr.find(metric => metric.params.pathname === '/echo')
    expect(ajaxMetric.metrics.txSize.t).toEqual(13)
    expect(ajaxMetric.metrics.rxSize.t).toEqual(13)
  })

  it('captures cats header in metric for same-origin xhr', async () => {
    await browser.url(await browser.testHandle.assetURL('ajax/xhr-simple.html'))
      .then(() => browser.waitForAgentLoad())

    const [ajaxTimeSlicesHarvest] = await Promise.all([
      browser.testHandle.expectAjaxTimeSlices(),
      browser.execute(function () {
        var xhr = new XMLHttpRequest()
        xhr.open('GET', '/xhr_with_cat/1')
        xhr.send()
      })
    ])

    const ajaxMetric = ajaxTimeSlicesHarvest.request.body.xhr.find(metric => metric.params.pathname === '/xhr_with_cat/1')
    expect(ajaxMetric.params.cat).toEqual('foo')
  })

  it('does not capture cats header in metric for cross-origin xhr', async () => {
    await browser.url(await browser.testHandle.assetURL('ajax/xhr-simple.html'))
      .then(() => browser.waitForAgentLoad())

    const [ajaxTimeSlicesHarvest] = await Promise.all([
      browser.testHandle.expectAjaxTimeSlices(),
      browser.execute(function (host, port) {
        var xhr = new XMLHttpRequest()
        xhr.open('GET', 'http://' + host + ':' + port + '/xhr_with_cat/1')
        xhr.send()
      }, browser.testHandle.bamServerConfig.host, browser.testHandle.bamServerConfig.port)
    ])

    const ajaxMetric = ajaxTimeSlicesHarvest.request.body.xhr.find(metric => metric.params.pathname === '/xhr_with_cat/1')
    expect(ajaxMetric.params.cat).toBeUndefined()
  })

  it('does not capture cats header in metric for same-origin xhr when header does not exist', async () => {
    await browser.url(await browser.testHandle.assetURL('ajax/xhr-simple.html'))
      .then(() => browser.waitForAgentLoad())

    const [ajaxTimeSlicesHarvest] = await Promise.all([
      browser.testHandle.expectAjaxTimeSlices(),
      browser.execute(function () {
        var xhr = new XMLHttpRequest()
        xhr.open('GET', '/xhr_no_cat')
        xhr.send()
      })
    ])

    const ajaxMetric = ajaxTimeSlicesHarvest.request.body.xhr.find(metric => metric.params.pathname === '/xhr_no_cat')
    expect(ajaxMetric.params.cat).toBeUndefined()
  })

  it('produces event and metric with correct transmit and receive size calculated when using array buffer', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented.html'))
      .then(() => browser.waitForAgentLoad())

    const [ajaxEventsHarvest, ajaxTimeSlicesHarvest] = await Promise.all([
      browser.testHandle.expectAjaxEvents(),
      browser.testHandle.expectAjaxTimeSlices(),
      browser.execute(function () {
        var xhr = new XMLHttpRequest()
        xhr.open('POST', '/postwithhi/arraybufferxhr')
        xhr.responseType = 'arraybuffer'
        xhr.setRequestHeader('Content-Type', 'text/plain')
        xhr.send((new Int8Array([104, 105, 33])).buffer)
      })
    ])

    const ajaxEvent = ajaxEventsHarvest.request.body.find(event => event.path === '/postwithhi/arraybufferxhr')
    // Firefox is different for some reason
    if (browserMatch(onlyFirefox)) {
      expect(ajaxEvent.requestBodySize).toEqual(2)
    } else {
      expect(ajaxEvent.requestBodySize).toEqual(3)
    }
    expect(ajaxEvent.responseBodySize).toEqual(3)

    const ajaxMetric = ajaxTimeSlicesHarvest.request.body.xhr.find(metric => metric.params.pathname === '/postwithhi/arraybufferxhr')
    // Firefox is different for some reason
    if (browserMatch(onlyFirefox)) {
      expect(ajaxMetric.metrics.txSize.t).toEqual(2)
    } else {
      expect(ajaxMetric.metrics.txSize.t).toEqual(3)
    }
    expect(ajaxMetric.metrics.rxSize.t).toEqual(3)
  })

  it('produces event and metric with correct transmit and receive size calculated when using blob', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented.html'))
      .then(() => browser.waitForAgentLoad())

    const [ajaxEventsHarvest, ajaxTimeSlicesHarvest] = await Promise.all([
      browser.testHandle.expectAjaxEvents(),
      browser.testHandle.expectAjaxTimeSlices(),
      browser.execute(function () {
        var xhr = new XMLHttpRequest()
        xhr.open('POST', '/postwithhi/blobxhr')
        xhr.responseType = 'blob'
        xhr.setRequestHeader('Content-Type', 'text/plain')
        xhr.send(new Blob(['hi!']))
      })
    ])

    const ajaxEvent = ajaxEventsHarvest.request.body.find(event => event.path === '/postwithhi/blobxhr')
    expect(ajaxEvent.requestBodySize).toEqual(3)
    expect(ajaxEvent.responseBodySize).toEqual(3)

    const ajaxMetric = ajaxTimeSlicesHarvest.request.body.xhr.find(metric => metric.params.pathname === '/postwithhi/blobxhr')
    expect(ajaxMetric.metrics.txSize.t).toEqual(3)
    expect(ajaxMetric.metrics.rxSize.t).toEqual(3)
  })

  it('produces event and metric with correct transmit and receive size calculated when using form data', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented.html'))
      .then(() => browser.waitForAgentLoad())

    const [ajaxEventsHarvest, ajaxTimeSlicesHarvest] = await Promise.all([
      browser.testHandle.expectAjaxEvents(),
      browser.testHandle.expectAjaxTimeSlices(),
      browser.execute(function () {
        var data = new FormData()
        data.append('name', 'bob')
        data.append('x', 5)

        var xhr = new XMLHttpRequest()
        xhr.open('POST', '/formdata')
        xhr.send(data)
      })
    ])

    const ajaxEvent = ajaxEventsHarvest.request.body.find(event => event.path === '/formdata')
    // We do not attempt to calculate txSize when FormData is used
    expect(ajaxEvent.requestBodySize).toEqual(0)
    expect(ajaxEvent.responseBodySize).toEqual(4)

    const ajaxMetric = ajaxTimeSlicesHarvest.request.body.xhr.find(metric => metric.params.pathname === '/formdata')
    // We do not attempt to calculate txSize when FormData is used
    expect(ajaxMetric.metrics.txSize).toBeUndefined()
    expect(ajaxMetric.metrics.rxSize.t).toEqual(4)
  })

  it('produces event and metric with receive size calculated from the decompressed payload', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented.html'))
      .then(() => browser.waitForAgentLoad())

    const [ajaxEventsHarvest, ajaxTimeSlicesHarvest] = await Promise.all([
      browser.testHandle.expectAjaxEvents(),
      browser.testHandle.expectAjaxTimeSlices(),
      browser.execute(function () {
        var xhr = new XMLHttpRequest()
        xhr.open('GET', '/gzipped')
        xhr.send()
      })
    ])

    const ajaxEvent = ajaxEventsHarvest.request.body.find(event => event.path === '/gzipped')
    expect(ajaxEvent.responseBodySize).toEqual(10000)

    const ajaxMetric = ajaxTimeSlicesHarvest.request.body.xhr.find(metric => metric.params.pathname === '/gzipped')
    expect(ajaxMetric.metrics.rxSize.t).toEqual(10000)
  })

  it('produces event and metric with receive size calculated from the complete chunked payload', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented.html'))
      .then(() => browser.waitForAgentLoad())

    const [ajaxEventsHarvest, ajaxTimeSlicesHarvest] = await Promise.all([
      browser.testHandle.expectAjaxEvents(),
      browser.testHandle.expectAjaxTimeSlices(),
      browser.execute(function () {
        var xhr = new XMLHttpRequest()
        xhr.open('GET', '/chunked')
        xhr.send()
      })
    ])

    const ajaxEvent = ajaxEventsHarvest.request.body.find(event => event.path === '/chunked')
    expect(ajaxEvent.responseBodySize).toEqual(10000)

    const ajaxMetric = ajaxTimeSlicesHarvest.request.body.xhr.find(metric => metric.params.pathname === '/chunked')
    expect(ajaxMetric.metrics.rxSize.t).toEqual(10000)
  })
})
