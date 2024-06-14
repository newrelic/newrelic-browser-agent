import { testLogsRequest } from '../../../tools/testing-server/utils/expect-tests'
import { notIE } from '../../../tools/browser-matcher/common-matchers.mjs'

describe('logging harvesting', () => {
  describe('logging harvests', () => {
    const pageUrl = expect.any(String)
    const customAttributes = { test: 1 }
    const attributes = { ...customAttributes, pageUrl }
    const expectedLogs = ['info', 'debug', 'trace', 'error', 'warn'].map(level => ({
      logType: level, message: level, timestamp: expect.any(Number), attributes
    }))
    const expectedPayload = {
      common: {
        attributes: {
          appId: 42,
          agentVersion: expect.any(String),
          entityGuid: expect.any(String),
          hasReplay: false,
          hasTrace: true,
          standalone: false,
          session: expect.any(String),
          ptid: expect.any(String)
        }
      },
      logs: expectedLogs
    }

    ;['api', 'api-wrap-logger'].forEach(type => {
      it(`should harvest expected logs - ${type} pre load`, async () => {
        const [{ request: { body } }] = await Promise.all([
          browser.testHandle.expectLogs(10000),
          browser.url(await browser.testHandle.assetURL(`logs-${type}-pre-load.html`))
        ])

        expect(JSON.parse(body)).toEqual(expectedPayload)
      })

      it(`should harvest expected logs - ${type} post load`, async () => {
        const [{ request: { body } }] = await Promise.all([
          browser.testHandle.expectLogs(10000),
          browser.url(await browser.testHandle.assetURL(`logs-${type}-post-load.html`))
        ])

        expect(JSON.parse(body)).toEqual(expectedPayload)
      })

      /** method used here to generate long logs is not supported by IE */
      it.withBrowsersMatching([notIE])(`should harvest early if reaching limit - ${type}`, async () => {
        let now = Date.now(); let then
        await Promise.all([
          browser.testHandle.expectLogs(10000).then(() => { then = Date.now() }),
          browser.url(await browser.testHandle.assetURL(`logs-${type}-harvest-early.html`, { init: { logging: { harvestTimeSeconds: 10 } } }))
        ])

        expect(then - now).toBeLessThan(10000)
      })

      /** method used here to generate long logs is not supported by IE */
      it.withBrowsersMatching([notIE])(`should ignore log if too large - ${type}`, async () => {
        const [{ request: { body } }] = await Promise.all([
          browser.testHandle.expectLogs(10000),
          browser.url(await browser.testHandle.assetURL(`logs-${type}-too-large.html`))
        ])
        expect(JSON.parse(body)).toEqual(expectedPayload) // should not contain the '...xxxxx...' payload in it
      })
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
          browser.testHandle.expectLogs(10000),
          browser.url(await browser.testHandle.assetURL('logs-api-post-load.html'))
        ])

        // // Pause a bit for browsers built-in automated retry logic crap
        await browser.pause(500)
        await browser.testHandle.clearScheduledReplies('bamServer')

        await browser.testHandle.scheduleReply('bamServer', {
          test: testLogsRequest,
          permanent: true
        })

        const secondLogsHarvest = await browser.testHandle.expectLogs(10000)

        expect(firstLogsHarvest.reply.statusCode).toEqual(statusCode)
        expect(secondLogsHarvest.request.body).toEqual(firstLogsHarvest.request.body)
      })
    )
  })
})
