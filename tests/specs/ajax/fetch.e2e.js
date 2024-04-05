import { supportsFetch } from '../../../tools/browser-matcher/common-matchers.mjs'

describe.withBrowsersMatching(supportsFetch)('Fetch Ajax', () => {
  ;[
    { title: 'fetch', url: 'ajax/fetch-simple.html' },
    { title: 'fetch with url param', url: 'ajax/fetch-url-param.html' },
    { title: 'fetch with request param', url: 'ajax/fetch-request-param.html' }
  ].forEach(({ title, url }) => {
    it(`creates event and metric data for ${title}`, async () => {
      await browser.url(await browser.testHandle.assetURL(url))
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
        requestedWith: 'fetch',
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
          count: 1,
          duration: {
            t: expect.toBeWithin(0, Infinity)
          },
          rxSize: {
            t: 14
          },
          time: {
            t: expect.toBeWithin(1, Infinity)
          },
          txSize: {
            t: 0
          }
        }
      })
      expect(ajaxMetric.metrics.duration.t).toEqual(ajaxEvent.end - ajaxEvent.start)
    })
  })

  it('creates event and metric data for erred fetch', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented.html'))
      .then(() => browser.waitForAgentLoad())

    const [ajaxEventsHarvest, ajaxTimeSlicesHarvest] = await Promise.all([
      browser.testHandle.expectAjaxEvents(),
      browser.testHandle.expectAjaxTimeSlices(),
      browser.execute(function () {
        fetch('/paththatdoesnotexist').catch(function () {})
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
      requestedWith: 'fetch',
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
        count: 1,
        duration: {
          t: expect.toBeWithin(0, Infinity)
        },
        rxSize: {
          t: 92
        },
        time: {
          t: expect.toBeWithin(1, Infinity)
        },
        txSize: {
          t: 0
        }
      }
    })
  })

  it('creates event and metric data for fetch with network error', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented.html'))
      .then(() => browser.waitForAgentLoad())

    const [ajaxEventsHarvest, ajaxTimeSlicesHarvest] = await Promise.all([
      browser.testHandle.expectAjaxEvents(),
      browser.testHandle.expectAjaxTimeSlices(),
      browser.execute(function () {
        fetch('http://foobar').catch(function () {})
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
      requestedWith: 'fetch',
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
        count: 1,
        duration: {
          t: expect.toBeWithin(0, Infinity)
        },
        rxSize: {
          c: 1
        },
        time: {
          t: expect.toBeWithin(1, Infinity)
        },
        txSize: {
          t: 0
        }
      }
    })
  })

  it('creates event and metric data for fetch using data uri', async () => {
    await browser.url(await browser.testHandle.assetURL('ajax/fetch-data-uri.html'))
      .then(() => browser.waitForAgentLoad())

    const [ajaxEventsHarvest, ajaxTimeSlicesHarvest] = await Promise.all([
      browser.testHandle.expectAjaxEvents(),
      browser.testHandle.expectAjaxTimeSlices(),
      browser.execute(function () {
        // We don't want the spa feature to pick up the ajax call
        window.disableAjaxHashChange = true
      }).then(() => $('#sendAjax').click())
    ])

    const ajaxEvent = ajaxEventsHarvest.request.body.find(event => event.domain === 'undefined:undefined')
    expect(ajaxEvent).toEqual({
      type: 'ajax',
      children: [],
      start: expect.toBeWithin(1, Infinity),
      end: expect.toBeWithin(1, Infinity),
      callbackEnd: expect.toBeWithin(1, Infinity),
      callbackDuration: 0,
      method: 'GET',
      status: 200,
      domain: 'undefined:undefined',
      path: '',
      requestBodySize: 0,
      responseBodySize: 0,
      requestedWith: 'fetch',
      nodeId: '0',
      guid: null,
      traceId: null,
      timestamp: null
    })

    const ajaxMetric = ajaxTimeSlicesHarvest.request.body.xhr.find(metric => metric.params.host === 'undefined:undefined')
    expect(ajaxMetric).toEqual({
      params: {
        protocol: 'data',
        host: 'undefined:undefined',
        method: 'GET',
        status: 200
      },
      metrics: {
        count: 1,
        duration: {
          t: expect.toBeWithin(0, Infinity)
        },
        rxSize: {
          c: 1
        },
        time: {
          t: expect.toBeWithin(1, Infinity)
        },
        txSize: {
          t: 0
        }
      }
    })
  })

  ;[
    { title: 'promise resolved callbacks', url: 'ajax/fetch-promise-resolve.html' },
    { title: 'promise rejected callbacks', url: 'ajax/fetch-promise-reject.html' },
    { title: 'async resolved callbacks', url: 'ajax/fetch-async-resolve.html' },
    { title: 'async rejected callbacks', url: 'ajax/fetch-async-reject.html' }
  ].forEach(({ title, url }) => {
    it(`does not capture fetch ${title} in metric timings`, async () => {
      await browser.url(await browser.testHandle.assetURL(url))
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
      // Callback duration is not captured for fetch calls
      expect(ajaxEvent.callbackDuration).toEqual(0)

      const ajaxMetric = ajaxTimeSlicesHarvest.request.body.xhr.find(metric => metric.params.pathname === '/json')
      // Callback duration is not captured for fetch calls
      expect(ajaxMetric.metrics.cbTime).toBeUndefined()
    })
  })

  it('produces the correct event and metric status when fetch times out or is aborted', async () => {
    await browser.url(await browser.testHandle.assetURL('ajax/fetch-timeout.html'))
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
    // Ajax event should have a 0 status when timed out
    expect(ajaxEvent.status).toEqual(0)

    const ajaxMetric = ajaxTimeSlicesHarvest.request.body.xhr.find(metric => metric.params.pathname === '/delayed')
    // Ajax metric should have a 0 status when timed out
    expect(ajaxMetric.params.status).toEqual(0)
  })

  it('produces event and metric with correct transmit size calculated', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented.html'))
      .then(() => browser.waitForAgentLoad())

    const [ajaxEventsHarvest, ajaxTimeSlicesHarvest] = await Promise.all([
      browser.testHandle.expectAjaxEvents(),
      browser.testHandle.expectAjaxTimeSlices(),
      browser.execute(function () {
        fetch('/echo', {
          method: 'POST',
          body: 'foobar-bizbaz'
        })
      })
    ])

    const ajaxEvent = ajaxEventsHarvest.request.body.find(event => event.path === '/echo')
    expect(ajaxEvent.requestBodySize).toEqual(13)
    expect(ajaxEvent.responseBodySize).toEqual(13)

    const ajaxMetric = ajaxTimeSlicesHarvest.request.body.xhr.find(metric => metric.params.pathname === '/echo')
    expect(ajaxMetric.metrics.txSize.t).toEqual(13)
    expect(ajaxMetric.metrics.rxSize.t).toEqual(13)
  })

  it('produces event and metric with correct transmit and receive size calculated when using array buffer', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented.html'))
      .then(() => browser.waitForAgentLoad())

    const [ajaxEventsHarvest, ajaxTimeSlicesHarvest] = await Promise.all([
      browser.testHandle.expectAjaxEvents(),
      browser.testHandle.expectAjaxTimeSlices(),
      browser.execute(function () {
        fetch('/postwithhi/arraybufferxhr', {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain'
          },
          body: (new Int8Array([104, 105, 33])).buffer
        })
      })
    ])

    const ajaxEvent = ajaxEventsHarvest.request.body.find(event => event.path === '/postwithhi/arraybufferxhr')
    expect(ajaxEvent.requestBodySize).toEqual(3)
    expect(ajaxEvent.responseBodySize).toEqual(3)

    const ajaxMetric = ajaxTimeSlicesHarvest.request.body.xhr.find(metric => metric.params.pathname === '/postwithhi/arraybufferxhr')
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

        fetch('/formdata', {
          method: 'POST',
          body: data
        })
      })
    ])

    const ajaxEvent = ajaxEventsHarvest.request.body.find(event => event.path === '/formdata')
    // We do not attempt to calculate txSize when FormData is used
    expect(ajaxEvent.requestBodySize).toEqual(0)
    expect(ajaxEvent.responseBodySize).toEqual(4)

    const ajaxMetric = ajaxTimeSlicesHarvest.request.body.xhr.find(metric => metric.params.pathname === '/formdata')
    // We do not attempt to calculate txSize when FormData is used
    expect(ajaxMetric.metrics.txSize.t).toEqual(0)
    expect(ajaxMetric.metrics.rxSize.t).toEqual(4)
  })

  it('produces event and metric with zero receive size due to the use of compression', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented.html'))
      .then(() => browser.waitForAgentLoad())

    const [ajaxEventsHarvest, ajaxTimeSlicesHarvest] = await Promise.all([
      browser.testHandle.expectAjaxEvents(),
      browser.testHandle.expectAjaxTimeSlices(),
      browser.execute(function () {
        fetch('/gzipped')
      })
    ])

    const ajaxEvent = ajaxEventsHarvest.request.body.find(event => event.path === '/gzipped')
    expect(ajaxEvent.responseBodySize).toEqual(0)

    const ajaxMetric = ajaxTimeSlicesHarvest.request.body.xhr.find(metric => metric.params.pathname === '/gzipped')
    expect(ajaxMetric.metrics.rxSize.t).toBeUndefined()
    expect(ajaxMetric.metrics.rxSize.c).toEqual(1)
  })

  it('produces event and metric with zero receive size due to the use of chunked payload', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented.html'))
      .then(() => browser.waitForAgentLoad())

    const [ajaxEventsHarvest, ajaxTimeSlicesHarvest] = await Promise.all([
      browser.testHandle.expectAjaxEvents(),
      browser.testHandle.expectAjaxTimeSlices(),
      browser.execute(function () {
        fetch('/chunked')
      })
    ])

    const ajaxEvent = ajaxEventsHarvest.request.body.find(event => event.path === '/chunked')
    expect(ajaxEvent.responseBodySize).toEqual(0)

    const ajaxMetric = ajaxTimeSlicesHarvest.request.body.xhr.find(metric => metric.params.pathname === '/chunked')
    expect(ajaxMetric.metrics.rxSize.t).toBeUndefined()
    expect(ajaxMetric.metrics.rxSize.c).toEqual(1)
  })
})
