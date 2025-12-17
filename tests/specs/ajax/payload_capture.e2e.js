import { testAjaxEventsRequest, testInteractionEventsRequest } from '../../../tools/testing-server/utils/expect-tests'

describe('capture_payloads', () => {
  let ajaxEventsCapture, bIxnCapture

  beforeEach(async () => {
    [ajaxEventsCapture, bIxnCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testAjaxEventsRequest },
      { test: testInteractionEventsRequest }
    ])
  })

  const modes = [
    'off',
    'failures',
    'all'
  ]

  const loaders = [
    'full',
    'spa'
  ]

  const methods = [
    'xhr',
    'fetch'
  ]

  const deny_lists = [
    undefined,
    ['http://bam-test-1.nr-local.net:3333/text-plain']
  ]

  const obfuscations = [
    false,
    true
  ]

  const expected_values = {
    '/echo-body': {
      capturedWith: ['all'],
      values: {
        requestBody: '{"message":"success request"}',
        requestHeaders: '{"content-type":"application/json","x-test-header":"test-value"}',
        requestQuery: undefined,
        responseBody: '{"receivedBody":{"message":"success request"},"bodyType":"object"}'
      }
    },
    '/text-plain': {
      capturedWith: ['all'],
      values: {
        requestBody: 'just some plain text',
        requestHeaders: '{"content-type":"text/plain"}',
        requestQuery: undefined,
        responseBody: 'Plain text response'
      }
    },
    '/xml': {
      capturedWith: ['all'],
      values: {
        requestBody: '<note><body>This is a test</body></note>',
        requestHeaders: '{"content-type":"text/plain"}',
        requestQuery: undefined,
        responseBody: '<?xml version="1.0"?><root><message>Hello XML</message></root>'
      }
    },
    '/status/400': {
      capturedWith: ['all', 'failures'],
      values: {
        requestBody: '{"message":"error request"}',
        requestHeaders: '{"content-type":"application/json"}',
        requestQuery: undefined,
        responseBody: '{"status":400,"message":"Custom status code","body":{"message":"error request"}}'
      }
    },
    '/status/500': {
      capturedWith: ['all', 'failures'],
      values: {
        requestBody: '{"message":"error request"}',
        requestHeaders: '{"content-type":"application/json"}',
        requestQuery: undefined,
        responseBody: '{"status":500,"message":"Custom status code","body":{"message":"error request"}}'
      }
    },
    '/json-with-query': {
      capturedWith: ['all'],
      values: {
        requestBody: undefined,
        requestHeaders: undefined,
        requestQuery: '{"param1":"value1","param2":"value2"}',
        responseBody: '{"text":"hi!","receivedQuery":{"param1":"value1","param2":"value2"}}'
      }
    },
    '/gql-error': {
      capturedWith: ['all', 'failures'],
      values: {
        requestBody: '{"query":"query { unknownField }","operationName":"TestQuery"}',
        requestHeaders: '{"content-type":"application/json"}',
        requestQuery: undefined,
        responseBody: '{"errors":[{"message":"Field \\"unknownField\\" not found on type \\"Query\\"","locations":[{"line":2,"column":3}],"path":["unknownField"]}],"data":null}'
      }
    },
    '/binary': {
      capturedWith: ['all'],
      values: {
        requestBody: 'send me back some binary',
        requestHeaders: '{"content-type":"text/plain"}',
        requestQuery: undefined,
        responseBody: undefined
      }
    },
    '/echo-large': {
      capturedWith: ['all'],
      values: {
        requestBody: '{"data":"' + 'x'.repeat(4083) + ' ...',
        requestHeaders: '{"content-type":"application/json"}',
        requestQuery: undefined,
        responseBody: '{"receivedBody":{"data":"' + 'x'.repeat(4067) + ' ...'
      }
    },
    '/echo-large-unicode': {
      capturedWith: ['all'],
      values: {
        requestBody: '{"message":"' + 'Hello 世界 🌍 '.repeat(226) + 'Hello 世界' + ' ...', // should get truncated right there
        requestHeaders: '{"content-type":"application/json"}',
        requestQuery: undefined,
        responseBody: '{"receivedBody":{"message":"' + 'Hello 世界 🌍 '.repeat(225) + 'Hello 世界 ' + ' ...'
      }
    }
  }

  const obfuscatedValue = val => {
    if (typeof val !== 'string') return val
    return val
      .replace(/text\/plain/g, 'HEADER REDACTED')
      .replace(/plain text/g, 'BODY REDACTED')
  }

  const expectBytes = (attr) => {
    if (typeof attr !== 'string') attr = JSON.stringify(attr)
    expect(new TextEncoder().encode(attr).length).toBeLessThanOrEqual(4096)
  }

  const expectResponseHeaders = (event, expectExists = true) => {
    let responseHeaders = event.children.find(x => x.key === 'responseHeaders')?.value
    if (!expectExists) {
      expect(responseHeaders).toBeUndefined()
      return
    }
    expectBytes(responseHeaders)
    if (typeof responseHeaders === 'string') {
      responseHeaders = JSON.parse(responseHeaders)
    }
    expect(responseHeaders).toEqual(expect.objectContaining({
      'access-control-allow-credentials': 'true',
      'access-control-allow-origin': expect.stringContaining('bam-test-1.nr-local.net'),
      'access-control-expose-headers': 'X-NewRelic-App-Data, Date',
      'cache-control': 'no-cache, must-revalidate, proxy-revalidate',
      connection: 'keep-alive',
      'content-length': expect.any(String),
      date: expect.any(String),
      expires: '0',
      'keep-alive': 'timeout=72',
      pragma: 'no-cache',
      'surrogate-control': 'no-store',
      vary: 'Origin'
    }))
  }

  modes.forEach((mode) => {
    loaders.forEach((loader) => {
      methods.forEach((method) => {
        deny_lists.forEach((deny_list) => {
          obfuscations.forEach((obfuscate) => {
            it(`${mode} | ${loader} | ${method} | ${deny_list ? 'denying' : 'none'} | ${obfuscate ? 'obfuscating' : 'none'}`, async () => {
              await browser.url(await browser.testHandle.assetURL(`ajax/${method}-payloads${obfuscate ? '-obfuscated' : ''}.html`, {
                init: { ajax: { capture_payloads: mode, deny_list } },
                loader
              }))
              let ajaxEvents
              if (loader === 'spa') {
                const [eventsHarvest] = await bIxnCapture.waitForResult({ totalCount: 1 })
                // Flatten interaction children to get ajax events
                ajaxEvents = eventsHarvest.request.body
                  .flatMap(event => event.children || [])
                  .filter(child => child.type === 'ajax')
                  .filter(event => Object.keys(expected_values).includes(event.path))
              } else {
                const [eventsHarvest] = await ajaxEventsCapture.waitForResult({ totalCount: 1 })
                ajaxEvents = eventsHarvest.request.body.filter(event => Object.keys(expected_values).includes(event.path))
              }

              if (deny_list) {
                expect(ajaxEvents.filter(event => deny_list.includes(event.path))).toHaveLength(0)
              }

              ajaxEvents.forEach(event => {
                const expectedValue = expected_values[event.path]
                expectResponseHeaders(event, expectedValue.capturedWith.includes(mode))

                Object.entries(expectedValue.values).forEach(([attr, expectedVal]) => {
                  const eventAttr = event.children.find(x => x.key === attr)
                  if (expectedValue.capturedWith.includes(mode)) {
                    if (expectedVal === undefined) {
                      expect(eventAttr).toBeUndefined()
                    } else {
                      expectBytes(eventAttr.value)
                      if (obfuscate) expect(eventAttr.value).toEqual(obfuscatedValue(expectedVal))
                      else expect(eventAttr.value).toEqual(expectedVal)
                    }
                  } else {
                    expect(eventAttr).toBeUndefined()
                  }
                })
              })
            })
          })
        })
      })
    })
  })
})
