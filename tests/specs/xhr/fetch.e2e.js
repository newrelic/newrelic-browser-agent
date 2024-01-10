import { supportsFetch } from '../../../tools/browser-matcher/common-matchers.mjs'

const testCases = []
testCases.push({
  name: 'basic fetch call',
  invoke: () => browser.execute(function () {
    fetch('/json')
  }),
  check: function (ajaxEventsHarvest, ajaxTimeSlicesHarvest) {
    expect(ajaxEventsHarvest.request.body).toEqual(expect.arrayContaining([
      {
        callbackDuration: 0,
        callbackEnd: expect.toBeWithin(1, Infinity),
        children: [],
        domain: browser.testHandle.assetServerConfig.host + ':' + browser.testHandle.assetServerConfig.port,
        end: expect.toBeWithin(1, Infinity),
        guid: null,
        method: 'GET',
        nodeId: '0',
        path: '/json',
        requestBodySize: 0,
        requestedWith: 'fetch',
        responseBodySize: 14,
        start: expect.toBeWithin(1, Infinity),
        status: 200,
        timestamp: null,
        traceId: null,
        type: 'ajax'
      }
    ]))
    expect(ajaxTimeSlicesHarvest.request.body.xhr).toEqual(expect.arrayContaining([
      {
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
        },
        params: {
          host: browser.testHandle.assetServerConfig.host + ':' + browser.testHandle.assetServerConfig.port,
          hostname: browser.testHandle.assetServerConfig.host,
          method: 'GET',
          pathname: '/json',
          port: browser.testHandle.assetServerConfig.port.toString(),
          protocol: 'http',
          status: 200
        }
      }
    ]))
  }
})
testCases.push({
  name: 'fetch with Request parameter',
  invoke: () => browser.execute(function () {
    const request = new Request('/json')
    fetch(request)
  }),
  check: testCases[0].check
})
testCases.push({
  name: 'fetch with URL parameter',
  invoke: () => browser.execute(function (host, port) {
    const request = new URL(`http://${host}:${port}/json`)
    fetch(request)
  }, browser.testHandle.assetServerConfig.host, browser.testHandle.assetServerConfig.port),
  check: testCases[0].check
})
testCases.push({
  name: 'fetch with error response',
  invoke: () => browser.execute(function (host, port) {
    const request = new URL(`http://${host}:${port}/paththatdoesnotexist`)
    fetch(request)
  }, browser.testHandle.assetServerConfig.host, browser.testHandle.assetServerConfig.port),
  check: function (ajaxEventsHarvest, ajaxTimeSlicesHarvest) {
    expect(ajaxEventsHarvest.request.body).toEqual(expect.arrayContaining([
      {
        callbackDuration: 0,
        callbackEnd: expect.toBeWithin(1, Infinity),
        children: [],
        domain: browser.testHandle.assetServerConfig.host + ':' + browser.testHandle.assetServerConfig.port,
        end: expect.toBeWithin(1, Infinity),
        guid: null,
        method: 'GET',
        nodeId: '0',
        path: '/paththatdoesnotexist',
        requestBodySize: 0,
        requestedWith: 'fetch',
        responseBodySize: 92,
        start: expect.toBeWithin(1, Infinity),
        status: 404,
        timestamp: null,
        traceId: null,
        type: 'ajax'
      }
    ]))
    expect(ajaxTimeSlicesHarvest.request.body.xhr).toEqual(expect.arrayContaining([
      {
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
        },
        params: {
          host: browser.testHandle.assetServerConfig.host + ':' + browser.testHandle.assetServerConfig.port,
          hostname: browser.testHandle.assetServerConfig.host,
          method: 'GET',
          pathname: '/paththatdoesnotexist',
          port: browser.testHandle.assetServerConfig.port.toString(),
          protocol: 'http',
          status: 404
        }
      }
    ]))
  }
})
testCases.push({
  name: 'captures network error fetches',
  invoke: () => browser.execute(function (host, port) {
    fetch('http://foobar')
  }),
  check: function (ajaxEventsHarvest, ajaxTimeSlicesHarvest) {
    expect(ajaxEventsHarvest.request.body).toEqual(expect.arrayContaining([
      {
        callbackDuration: 0,
        callbackEnd: expect.toBeWithin(1, Infinity),
        children: [],
        domain: 'foobar:80',
        end: expect.toBeWithin(1, Infinity),
        guid: null,
        method: 'GET',
        nodeId: '0',
        path: '/',
        requestBodySize: 0,
        requestedWith: 'fetch',
        responseBodySize: 0,
        start: expect.toBeWithin(1, Infinity),
        status: 0,
        timestamp: null,
        traceId: null,
        type: 'ajax'
      }
    ]))
    expect(ajaxTimeSlicesHarvest.request.body.xhr).toEqual(expect.arrayContaining([
      {
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
        },
        params: {
          host: 'foobar:80',
          hostname: 'foobar',
          method: 'GET',
          pathname: '/',
          port: '80',
          protocol: 'http',
          status: 0
        }
      }
    ]))
  }
})

describe.withBrowsersMatching(supportsFetch)('fetch', () => {
  testCases.forEach(testCase => {
    it(testCase.name, async () => {
      await browser.url(await browser.testHandle.assetURL('instrumented.html'))
        .then(() => browser.waitForAgentLoad())

      const [ajaxEventsHarvest, ajaxTimeSlicesHarvest] = await Promise.all([
        browser.testHandle.expectAjaxEvents(),
        browser.testHandle.expectAjaxTimeSlices(),
        testCase.invoke()
      ])

      testCase.check(ajaxEventsHarvest, ajaxTimeSlicesHarvest)
    })
  })
})
