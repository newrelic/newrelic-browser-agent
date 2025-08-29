import { testLogsRequest, testRumRequest } from '../../../tools/testing-server/utils/expect-tests'
import { rumFlags } from '../../../tools/testing-server/constants'
import { LOGGING_MODE } from '../../../src/features/logging/constants'

describe('logging harvesting', () => {
  let logsCapture

  beforeEach(async () => {
    logsCapture = await browser.testHandle.createNetworkCaptures('bamServer', {
      test: testLogsRequest
    })
  })

  afterEach(async () => {
    // logging mode is sticky to the session, so we need to reset before the next test
    await browser.destroyAgentSession()
  })

  const mockRumResponse = async (logLevel) => {
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify(rumFlags({ log: logLevel }))
    })
  }

  const checkPayload = (actualPayload, expectedPayload) => {
    expect(actualPayload).toContainAllKeys(['common', 'logs'])
    expect(actualPayload.common).toEqual(expectedPayload.common)
    // expect(actualPayload.logs).toMatchObject(expectedPayload.logs)

    actualPayload.logs.forEach((log, index) => {
      expect(log).toContainAllKeys(['level', 'message', 'timestamp', 'attributes'])

      const expectedLog = expectedPayload.logs.find(x => x.level === log.level && x.message === log.message)

      expect(log.timestamp).toEqual(expect.any(Number))
      expect(log.timestamp).toBeLessThanOrEqual(Date.now())
      expect(log.attributes).toMatchObject(expectedLog.attributes)
    })
  }

  describe('logging harvests', () => {
    const pageUrl = expect.any(String)
    const customAttributes = { test: 1 }

    const expectedLogs = (type, logLevels = []) => {
      return logLevels.map(level => ({
        level: type === 'console-logger' && level === 'LOG' ? 'INFO' : level,
        message: level.toLowerCase(),
        timestamp: expect.any(Number),
        attributes: {
          pageUrl,
          appId: 42,
          'entity.guid': expect.any(String),
          ...(type === 'api' || type === 'api-wrap-logger' ? customAttributes : {})
        }
      }))
    }

    const commonAttributes = (customAttrs = {}) => ({
      common: {
        attributes: {
          agentVersion: expect.any(String),
          'instrumentation.provider': 'browser',
          'instrumentation.version': expect.any(String),
          'instrumentation.name': 'spa',
          hasReplay: false,
          hasTrace: true,
          standalone: false,
          session: expect.any(String),
          ptid: expect.any(String),
          ...customAttrs
        }
      }
    })

    ;['api', 'api-wrap-logger', 'console-logger'].forEach(type => {
      Object.keys(LOGGING_MODE).filter(mode => mode !== 'OFF').forEach(mode => {
        const logLevel = LOGGING_MODE[mode]
        const loggingModes = Object.entries(LOGGING_MODE).filter(entry => entry[1] > LOGGING_MODE.OFF && entry[1] <= logLevel).map(entry => entry[0])
        if (type === 'console-logger' && logLevel >= LOGGING_MODE.INFO) {
          loggingModes.push('LOG')
        }
        const expectedPayload = [{
          ...commonAttributes(),
          logs: expectedLogs(type, loggingModes)
        }]

        it(`should harvest expected logs - ${type} pre load - logging mode: ${mode}`, async () => {
          await mockRumResponse(logLevel)
          const [[{ request: { body } }]] = await Promise.all([
            logsCapture.waitForResult({ totalCount: 1, timeout: 15000 }),
            await browser.url(await browser.testHandle.assetURL(`logs-${type}-pre-load.html`))
          ])

          const actualPayload = JSON.parse(body)
          checkPayload(actualPayload[0], expectedPayload[0])
        })

        it(`should harvest expected logs - ${type} post load - logging mode: ${mode}`, async () => {
          await mockRumResponse(logLevel)
          const [[{ request: { body } }]] = await Promise.all([
            logsCapture.waitForResult({ totalCount: 1, timeout: 15000 }),
            browser.url(await browser.testHandle.assetURL(`logs-${type}-post-load.html`))
          ])
          const actualPayload = JSON.parse(body)
          checkPayload(actualPayload[0], expectedPayload[0])
        })

        it(`should have custom attributes from info object and setCustomAttribute call - ${type} pre load - ${mode}`, async () => {
          await mockRumResponse(logLevel)
          const [[{ request: { body } }]] = await Promise.all([
            logsCapture.waitForResult({ totalCount: 1, timeout: 15000 }),
            browser.url(await browser.testHandle.assetURL(`logs-${type}-custom-attributes-pre-load.html`))
          ])
          const actualPayload = JSON.parse(body)

          checkPayload(actualPayload[0], {
            ...commonAttributes({ test: 19, hello: 'world', bool: true }),
            logs: expectedLogs(type, loggingModes)
          })
        })

        it(`should have custom attributes from info object and setCustomAttribute call - ${type} post load - ${mode}`, async () => {
          await mockRumResponse(logLevel)
          const [[{ request: { body } }]] = await Promise.all([
            logsCapture.waitForResult({ totalCount: 1, timeout: 15000 }),
            browser.url(await browser.testHandle.assetURL(`logs-${type}-custom-attributes-post-load.html`))
          ])
          const actualPayload = JSON.parse(body)

          checkPayload(actualPayload[0], {
            ...commonAttributes({ test: 19, hello: 'world', bool: true }),
            logs: expectedLogs(type, loggingModes)
          })
        })
      })

      it(`should harvest early if reaching limit - ${type}`, async () => {
        await mockRumResponse(LOGGING_MODE.INFO)
        let now = Date.now(); let then
        await Promise.all([
          logsCapture.waitForResult({ totalCount: 1 }).then(() => { then = Date.now() }),
          browser.url(await browser.testHandle.assetURL(`logs-${type}-harvest-early.html`, { init: { harvest: { interval: 10 } } }))
        ])

        expect(then - now).toBeLessThan(10000)
      })

      it(`should ignore log if too large - ${type}`, async () => {
        await mockRumResponse(LOGGING_MODE.TRACE)
        const [[{ request: { body } }]] = await Promise.all([
          logsCapture.waitForResult({ totalCount: 1 }),
          browser.url(await browser.testHandle.assetURL(`logs-${type}-too-large.html`))
        ])
        const loggingModes = Object.entries(LOGGING_MODE).filter(entry => entry[1] > LOGGING_MODE.OFF).map(entry => entry[0])
        if (type === 'console-logger') {
          loggingModes.push('LOG')
        }
        const logs = [...expectedLogs(type, loggingModes), {
          level: 'DEBUG',
          message: 'New Relic Warning: https://github.com/newrelic/newrelic-browser-agent/blob/main/docs/warning-codes.md#63',
          timestamp: expect.any(Number),
          attributes: {
            pageUrl: expect.any(String)
          }
        }]
        const expectedPayload = [{
          ...commonAttributes(),
          logs
        }]
        checkPayload(JSON.parse(body)[0], expectedPayload[0]) // should not contain the '...xxxxx...' payload in it
      })
    })

    it('should harvest error object logs', async () => {
      const [[{ request: { body } }]] = await Promise.all([
        logsCapture.waitForResult({ totalCount: 1 }),
        browser.url(await browser.testHandle.assetURL('logs-api-wrap-logger-error-object.html'))
      ])

      expect(JSON.parse(body)[0].logs[0].message).toEqual('Error: test')
    })

    it('should not double harvest on navigation logs', async () => {
      await mockRumResponse(LOGGING_MODE.INFO)
      const [logsRequests] = await Promise.all([
        logsCapture.waitForResult({ timeout: 15000 }),
        browser.url(await browser.testHandle.assetURL('logs-redirect.html'))
      ])

      // 1 harvest
      expect(logsRequests.length).toEqual(1)
      const parsedBody = JSON.parse(logsRequests[0].request.body)
      // 1 log in the 1 harvest
      expect(parsedBody[0].logs.length).toEqual(1)
      expect(parsedBody[0].logs[0].message).toEqual('redirect to https://gmail.com')
    })

    it('should allow for re-wrapping and 3rd party wrapping', async () => {
      await mockRumResponse(LOGGING_MODE.DEBUG)
      const [[{ request: { body } }]] = await Promise.all([
        logsCapture.waitForResult({ totalCount: 1 }),
        browser.url(await browser.testHandle.assetURL('logs-api-wrap-logger-rewrapped.html'))
      ])
      const logs = JSON.parse(body)[0].logs
      // should not duplicate after re-wrapping,
      // if it did we would see 1 + 2 + 2 = 5 logs here
      // we would also see multiple test2 or test3 messages show up
      expect(logs.length).toEqual(3)
      // original wrapping context (warn)
      expect(logs[0].message).toEqual('test1')
      expect(logs[0].level).toEqual('WARN')
      // should not re-wrap but will overwrite the attributes so it'll become a DEBUG; the 'test2' message should be there
      expect(logs[1].message).toEqual('test2')
      expect(logs[1].level).toEqual('DEBUG')
      // should allow a 3rd party to wrap the function and not affect the context (debug)
      expect(logs[2].message).toEqual('test3')
      expect(logs[2].level).toEqual('DEBUG')
    })
  })

  describe('logging retry harvests', () => {
    [429].forEach(statusCode =>
      it(`should send the logs on the next harvest when the first harvest statusCode is ${statusCode}`, async () => {
        await mockRumResponse(LOGGING_MODE.TRACE)
        await browser.testHandle.scheduleReply('bamServer', {
          test: testLogsRequest,
          permanent: true,
          statusCode
        })

        const [firstLogsHarvest] = await Promise.all([
          logsCapture.waitForResult({ totalCount: 1 }),
          browser.url(await browser.testHandle.assetURL('logs-api-post-load.html'))
        ])

        // // Pause a bit for browsers built-in automated retry logic crap
        await browser.pause(500)
        await browser.testHandle.clearScheduledReplies('bamServer')

        await browser.testHandle.scheduleReply('bamServer', {
          test: testLogsRequest,
          permanent: true
        })

        const secondLogsHarvest = await logsCapture.waitForResult({ totalCount: 2 })

        expect(firstLogsHarvest[0].reply.statusCode).toEqual(statusCode)
        expect(secondLogsHarvest[1].request.body).toEqual(firstLogsHarvest[0].request.body)
      })
    )
  })
})
