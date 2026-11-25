import { testAjaxEventsRequest } from '../../../tools/testing-server/utils/expect-tests'
import { onlyAndroid, onlyChrome, onlyEdge, onlyFirefox, onlyIOS, onlySafari, supportsOpeningTabs } from '../../../tools/browser-matcher/common-matchers.mjs'

/**
 * Covers AjaxRequest events for requests that never resolve normally: reported with status 0 and a `reason` attribute of
 * 'timedOut' (ajax.timeout or a native timeout), 'aborted', or 'pageUnloaded'. How each browser handles requests in flight at page unload, and
 * so which reason they get, is documented in UNLOAD_OUTCOMES below.
 */
describe('unresolved ajax requests', () => {
  let ajaxEventsCapture

  beforeEach(async () => {
    [ajaxEventsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testAjaxEventsRequest }
    ])
  })

  function getReason (event) {
    return event.children?.find(attr => attr.key === 'reason')?.value
  }

  function getEventsForPath (harvests, path) {
    return harvests
      .flatMap(harvest => harvest.request.body)
      .filter(event => event.path === path)
  }

  function sendHangingRequests (delayMs) {
    return browser.execute(function (delay) {
      fetch('/delayed?delay=' + delay)
      var xhr = new XMLHttpRequest()
      xhr.open('GET', '/delayed?delay=' + delay)
      xhr.send()
    }, delayMs)
  }

  describe('ajax.timeout', () => {
    it('reports requests that exceed the timeout once as timedOut with status 0, without reporting their late responses again', async () => {
      await browser.url(await browser.testHandle.assetURL('instrumented.html', { init: { ajax: { timeout: 1 } } }))
        .then(() => browser.waitForAgentLoad())

      // The responses arrive at 3s, well inside the capture window, so a duplicate would be caught by a later harvest.
      const [ajaxEventsHarvests] = await Promise.all([
        ajaxEventsCapture.waitForResult({ timeout: 15000 }),
        sendHangingRequests(3000)
      ])

      const events = getEventsForPath(ajaxEventsHarvests, '/delayed')
      expect(events.length).toEqual(2)
      expect(events.map(event => event.requestedWith).sort()).toEqual(['XMLHttpRequest', 'fetch'])
      events.forEach(event => {
        expect(event.status).toEqual(0)
        expect(getReason(event)).toEqual('timedOut')
        expect(event.end - event.start).toBeWithin(1000, 1100)
      })
    })

    it('reports requests that resolve within the timeout normally, without a reason', async () => {
      await browser.url(await browser.testHandle.assetURL('instrumented.html', { init: { ajax: { timeout: 5 } } }))
        .then(() => browser.waitForAgentLoad())

      const [ajaxEventsHarvests] = await Promise.all([
        ajaxEventsCapture.waitForResult({ timeout: 10000 }),
        sendHangingRequests(500)
      ])

      const events = getEventsForPath(ajaxEventsHarvests, '/delayed')
      expect(events.length).toEqual(2)
      events.forEach(event => {
        expect(event.status).toEqual(200)
        expect(getReason(event)).toBeUndefined()
      })
    })

    it('does not time out a fetch whose response arrived in time while its body is still being read for payload capture', async () => {
      await browser.url(await browser.testHandle.assetURL('instrumented.html', { init: { ajax: { timeout: 1, capture_payloads: 'all' } } }))
        .then(() => browser.waitForAgentLoad())

      // Headers arrive right away, but the body streams in over ~3s, well past the 1s timeout.
      const [ajaxEventsHarvests] = await Promise.all([
        ajaxEventsCapture.waitForResult({ timeout: 12000 }),
        browser.execute(function () {
          fetch('/streamed?count=3&interval=1000')
        })
      ])

      const events = getEventsForPath(ajaxEventsHarvests, '/streamed')
      expect(events.length).toEqual(1)
      expect(events[0].status).toEqual(200)
      expect(getReason(events[0])).toBeUndefined()
    })

    it('is disabled by default, so slow requests are reported with their real outcome', async () => {
      await browser.url(await browser.testHandle.assetURL('instrumented.html'))
        .then(() => browser.waitForAgentLoad())

      const [ajaxEventsHarvests] = await Promise.all([
        ajaxEventsCapture.waitForResult({ timeout: 12000 }),
        sendHangingRequests(3000)
      ])

      const events = getEventsForPath(ajaxEventsHarvests, '/delayed')
      expect(events.length).toEqual(2)
      events.forEach(event => {
        expect(event.status).toEqual(200)
        expect(getReason(event)).toBeUndefined()
      })
    })
  })

  describe('page unload', () => {
    /* Unload reporting is enabled along with ajax.timeout; this one is long enough not to fire during these tests. */
    const init = { ajax: { timeout: 60 } }

    /* What the agent reports, per browser, for a fetch and an XHR still in flight when the page goes away. This is the one place that behavior is
     * documented. Each request is always reported exactly once with status 0, and sent even when the EOL final harvest already ran; only the reason
     * depends on how the browser handles it:
     * - 'pageUnloaded': the request was still pending at pagehide, so the agent reported it as unloaded.
     * - 'aborted' or undefined: the browser cancelled the request before pagehide, and the agent reports that cancellation as the instrument saw it:
     *   an XHR 'abort' event gives 'aborted'; a fetch rejected with a network error (not an AbortError), or an XHR 'error' event, gives no reason.
     * Scenarios: 'navigate' is navigating away in the same tab; 'closeBackgroundedTab' is closing a tab after tabbing away from it, which the iOS
     * and Android webdrivers cannot do (see supportsOpeningTabs).
     *
     * | Browser (as tested)        | navigate: fetch | navigate: xhr | closeBackgroundedTab: fetch | closeBackgroundedTab: xhr |
     * | -------------------------- | --------------- | ------------- | --------------------------- | ------------------------- |
     * | Chrome 145, 155            | pageUnloaded    | pageUnloaded  | (none)                      | aborted                   |
     * | Edge 146, 156              | pageUnloaded    | pageUnloaded  | (none)                      | aborted                   |
     * | Chrome on Android          | pageUnloaded    | pageUnloaded  | n/a                         | n/a                       |
     * | Firefox 158                | (none)          | pageUnloaded  | pageUnloaded                | pageUnloaded              |
     * | Firefox 148                | (none)          | aborted       | pageUnloaded                | pageUnloaded              |
     * | Safari 18.5, 26.4          | (none)          | (none)        | (none)                      | (none)                    |
     * | Safari on iOS              | (none)          | (none)        | n/a                         | n/a                       |
     *
     * Firefox's XHR on navigate changed somewhere between 148 and 158 (only those two were tested), so either outcome is accepted for it: browser
     * matchers only see the requested version (e.g. 'latest'), not the one actually run, and the exact version is unknown anyway. An array means
     * any one of those reasons. Entries are matched in order, so iOS comes before onlySafari (which includes it). */
    const UNLOAD_OUTCOMES = [
      { matcher: onlyChrome, navigate: { fetch: 'pageUnloaded', xhr: 'pageUnloaded' }, closeBackgroundedTab: { fetch: undefined, xhr: 'aborted' } },
      { matcher: onlyEdge, navigate: { fetch: 'pageUnloaded', xhr: 'pageUnloaded' }, closeBackgroundedTab: { fetch: undefined, xhr: 'aborted' } },
      { matcher: onlyAndroid, navigate: { fetch: 'pageUnloaded', xhr: 'pageUnloaded' } },
      { matcher: onlyFirefox, navigate: { fetch: undefined, xhr: ['pageUnloaded', 'aborted'] }, closeBackgroundedTab: { fetch: 'pageUnloaded', xhr: 'pageUnloaded' } },
      { matcher: onlyIOS, navigate: { fetch: undefined, xhr: undefined } },
      { matcher: onlySafari, navigate: { fetch: undefined, xhr: undefined }, closeBackgroundedTab: { fetch: undefined, xhr: undefined } }
    ]

    /**
     * Asserts the fetch and XHR sent by sendHangingRequests were each reported once with status 0 and this browser's expected reason.
     * @param {Object[]} events - The harvested AjaxRequest events for the requests
     * @param {'navigate'|'closeBackgroundedTab'} scenario - How the page went away, see UNLOAD_OUTCOMES
     */
    function expectUnloadOutcome (events, scenario) {
      const expected = UNLOAD_OUTCOMES.find(({ matcher }) => browserMatch(matcher))[scenario]
      expect(events.length).toEqual(2)
      ;[['fetch', 'fetch'], ['xhr', 'XMLHttpRequest']].forEach(([type, requestedWith]) => {
        const typeEvents = events.filter(event => event.requestedWith === requestedWith)
        expect(typeEvents.length).toEqual(1)
        expect(typeEvents[0].status).toEqual(0)
        if (Array.isArray(expected[type])) expect(expected[type]).toContain(getReason(typeEvents[0]))
        else expect(getReason(typeEvents[0])).toEqual(expected[type])
        expect(typeEvents[0].end - typeEvents[0].start).toBeGreaterThanOrEqual(500)
      })
    }

    ;['full', 'spa'].forEach(loader => {
      it(`reports requests still in flight when navigating away once with status 0 (${loader} loader)`, async () => {
        await browser.url(await browser.testHandle.assetURL('instrumented.html', { loader, init }))
          .then(() => browser.waitForAgentLoad())

        const [ajaxEventsHarvests] = await Promise.all([
          ajaxEventsCapture.waitForResult({ timeout: 10000 }),
          sendHangingRequests(30000)
            .then(() => browser.pause(500))
            .then(async () => browser.url(await browser.testHandle.assetURL('/')))
        ])

        expectUnloadOutcome(getEventsForPath(ajaxEventsHarvests, '/delayed'), 'navigate')
      })
    })

    it.withBrowsersMatching(supportsOpeningTabs)('reports requests still in flight when a tab is closed after being backgrounded (and final-harvested) once with status 0', async () => {
      /* WebDriver can only close the tab it is focused on, and focusing a tab brings it to the front. So the page under test is opened by
       * another page, which can then close it with window.close() while it stays in the background, as when a user closes a tab they tabbed away from. */
      const openerHandle = await browser.getWindowHandle()
      await browser.url(await browser.testHandle.assetURL('_blank.html'))
      const testPageUrl = await browser.testHandle.assetURL('instrumented.html', { init })
      await browser.execute(function (url) {
        var button = document.createElement('button')
        button.id = 'open-test-page'
        button.onclick = function () { window.testPage = window.open(url) }
        document.body.appendChild(button)
      }, testPageUrl)
      await $('#open-test-page').click() // a real click, so the popup blocker allows window.open
      await browser.waitUntil(async () => (await browser.getWindowHandles()).length === 2, { timeoutMsg: 'test page tab never opened' })
      const testPageHandle = (await browser.getWindowHandles()).find(handle => handle !== openerHandle)
      await browser.switchToWindow(testPageHandle)
      await browser.waitForAgentLoad()

      const [ajaxEventsHarvests] = await Promise.all([
        ajaxEventsCapture.waitForResult({ timeout: 10000 }),
        sendHangingRequests(30000)
          .then(() => browser.switchToWindow(openerHandle)) // tabs away, which hides the test page and runs its EOL final harvest
          .then(() => browser.pause(500))
          .then(() => browser.execute(function () { window.testPage.close() }))
      ])

      expectUnloadOutcome(getEventsForPath(ajaxEventsHarvests, '/delayed'), 'closeBackgroundedTab')
    })

    it('does not report pending requests as pageUnloaded when ajax.timeout is disabled (default)', async () => {
      await browser.url(await browser.testHandle.assetURL('instrumented.html'))
        .then(() => browser.waitForAgentLoad())

      const [ajaxEventsHarvests] = await Promise.all([
        ajaxEventsCapture.waitForResult({ timeout: 10000 }),
        sendHangingRequests(30000)
          .then(() => browser.pause(500))
          .then(async () => browser.url(await browser.testHandle.assetURL('/')))
      ])

      /* The browser cancelling the requests as it unloads may still be reported; it just isn't attributed to the unload. */
      const events = getEventsForPath(ajaxEventsHarvests, '/delayed')
      expect(events.some(event => getReason(event) === 'pageUnloaded')).toEqual(false)
    })

    it.withBrowsersMatching(supportsOpeningTabs)('does not report pending requests when the page is only hidden by tabbing away', async () => {
      await browser.url(await browser.testHandle.assetURL('instrumented.html', { init }))
        .then(() => browser.waitForAgentLoad())
      const testPageHandle = await browser.getWindowHandle()

      const [ajaxEventsHarvests] = await Promise.all([
        ajaxEventsCapture.waitForResult({ timeout: 12000 }),
        sendHangingRequests(3000)
          .then(() => browser.createWindow('tab'))
          .then(newTab => browser.switchToWindow(newTab.handle))
          .then(() => browser.pause(1000))
          .then(() => browser.closeWindow())
          .then(() => browser.switchToWindow(testPageHandle))
      ])

      const events = getEventsForPath(ajaxEventsHarvests, '/delayed')
      expect(events.length).toEqual(2)
      events.forEach(event => {
        expect(event.status).toEqual(200)
        expect(getReason(event)).toBeUndefined()
      })
    })
  })

  describe('aborts and native timeouts', () => {
    beforeEach(async () => {
      await browser.url(await browser.testHandle.assetURL('instrumented.html'))
        .then(() => browser.waitForAgentLoad())
    })

    ;[
      ['a fetch aborted by its controller', 'aborted', function () {
        var controller = new AbortController()
        fetch('/delayed?delay=5000', { signal: controller.signal }).catch(function () {})
        setTimeout(function () { controller.abort() }, 50)
      }],
      ['a fetch aborted with a custom reason', 'aborted', function () {
        var controller = new AbortController()
        fetch('/delayed?delay=5000', { signal: controller.signal }).catch(function () {})
        setTimeout(function () { controller.abort('user cancelled') }, 50)
      }],
      ['a fetch using a Request object whose signal is aborted', 'aborted', function () {
        var controller = new AbortController()
        fetch(new Request('/delayed?delay=5000', { signal: controller.signal })).catch(function () {})
        setTimeout(function () { controller.abort() }, 50)
      }],
      ['a fetch using AbortSignal.timeout()', 'timedOut', function () {
        fetch('/delayed?delay=5000', { signal: AbortSignal.timeout(50) }).catch(function () {})
      }],
      ['an aborted XHR', 'aborted', function () {
        var xhr = new XMLHttpRequest()
        xhr.open('GET', '/delayed?delay=5000')
        xhr.send()
        setTimeout(function () { xhr.abort() }, 50)
      }],
      ['an XHR hitting its own timeout', 'timedOut', function () {
        var xhr = new XMLHttpRequest()
        xhr.open('GET', '/delayed?delay=5000')
        xhr.timeout = 50
        xhr.send()
      }]
    ].forEach(([title, expectedReason, sendRequest]) => {
      it(`reports ${title} once with status 0 and reason "${expectedReason}"`, async () => {
        const [ajaxEventsHarvests] = await Promise.all([
          ajaxEventsCapture.waitForResult({ timeout: 10000 }),
          browser.execute(sendRequest)
        ])

        const events = getEventsForPath(ajaxEventsHarvests, '/delayed')
        expect(events.length).toEqual(1)
        expect(events[0].status).toEqual(0)
        expect(getReason(events[0])).toEqual(expectedReason)
      })
    })
  })
})
