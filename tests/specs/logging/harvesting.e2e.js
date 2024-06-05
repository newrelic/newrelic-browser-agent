import { testLogsRequest } from '../../../tools/testing-server/utils/expect-tests'

describe('logging harvesting', () => {
  describe('logging harvests', () => {
    const customAttributes = '[{"test":1}]'
    const expectedLogs = ['info', 'debug', 'trace', 'error', 'warn'].map(level => ({
      logType: level, message: level, session: { url: expect.any(String) }, timestamp: expect.any(Number), attributes: customAttributes
    }))
    const expectedPayload = {
      common: {
        attributes: {
          agent: {
            appId: 42,
            distribution: expect.any(String),
            version: expect.any(String)
          },
          entityGuid: expect.any(String),
          session: {
            hasReplay: false,
            hasTrace: true,
            id: expect.any(String),
            pageTraceId: expect.any(String)
          }
        }
      },
      logs: expectedLogs
    }

    it('should harvest expected logs - API pre load', async () => {
      const [{ request: { body } }] = await Promise.all([
        browser.testHandle.expectLogs(),
        browser.url(await browser.testHandle.assetURL('logs-api-pre-load.html'))
      ])

      expect(JSON.parse(body)).toEqual(expectedPayload)
    })

    it('should harvest expected logs - API post load', async () => {
      const [{ request: { body } }] = await Promise.all([
        browser.testHandle.expectLogs(),
        browser.url(await browser.testHandle.assetURL('logs-api-post-load.html'))
      ])

      expect(JSON.parse(body)).toEqual(expectedPayload)
    })

    it('should harvest expected logs - API wrap logger pre load', async () => {
      const [{ request: { body } }] = await Promise.all([
        browser.testHandle.expectLogs(),
        browser.url(await browser.testHandle.assetURL('logs-api-wrap-logger-pre-load.html'))
      ])

      expect(JSON.parse(body)).toEqual(expectedPayload)
    })

    it('should harvest expected logs - API wrap logger post load', async () => {
      const [{ request: { body } }] = await Promise.all([
        browser.testHandle.expectLogs(),
        browser.url(await browser.testHandle.assetURL('logs-api-wrap-logger-post-load.html'))
      ])

      expect(JSON.parse(body)).toEqual(expectedPayload)
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
          browser.testHandle.expectLogs(),
          browser.url(await browser.testHandle.assetURL('logs-api-post-load.html'))
        ])

        // // Pause a bit for browsers built-in automated retry logic crap
        await browser.pause(500)
        await browser.testHandle.clearScheduledReplies('bamServer')

        await browser.testHandle.scheduleReply('bamServer', {
          test: testLogsRequest,
          permanent: true
        })

        const secondLogsHarvest = await browser.testHandle.expectLogs()

        expect(firstLogsHarvest.reply.statusCode).toEqual(statusCode)
        expect(secondLogsHarvest.request.body).toEqual(firstLogsHarvest.request.body)
      })
    )
  })
})
