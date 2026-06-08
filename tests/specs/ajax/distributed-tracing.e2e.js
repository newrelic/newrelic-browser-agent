import { faker } from '@faker-js/faker'
import { testAjaxEventsRequest, testInteractionEventsRequest } from '../../../tools/testing-server/utils/expect-tests'

const assetServerTraceTest = function (request) {
  if (request.method !== 'GET') return
  const url = new URL(request.url, 'resolve://')
  return url.pathname === `/dt/${this.testId}`
}

const testCases = [
  {
    name: 'no headers added when configuration is null',
    configuration: null,
    sameOrigin: true,
    addRouterToAllowedOrigins: false,
    newrelicHeader: false,
    traceContextHeaders: false
  },
  {
    name: 'no headers added when configuration exists but is not enabled',
    configuration: {
      enabled: false
    },
    sameOrigin: true,
    addRouterToAllowedOrigins: false,
    newrelicHeader: false,
    traceContextHeaders: false
  },
  {
    name: 'headers are added on same origin by default',
    configuration: {
      enabled: true
    },
    sameOrigin: true,
    addRouterToAllowedOrigins: false,
    newrelicHeader: true,
    traceContextHeaders: true
  },
  {
    name: 'newrelic header is not added on same origin when specifically disabled in configuration',
    configuration: {
      enabled: true,
      exclude_newrelic_header: true
    },
    sameOrigin: true,
    addRouterToAllowedOrigins: false,
    newrelicHeader: false,
    traceContextHeaders: true
  },
  {
    name: 'no headers are added on different origin by default',
    configuration: null,
    sameOrigin: false,
    addRouterToAllowedOrigins: false,
    newrelicHeader: false,
    traceContextHeaders: false
  },
  {
    name: 'no headers are added on different origin when the origin is not allowed',
    configuration: {
      enabled: true,
      allowed_origins: ['https://newrelic.com']
    },
    sameOrigin: false,
    addRouterToAllowedOrigins: false,
    newrelicHeader: false,
    traceContextHeaders: false
  },
  {
    name: 'default headers on different origin when the origin is allowed',
    configuration: {
      enabled: true,
      allowed_origins: []
    },
    sameOrigin: false,
    addRouterToAllowedOrigins: true,
    newrelicHeader: true,
    traceContextHeaders: false
  },
  {
    name: 'trace context headers are added on different origin when explicitly enabled in configuration',
    configuration: {
      enabled: true,
      allowed_origins: [],
      cors_use_tracecontext_headers: true
    },
    sameOrigin: false,
    addRouterToAllowedOrigins: true,
    newrelicHeader: true,
    traceContextHeaders: true
  },
  {
    name: 'newrelic header is not added on different origin when explicitly disabled in configuration',
    configuration: {
      enabled: true,
      allowed_origins: [],
      cors_use_newrelic_header: false
    },
    sameOrigin: false,
    addRouterToAllowedOrigins: true,
    newrelicHeader: false,
    traceContextHeaders: false
  }
]
const fetchScenarios = [
  {
    name: 'when fetch is called with one string argument',
    sameOriginFile: 'soft_navigations/distributed_tracing/fetch-dt-sameorigin-load.html',
    crossOriginFile: 'soft_navigations/distributed_tracing/fetch-dt-crossorigin-load.html'
  },
  {
    name: 'when fetch is called with URL string and options arguments',
    sameOriginFile: 'soft_navigations/distributed_tracing/fetch-dt-sameorigin-load-2.html',
    crossOriginFile: 'soft_navigations/distributed_tracing/fetch-dt-crossorigin-load-2.html'
  },
  {
    name: 'when fetch is called with a Request argument',
    sameOriginFile: 'soft_navigations/distributed_tracing/fetch-dt-sameorigin-load-3.html',
    crossOriginFile: 'soft_navigations/distributed_tracing/fetch-dt-crossorigin-load-3.html'
  },
  {
    name: 'when fetch is called with a URL object argument',
    sameOriginFile: 'soft_navigations/distributed_tracing/fetch-dt-sameorigin-load-4.html',
    crossOriginFile: 'soft_navigations/distributed_tracing/fetch-dt-crossorigin-load-4.html'
  },
  {
    name: 'when fetch is called with an object argument containing a toString function',
    sameOriginFile: 'soft_navigations/distributed_tracing/fetch-dt-sameorigin-load-5.html',
    crossOriginFile: 'soft_navigations/distributed_tracing/fetch-dt-crossorigin-load-5.html'
  }
]

describe('xhr distributed tracing', () => {
  let config

  beforeEach(async () => {
    config = {
      accountID: faker.string.hexadecimal({ length: 16, prefix: '' }),
      agentID: faker.string.hexadecimal({ length: 16, prefix: '' }),
      trustKey: faker.string.hexadecimal({ length: 16, prefix: '' })
    }
  })

  testCases.forEach(testCase => {
    it(testCase.name, async () => {
      let targetAsset = 'soft_navigations/distributed_tracing/xhr-dt-sameorigin-load.html'
      let targetServer = 'assetServer'
      if (!testCase.sameOrigin) {
        targetAsset = 'soft_navigations/distributed_tracing/xhr-dt-crossorigin-load.html'
        targetServer = 'bamServer'
      }
      const ajaxCapture = await browser.testHandle.createNetworkCaptures(targetServer, { test: assetServerTraceTest })
      const ajaxEventCapture = await browser.testHandle.createNetworkCaptures(targetServer, { test: testAjaxEventsRequest })
      const interactionsCapture = await browser.testHandle.createNetworkCaptures(targetServer, { test: testInteractionEventsRequest })

      if (testCase.addRouterToAllowedOrigins) {
        testCase.configuration.allowed_origins.push(
          `http://${browser.testHandle.bamServerConfig.host}:${browser.testHandle.bamServerConfig.port}/`
        )
      }

      const [ajaxRequest, ajaxEventResults, interactionsResults] = await Promise.all([
        ajaxCapture.waitForResult({ totalCount: 1 }),
        ajaxEventCapture.waitForResult({ totalCount: 1, timeout: 10000 }),
        interactionsCapture.waitForResult({ totalCount: 1, timeout: 10000 }),
        browser.url(await browser.testHandle.assetURL(targetAsset, {
          config,
          injectUpdatedLoaderConfig: true,
          init: {
            distributed_tracing: testCase.configuration
          }
        }))
      ])

      const ajaxRequestHeaders = ajaxRequest[0].request.headers
      validateTraceHeaders(ajaxRequestHeaders, config, testCase.newrelicHeader, testCase.traceContextHeaders)

      const rawTimes = await browser.execute(function () {
        return window.rawTimes
      })

      ajaxEventResults.forEach((harvest) => validateTraceTime(harvest, rawTimes))
      interactionsResults.forEach((harvest) => validateTraceTime(harvest, rawTimes))
    })
  })

  testCases.forEach(testCase => {
    fetchScenarios.forEach(fetchScenario => {
      describe(fetchScenario.name, () => {
        it(testCase.name, async () => {
          let targetAsset = fetchScenario.sameOriginFile
          let targetServer = 'assetServer'
          if (!testCase.sameOrigin) {
            targetAsset = fetchScenario.crossOriginFile
            targetServer = 'bamServer'
          }
          const ajaxCapture = await browser.testHandle.createNetworkCaptures(targetServer, { test: assetServerTraceTest })
          const ajaxEventCapture = await browser.testHandle.createNetworkCaptures(targetServer, { test: testAjaxEventsRequest })
          const interactionsCapture = await browser.testHandle.createNetworkCaptures(targetServer, { test: testInteractionEventsRequest })

          if (testCase.addRouterToAllowedOrigins) {
            testCase.configuration.allowed_origins.push(
              `http://${browser.testHandle.bamServerConfig.host}:${browser.testHandle.bamServerConfig.port}/`
            )
          }

          const [ajaxRequest, ajaxEventResults, interactionsResults] = await Promise.all([
            ajaxCapture.waitForResult({ totalCount: 1 }),
            ajaxEventCapture.waitForResult({ totalCount: 2, timeout: 10000 }),
            interactionsCapture.waitForResult({ totalCount: 1, timeout: 10000 }),
            browser.url(await browser.testHandle.assetURL(targetAsset, {
              config,
              injectUpdatedLoaderConfig: true,
              init: {
                distributed_tracing: testCase.configuration
              }
            }))
          ])

          const ajaxRequestHeaders = ajaxRequest[0].request.headers
          validateTraceHeaders(ajaxRequestHeaders, config, testCase.newrelicHeader, testCase.traceContextHeaders)

          const rawTimes = await browser.execute(function () {
            return window.rawTimes
          })

          ajaxEventResults.forEach((harvest) => validateTraceTime(harvest, rawTimes))
          interactionsResults.forEach((harvest) => validateTraceTime(harvest, rawTimes))
        })
      })
    })
  })

  describe('fetch with empty url string parameter', () => {
    testCases.forEach(testCase => {
      if (!testCase.sameOrigin) {
        // An empty string as the first parameter to fetch always implies same origin
        return
      }

      it(testCase.name, async () => {
        const assetAjaxTest = function (request) {
          const url = new URL(request.url, 'resolve://')
          return url.pathname === '/tests/assets/soft_navigations/distributed_tracing/fetch-dt-sameorigin-load-empty-string.html'
        }
        const ajaxCapture = await browser.testHandle.createNetworkCaptures('assetServer', { test: assetAjaxTest })

        const [ajaxRequest] = await Promise.all([
          ajaxCapture.waitForResult({ totalCount: 2 }),
          browser.url(await browser.testHandle.assetURL('soft_navigations/distributed_tracing/fetch-dt-sameorigin-load-empty-string.html', {
            config,
            injectUpdatedLoaderConfig: true,
            init: {
              distributed_tracing: testCase.configuration
            }
          }))
        ])

        const ajaxRequestHeaders = ajaxRequest[1].request.headers
        validateTraceHeaders(ajaxRequestHeaders, config, testCase.newrelicHeader, testCase.traceContextHeaders)
      })
    })
  })
})

function validateTraceTime (harvest = {}, rawTimes = []) {
  // harvest.request.body is expected to be an array of event objects
  const events = harvest.request.body

  // Iterate over each event in the harvest
  events.forEach((event, idx) => {
    if (!event.path?.startsWith('/dt/') && !event.path?.startsWith('/json')) return
    // Validate event start is non-negative and end is after start
    // Example: event = { start: 100, end: 150, timestamp: 12345678 ... }
    expect(event.start).toBeGreaterThanOrEqual(0)
    expect(event.end).toBeGreaterThan(event.start)
    validateRawTimes(event.start) // validate the start time matches what is in rawTimes

    // For each child of type 'ajax', validate its timing
    // Example: child = { type: 'ajax', start: 110, end: 120, timestamp: 23456789, ... }
    event.children.filter(x => x.type === 'ajax' && (x.path.startsWith('/dt/') || x.path.startsWith('/json'))).forEach(child => {
      validateTiming(child, events[0])
      // If child and root event have timestamps, validate child's start is in rawTimes
      if (child.timestamp && events[0].timestamp) {
        validateRawTimes(child.start)
      }
    })

    // If event and root event have timestamps, validate event timing
    if (event.timestamp && events[0].timestamp) {
      validateTiming(event, events[0])
    }
  })

  // Validates that timing properties are present and consistent
  function validateTiming (currentEvent, firstEvent) {
    // Ensure 'start' exists and is positive
    expect(currentEvent.start).toBeGreaterThan(0)
    // Ensure 'end' exists and is after 'start'
    expect(currentEvent.end).toBeGreaterThan(currentEvent.start)
    // If both objects have 'timestamp', check expected relative timing is represented by absolute timings
    if (currentEvent.timestamp && firstEvent.timestamp) {
      // 'start' should not be before reference 'start'
      expect(currentEvent.start).toBeGreaterThanOrEqual(firstEvent.start)
      // 'timestamp' should not be before reference 'timestamp'
      expect(currentEvent.timestamp).toBeGreaterThanOrEqual(firstEvent.timestamp)
      // The difference between starts should match the difference between timestamps
      const startDiff = currentEvent.start - firstEvent.start
      const timestampDiff = currentEvent.timestamp - firstEvent.timestamp
      expect(Math.abs(startDiff - timestampDiff)).toBeLessThanOrEqual(1)
    }
  }

  // Validates that the expected time difference exists in the rawTimes array
  // Example: diff = 10, rawTimes = [10, 20, 30]
  function validateRawTimes (diff) {
    expect(rawTimes.includes(diff)).toBeTrue()
  }
}

function validateTraceHeaders (headers, config, expectNewrelicHeader, expectTraceContextHeaders) {
  if (expectNewrelicHeader) {
    expect(headers.newrelic).toBeDefined()

    const newrelicHeader = JSON.parse(atob(headers.newrelic))
    expect(newrelicHeader.v).toEqual([0, 1])
    expect(newrelicHeader.d.ty).toEqual('Browser')
    expect(newrelicHeader.d.ac).toEqual(config.accountID)
    expect(newrelicHeader.d.ap).toEqual(config.agentID)
    expect(typeof newrelicHeader.d.id).toEqual('string')
    expect(newrelicHeader.d.id.length).toBeGreaterThan(0)
    expect(typeof newrelicHeader.d.tr).toEqual('string')
    expect(newrelicHeader.d.tr.length).toBeGreaterThan(0)
    expect(typeof newrelicHeader.d.ti).toEqual('number')
    expect(newrelicHeader.d.ti).toBeGreaterThan(0)
    expect(newrelicHeader.d.tk).toEqual(config.trustKey)
  } else {
    expect(headers.newrelic).toBeUndefined()
  }

  if (expectTraceContextHeaders) {
    expect(headers.traceparent).toBeDefined()

    const parentHeaderParts = headers.traceparent.split('-')
    expect(parentHeaderParts[0]).toEqual('00')
    expect(parentHeaderParts[1].length).toEqual(32)
    expect(parentHeaderParts[2].length).toEqual(16)
    expect(parentHeaderParts[3]).toEqual('01')

    expect(headers.tracestate).toBeDefined()

    const stateHeaderKey = headers.tracestate.substring(0, headers.tracestate.indexOf('='))
    expect(stateHeaderKey).toEqual(`${config.trustKey}@nr`)

    const stateHeaderParts = headers.tracestate.substring(headers.tracestate.indexOf('=') + 1).split('-')
    expect(stateHeaderParts[0]).toEqual('0')
    expect(stateHeaderParts[1]).toEqual('1')
    expect(stateHeaderParts[2]).toEqual(config.accountID)
    expect(stateHeaderParts[3]).toEqual(config.agentID)
    expect(stateHeaderParts[4].length).toEqual(16)
    expect(stateHeaderParts[5]).toEqual('')
    expect(stateHeaderParts[6]).toEqual('')
    expect(stateHeaderParts[7]).toEqual('')
    expect(Number(stateHeaderParts[8])).toBeGreaterThan(0)
  } else {
    expect(headers.traceparent).toBeUndefined()
    expect(headers.tracestate).toBeUndefined()
  }
}
