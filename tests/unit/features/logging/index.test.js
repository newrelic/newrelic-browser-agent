import { Aggregate } from '../../../../src/features/logging/aggregate'
import { LOGGING_MODE } from '../../../../src/features/logging/constants'

describe('Logging aggregate', () => {
  test('serializer should not overwrite agent reserved attributes with user-provided attributes', () => {
    const agentInst = {
      agentIdentifier: 'abcd',
      info: {
        licenseKey: 'licenseKey',
        applicationID: '123',
        errorBeacon: 'someValue',
        jsAttributes: {
          agentVersion: 'foobar',
          appId: 'foobar',
          'entity.guid': 'foobar',
          'instrumentation.provider': 'foobar',
          'instrumentation.version': 'foobar',
          'instrumentation.name': 'foobar',
          ptid: 'foobar',
          session: 'foobar',
          hasReplay: 'foobar',
          hasTrace: 'foobar',
          standalone: 'foobar',
          customAttr: 'customVal'
        }
      },
      init: {
        privacy: {
          cookies_enabled: true
        }
      },
      runtime: {
        version: '1.0.0',
        loaderType: 'loaderTypeX',
        ptid: 'ptid123',
        session: {
          state: {
            value: '12345',
            loggingMode: LOGGING_MODE.INFO,
            sessionReplayMode: 1,
            sessionTraceMode: 1
          }
        },
        registeredEntities: [],
        appMetadata: {
          agents: [
            { entityGuid: 'foobar' }
          ]
        }
      }
    }

    const logAgg = new Aggregate(agentInst)
    const actual = logAgg.serializer([
      {
        timestamp: 1234,
        message: 'test message',
        level: 'INFO',
        attributes: {
          pageUrl: 'http://example.com'
        }
      }
    ])

    expect(actual[0].common).toEqual({
      attributes: {
        agentVersion: '1.0.0',
        appId: '123',
        'entity.guid': 'foobar',
        hasReplay: true,
        hasTrace: true,
        'instrumentation.name': 'loaderTypeX',
        'instrumentation.provider': 'browser',
        'instrumentation.version': '1.0.0',
        ptid: 'ptid123',
        session: '12345',
        standalone: false,
        customAttr: 'customVal'
      }
    })
  })
})
