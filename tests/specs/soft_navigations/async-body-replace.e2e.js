import { testSupportMetricsRequest } from '../../../tools/testing-server/utils/expect-tests'

describe('async document.body replacement', () => {
  const config = { loader: 'spa', init: { soft_navigations: { enabled: true } } }
  let supportabilityMetricsCapture

  beforeEach(async () => {
    supportabilityMetricsCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testSupportMetricsRequest })
    await browser.url(
      await browser.testHandle.assetURL('soft_navigations/async-body-replace.html', config)
    ).then(() => browser.waitForAgentLoad())

    /*
      The agent's warn() writes to console.debug, which it looks up at call time, so it can be wrapped after load.
      Only agent warnings are recorded.
    */
    await browser.execute(function () {
      window.warnings = []
      var original = console.debug
      console.debug = function (message) {
        if (typeof message === 'string' && message.indexOf('New Relic Warning') === 0) window.warnings.push(message)
        return original.apply(this, arguments)
      }
    })
  })

  /*
    The soft nav instrument throttles with a leading debounce (UI_WAIT_INTERVAL = 100ms) that DROPS, not queues,
    any event inside the window. Each event below is therefore spaced past that window, otherwise a later
    event would never reach the document.body check at all and the test would pass vacuously.
  */
  const PAST_THROTTLE_WINDOW = 150

  it('does not throw when UI events fire while document.body is missing', async () => {
    // A real click starts a soft nav: the URL changes now, and the body is torn down and held out until we release it.
    await browser.execute(function () { window.holdBody = true })
    await $('#go').click()
    expect(await browser.execute(function () { return document.body === null })).toBe(true)

    for (const type of ['click', 'keydown', 'submit']) {
      await browser.pause(PAST_THROTTLE_WINDOW)
      await browser.execute(function (type) {
        document.documentElement.dispatchEvent(new Event(type, { bubbles: true }))
      }, type)
    }

    // back/forward while the body is missing: popstate fires asynchronously, in the middle of the gap
    await browser.pause(PAST_THROTTLE_WINDOW)
    await browser.execute(function () { history.back() })
    await browser.waitUntil(() => browser.execute(function () {
      return window.eventLog.some(function (e) { return e.type === 'popstate' })
    }), { timeoutMsg: 'popstate never fired' })

    // confirm the test really exercised the gap, rather than assuming it
    const eventLog = await browser.execute(function () { return window.eventLog })
    for (const type of ['keydown', 'submit', 'popstate']) {
      expect(eventLog.find(e => e.type === type)?.bodyIsNull).toBe(true)
    }

    await browser.execute(function () { window.finishReplace() })

    const { errorCount, errors, warnings } = await browser.execute(function () {
      return { errorCount: window.errorCount, errors: window.errors, warnings: window.warnings }
    })
    expect({ errorCount, errors }).toEqual({ errorCount: 0, errors: [] })

    /*
      One warning (code 83) per skipped event. The initial real click is NOT skipped, since the body still exists
      when the agent's capture-phase listener runs, so only the three dispatched events and the popstate warn.
    */
    expect(warnings).toHaveLength(4)
    warnings.forEach(w => expect(w).toMatch(/warning-codes\.md#83$/))

    // supportability metrics are harvested on unload, so navigate away with the expectation already set up
    const [supportabilityMetricsHarvests] = await Promise.all([
      supportabilityMetricsCapture.waitForResult({ totalCount: 1 }),
      browser.url(await browser.testHandle.assetURL('/'))
    ])
    const supportabilityMetrics = supportabilityMetricsHarvests[0].request.body.sm
    for (const type of ['click', 'keydown', 'submit', 'popstate']) {
      expect(supportabilityMetrics).toEqual(expect.arrayContaining([{
        params: { name: `SoftNav/Interaction/NoBody/${type}` },
        stats: { c: 1 }
      }]))
    }
  })
})
