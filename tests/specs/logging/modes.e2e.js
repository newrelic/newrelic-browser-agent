import { testLogsRequest, testRumRequest } from '../../../tools/testing-server/utils/expect-tests'
import { rumFlags } from '../../../tools/testing-server/constants'
import { LOGGING_MODE } from '../../../src/features/logging/constants'

describe('logging mode from RUM flags', () => {
  let logsCapture
  const mockRumResponse = async (log, logapi) => {
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify(rumFlags({ log, logapi }))
    })
  }
  const sessionOffSetting = { init: { privacy: { cookies_enabled: false } } }
  beforeEach(async () => {
    logsCapture = await browser.testHandle.createNetworkCaptures('bamServer', {
      test: testLogsRequest
    })
  })

  it('only captures wrapped logs when logapi is 0', async () => {
    await mockRumResponse(LOGGING_MODE.INFO, LOGGING_MODE.OFF)
    await browser.url(await browser.testHandle.assetURL('instrumented.html', sessionOffSetting)).then(() => browser.waitForAgentLoad())

    const [logsHarvests] = await Promise.all([
      logsCapture.waitForResult({ totalCount: 1 }),
      browser.execute(() => {
        console.log("It's a-me, Mario")
        console.debug('Mamma mia')
        newrelic.log('Here we go')
        const printer = {
          log: function (message) {} // other args are ignored
        }
        newrelic.wrapLogger(printer, 'log', { level: 'info' })
        printer.log('Wahoo!')
      })
    ])

    const logPayload = JSON.parse(logsHarvests[0].request.body)[0]
    expect(logPayload.logs.length).toEqual(1)
    expect(logPayload.logs[0].message).toEqual("It's a-me, Mario")
    // The console.debug should not be captured because it's above verbosity level.
    // The newrelic.log should not be captured because logapi flag is set to OFF.
    // The printer.log should not be captured because logapi flag is set to OFF.
  })

  it('only captures api logs when log flag is 0', async () => {
    await mockRumResponse(LOGGING_MODE.OFF, LOGGING_MODE.INFO)
    await browser.url(await browser.testHandle.assetURL('instrumented.html', sessionOffSetting)).then(() => browser.waitForAgentLoad())

    const [logsHarvests] = await Promise.all([
      logsCapture.waitForResult({ totalCount: 1 }),
      browser.execute(() => {
        console.log("It's a-me, Mario")
        newrelic.log('Mamma mia')
        newrelic.log('Here we go', { level: 'trace' })
        const printer = {
          log: function (message) {} // other args are ignored
        }
        newrelic.wrapLogger(printer, 'log', { level: 'info' })
        printer.log('Wahoo!')
      })
    ])

    const logPayload = JSON.parse(logsHarvests[0].request.body)[0]
    expect(logPayload.logs.length).toEqual(2)
    // The console.log should not be captured because log flag is set to OFF.
    expect(logPayload.logs[0].message).toEqual('Mamma mia')
    // The second newrelic.log should not be captured because the level is above INFO flag.
    expect(logPayload.logs[1].message).toEqual('Wahoo!')
  })
})
