import { testLogsRequest } from '../../../tools/testing-server/utils/expect-tests'

describe('logging harvesting', () => {
  let logsCapture

  beforeEach(async () => {
    logsCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testLogsRequest })
  })

  describe('logging harvests', () => {
    const pageUrl = expect.any(String)
    const customAttributes = { test: 1 }
    const commonAttributes = {
      common: {
        attributes: {
          appId: 42,
          agentVersion: expect.any(String),
          'instrumentation.provider': 'browser',
          'instrumentation.version': expect.any(String),
          'instrumentation.name': 'spa',
          'entity.guid': expect.any(String),
          hasReplay: false,
          hasTrace: true,
          standalone: false,
          session: expect.any(String),
          ptid: expect.any(String)
        }
      }
    }
    const expectedLogs = (type) => {
      if (type === 'api' || type === 'api-wrap-logger') {
        return ['INFO', 'DEBUG', 'TRACE', 'ERROR', 'WARN'].map(level => ({
          level,
          message: level.toLowerCase(),
          timestamp: expect.any(Number),
          attributes: {
            pageUrl,
            ...customAttributes
          }
        }))
      } else if (type === 'console-logger') {
        return ['LOG', 'INFO', 'DEBUG', 'TRACE', 'ERROR', 'WARN'].map(level => ({
          level: level === 'LOG' ? 'INFO' : level,
          message: level.toLowerCase(),
          timestamp: expect.any(Number),
          attributes: {
            pageUrl,
            wrappedFn: `console.${level.toLowerCase()}`
          }
        }))
      }
    }

    ;['api', 'api-wrap-logger', 'console-logger'].forEach(type => {
      it(`should harvest expected logs - ${type} pre load`, async () => {
        const [[{ request: { body } }]] = await Promise.all([
          logsCapture.waitForResult({ totalCount: 1 }),
          browser.url(await browser.testHandle.assetURL(`logs-${type}-pre-load.html`))
        ])
        const expectedPayload = [{
          ...commonAttributes,
          logs: expectedLogs(type)
        }]

        expect(JSON.parse(body)).toEqual(expectedPayload)
      })

      it(`should harvest expected logs - ${type} post load`, async () => {
        const [[{ request: { body } }]] = await Promise.all([
          logsCapture.waitForResult({ totalCount: 1 }),
          browser.url(await browser.testHandle.assetURL(`logs-${type}-post-load.html`))
        ])
        const expectedPayload = [{
          ...commonAttributes,
          logs: expectedLogs(type)
        }]

        expect(JSON.parse(body)).toEqual(expectedPayload)
      })

      it(`should harvest early if reaching limit - ${type}`, async () => {
        let now = Date.now(); let then
        await Promise.all([
          logsCapture.waitForResult({ totalCount: 1 }).then(() => { then = Date.now() }),
          browser.url(await browser.testHandle.assetURL(`logs-${type}-harvest-early.html`, { init: { logging: { harvestTimeSeconds: 10 } } }))
        ])

        expect(then - now).toBeLessThan(10000)
      })

      it(`should ignore log if too large - ${type}`, async () => {
        const [[{ request: { body } }]] = await Promise.all([
          logsCapture.waitForResult({ totalCount: 1 }),
          browser.url(await browser.testHandle.assetURL(`logs-${type}-too-large.html`))
        ])

        const logs = [...expectedLogs(type), {
          level: 'DEBUG',
          message: 'New Relic Warning: https://github.com/newrelic/newrelic-browser-agent/blob/main/docs/warning-codes.md#31',
          timestamp: expect.any(Number),
          attributes: {
            pageUrl: expect.any(String),
            wrappedFn: 'console.debug'
          }
        }]
        const expectedPayload = [{
          ...commonAttributes,
          logs
        }]
        expect(JSON.parse(body)).toEqual(expectedPayload) // should not contain the '...xxxxx...' payload in it
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
      // should not re-wrap, meaning the level should not change, but the message should here
      expect(logs[1].message).toEqual('test2')
      expect(logs[1].level).toEqual('WARN')
      // should allow a 3rd party to wrap the function and not affect the context (warn)
      expect(logs[2].message).toEqual('test3')
      expect(logs[2].level).toEqual('WARN')
    })
  })

  describe('logging retry harvests', () => {
    [429].forEach(statusCode =>
      it(`should send the logs on the next harvest when the first harvest statusCode is ${statusCode}`, async () => {
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
