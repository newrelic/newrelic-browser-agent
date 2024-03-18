import { testRumRequest } from '../../tools/testing-server/utils/expect-tests'

describe('NR Server Time', () => {
  let serverTime

  beforeEach(async () => {
    serverTime = Date.now() - (60 * 60 * 1000) // Subtract an hour to make testing easier

    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      permanent: true,
      setHeaders: [
        { key: 'Date', value: (new Date(serverTime)).toUTCString() }
      ]
    })
  })

  it('should send jserror with timestamp prior to rum date header', async () => {
    const [errors] = await Promise.all([
      browser.testHandle.expectErrors(),
      browser.url(await browser.testHandle.assetURL('nr-server-time/error-before-load.html'))
        .then(() => browser.waitForAgentLoad())
    ])

    const error = errors.request.body.err[0]
    expect(error.params.firstOccurrenceTimestamp).toEqual(error.params.timestamp)
    expect(error.params.timestamp).toBeWithin(serverTime - 5000, serverTime)
  })

  it('should send jserror with timestamp after rum date header', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented.html'))
      .then(() => browser.waitForAgentLoad())

    const [errors] = await Promise.all([
      browser.testHandle.expectErrors(),
      browser.execute(function () {
        newrelic.noticeError(new Error('test error'))
      })
    ])

    const error = errors.request.body.err[0]
    expect(error.params.firstOccurrenceTimestamp).toEqual(error.params.timestamp)
    expect(error.params.timestamp).toBeWithin(serverTime, serverTime + 5000)
  })

  it('should send page action with timestamp before rum date header', async () => {
    const [pageActions] = await Promise.all([
      browser.testHandle.expectIns(),
      browser.url(await browser.testHandle.assetURL('nr-server-time/page-action-before-load.html'))
        .then(() => browser.waitForAgentLoad())
    ])

    const pageAction = pageActions.request.body.ins[0]
    expect(pageAction.timestamp).toBeWithin(serverTime - 5000, serverTime)
  })

  it('should send page action with timestamp after rum date header', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented.html'))
      .then(() => browser.waitForAgentLoad())

    const [pageActions] = await Promise.all([
      browser.testHandle.expectIns(),
      browser.execute(function () {
        newrelic.addPageAction('bizbaz')
      })
    ])

    const pageAction = pageActions.request.body.ins[0]
    expect(pageAction.timestamp).toBeWithin(serverTime, serverTime + 5000)
  })
})
