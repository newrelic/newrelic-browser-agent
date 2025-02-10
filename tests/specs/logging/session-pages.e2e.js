import { testLogsRequest } from '../../../tools/testing-server/utils/expect-tests'
import { LOGGING_MODE } from '../../../src/features/logging/constants'
import { supportsMultiTabSessions } from '../../../tools/browser-matcher/common-matchers.mjs'
import { getLogs } from '../util/helpers'

describe('Logging Across Pages', () => {
  let logsCapture
  const TIMEOUT = 10000

  beforeEach(async () => {
    logsCapture = await browser.testHandle.createNetworkCaptures('bamServer', {
      test: testLogsRequest
    })
    await browser.enableLogging()
  })

  afterEach(async () => {
    await browser.destroyAgentSession()
  })

  it('should record across same-tab page refresh', async () => {
    let [logsHarvests] = await Promise.all([
      logsCapture.waitForResult({ totalCount: 1 }),
      browser.url(await browser.testHandle.assetURL('logs-console-logger-pre-load.html'))
    ])

    const { localStorage } = await browser.getAgentSessionInfo()
    const sessionId = localStorage.value
    const page1Payload = JSON.parse(logsHarvests[0].request.body)
    expect(page1Payload[0].common.attributes.session).toEqual(sessionId)
    // expect log entries for: error, warn, info, log
    expect(page1Payload[0].logs.length).toBe(4)

    // simulate a second call to rum in same session, which should return log = 0
    await browser.enableLogging({ logMode: LOGGING_MODE.OFF })
    let [refreshHarvests] = await Promise.all([
      logsCapture.waitForResult({ timeout: TIMEOUT }),
      browser.refresh()
    ])

    // confirm we are still sending logs because logging is already enabled in this session
    // note: the network capture has not been cleared, so the previous harvest is still there
    expect(refreshHarvests.length).toBe(2)
    const page2Payload = JSON.parse(refreshHarvests[1].request.body)
    expect(page2Payload[0].common.attributes.session).toEqual(sessionId)
    expect(page2Payload[0].logs.length).toBe(4)
  })

  it('should record across same-tab page navigation', async () => {
    let [logsHarvests] = await Promise.all([
      logsCapture.waitForResult({ totalCount: 1 }),
      browser.url(await browser.testHandle.assetURL('logs-console-logger-pre-load.html'))
    ])

    const { localStorage } = await browser.getAgentSessionInfo()
    const sessionId = localStorage.value
    const page1Payload = JSON.parse(logsHarvests[0].request.body)
    expect(page1Payload[0].common.attributes.session).toEqual(sessionId)
    // expect log entries for: error, warn, info, log
    expect(page1Payload[0].logs.length).toBe(4)

    // simulate a second call to rum in same session, which should return log = 0
    await browser.enableLogging({ logMode: LOGGING_MODE.OFF })
    let [navigationHarvests] = await Promise.all([
      logsCapture.waitForResult({ timeout: TIMEOUT }),
      browser.url(await browser.testHandle.assetURL('logs-console-logger-post-load.html'))
    ])

    // confirm we are still sending logs because logging is already enabled in this session
    // note: the network capture has not been cleared, so the previous harvest is still there
    expect(navigationHarvests.length).toBe(2)
    const page2Payload = JSON.parse(navigationHarvests[1].request.body)
    expect(page2Payload[0].common.attributes.session).toEqual(sessionId)
    expect(page2Payload[0].logs.length).toBe(4)
  })

  it.withBrowsersMatching(supportsMultiTabSessions)('should record across new-tab page navigation', async () => {
    let [logsHarvests] = await Promise.all([
      logsCapture.waitForResult({ totalCount: 1 }),
      browser.url(await browser.testHandle.assetURL('logs-console-logger-pre-load.html'))
    ])

    const { localStorage } = await browser.getAgentSessionInfo()
    const sessionId = localStorage.value
    const page1Payload = JSON.parse(logsHarvests[0].request.body)
    expect(page1Payload[0].common.attributes.session).toEqual(sessionId)
    // expect log entries for: error, warn, info, log
    expect(page1Payload[0].logs.length).toBe(4)

    // simulate a second call to rum in same session, which should return log = 0
    await browser.enableLogging({ logMode: LOGGING_MODE.OFF })
    let [newTabHarvests] = await Promise.all([
      logsCapture.waitForResult({ timeout: TIMEOUT }),
      browser.newWindow(await browser.testHandle.assetURL('logs-console-logger-post-load.html'), { type: 'tab' }),
      browser.waitForAgentLoad()
    ])

    // confirm we are still sending logs because logging is already enabled in this session
    // note: the network capture has not been cleared, so the previous harvest is still there
    expect(newTabHarvests.length).toBe(2)
    const page2Payload = JSON.parse(newTabHarvests[1].request.body)
    expect(page2Payload[0].common.attributes.session).toEqual(sessionId)
    expect(page2Payload[0].logs.length).toBe(4)

    // IMPORTANT! - Reset the browser for the next test or it will fail
    await browser.closeWindow()
    await browser.switchToWindow((await browser.getWindowHandles())[0])
  })

  it.withBrowsersMatching(supportsMultiTabSessions)('should kill active tab if killed in backgrounded tab', async () => {
    let [logsHarvests] = await Promise.all([
      logsCapture.waitForResult({ totalCount: 1 }),
      browser.url(await browser.testHandle.assetURL('logs-console-logger-pre-load.html'))
    ])

    const { localStorage } = await browser.getAgentSessionInfo()
    const sessionId = localStorage.value
    const page1Payload = JSON.parse(logsHarvests[0].request.body)
    expect(page1Payload[0].common.attributes.session).toEqual(sessionId)
    // expect log entries for: error, warn, info, log
    expect(page1Payload[0].logs.length).toBe(4)

    await Promise.all([
      logsCapture.waitForResult({ timeout: TIMEOUT }),
      browser.createWindow('tab')
        .then((newTab) => browser.switchToWindow(newTab.handle))
        .then(async () => browser.url(await browser.testHandle.assetURL('logs-console-logger-post-load.html')))
        .then(() => browser.waitForAgentLoad())
    ])

    const page2BlockedBeforeAbort = await browser.execute(function () {
      try {
        return Object.values(newrelic.initializedAgents)[0].features.logging.featAggregate.blocked
      } catch (err) {
        return false
      }
    })
    expect(page2BlockedBeforeAbort).toEqual(false)

    const page2Blocked = await browser.execute(function () {
      try {
        var agg = Object.values(newrelic.initializedAgents)[0].features.logging.featAggregate
        agg.abort()
        return agg.blocked
      } catch (err) {
        return false
      }
    })
    expect(page2Blocked).toEqual(true)

    await browser.pause(1000) // Give the agent time to update the session state
    await expect(getLogs()).resolves.toEqual(expect.objectContaining({
      blocked: true,
      loggingMode: LOGGING_MODE.OFF
    }))

    await browser.closeWindow()
    await browser.switchToWindow((await browser.getWindowHandles())[0])

    await browser.pause(1000) // Give the agent time to update the session state
    await expect(getLogs()).resolves.toEqual(expect.objectContaining({
      blocked: true,
      loggingMode: LOGGING_MODE.OFF
    }))
  })
})
