import { testErrorsRequest, testLogsRequest, testRumRequest } from '../../../tools/testing-server/utils/expect-tests'
import { rumFlags } from '../../../tools/testing-server/constants'
import { LOGGING_MODE } from '../../../src/features/logging/constants'

describe('newrelic api', () => {
  afterEach(async () => {
    await browser.destroyAgentSession()
  })

  it('should fire `newrelic` event after RUM call', async () => {
    const rumCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testRumRequest })

    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify(rumFlags({ log: LOGGING_MODE.INFO }))
    })

    const [rumHarvests] =
      await Promise.all([
        rumCapture.waitForResult({ timeout: 10000 }),
        browser.url(await browser.testHandle.assetURL('event-listener-newrelic.html'))
          .then(() => browser.waitForAgentLoad())
          .then(() => browser.waitUntil(
            () => browser.execute(function () {
              return window?.newrelicEventTime
            }),
            {
              timeout: 10000,
              timeoutMsg: 'Timeout while waiting on `newrelic` event'
            }
          ))
      ])

    expect(rumHarvests.length).toEqual(1)
    const rumResult = JSON.parse(rumHarvests[0].reply.body)

    const newrelicEventTime = await browser.execute(function () {
      return window.newrelicEventTime
    })

    expect(newrelicEventTime > rumResult.app.nrServerTime).toBe(true)
  })

  it('should work as expected within `newrelic` event listeners', async () => {
    const [logsCapture, errorsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testLogsRequest },
      { test: testErrorsRequest }
    ])
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify(rumFlags({ log: LOGGING_MODE.INFO }))
    })

    const [logsHarvests, errorsHarvests] =
    await Promise.all([
      logsCapture.waitForResult({ totalCount: 1, timeout: 10000 }),
      errorsCapture.waitForResult({ totalCount: 1, timeout: 10000 }),
      browser.url(await browser.testHandle.assetURL('event-listener-newrelic.html'))
        .then(() => browser.waitForAgentLoad())
    ])

    expect(errorsHarvests.length).toEqual(1)
    expect(errorsHarvests[0].request.query.ct).toEqual('http://custom.transaction/some-page')
    const actualErrors = errorsHarvests[0].request.body.err
    expect(actualErrors.length).toEqual(1)
    expect(actualErrors[0].params.message).toEqual('error 1')

    expect(logsHarvests.length).toEqual(1)
    const logsPayload = JSON.parse(logsHarvests[0].request.body)
    expect(logsPayload[0].common.attributes['application.version']).toEqual('1.0.0')
    expect(logsPayload[0].common.attributes.foo).toEqual('bar')
    expect(logsPayload[0].logs[0].message).toEqual('test message')
  })
})
