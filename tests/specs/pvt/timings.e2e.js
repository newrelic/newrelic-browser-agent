import { supportsCumulativeLayoutShift, supportsFirstPaint, supportsInteractionToNextPaint, supportsLargestContentfulPaint } from '../../../tools/browser-matcher/common-matchers.mjs'
import { testConnectRequest, testTimingEventsRequest } from '../../../tools/testing-server/utils/expect-tests'

const loadersToTest = ['rum', 'spa']

describe('pvt timings tests', () => {
  let timingsCapture

  beforeEach(async () => {
    timingsCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testTimingEventsRequest })
  })

  describe('page viz related timings', () => {
    loadersToTest.forEach(loader => {
      it(`Load, Unload, FP, FCP, CLS & pageHide for ${loader} agent`, async () => {
        const start = Date.now()
        await browser.url(
          await browser.testHandle.assetURL('instrumented.html', { loader })
        ).then(() => browser.waitForAgentLoad())

        let duration
        const [timingsHarvests] = await Promise.all([
          timingsCapture.waitForResult({ timeout: 10000 }),
          browser.url(await browser.testHandle.assetURL('/'))
            .then(() => { duration = Date.now() - start })
        ])

        if (browserMatch(supportsFirstPaint)) {
          const fp = timingsHarvests.find(harvest => harvest.request.body.find(t => t.name === 'fp'))
            ?.request.body.find(timing => timing.name === 'fp')
          expect(fp.value).toBeGreaterThan(0)
        }

        const fcp = timingsHarvests.find(harvest => harvest.request.body.find(t => t.name === 'fcp'))
          ?.request.body.find(timing => timing.name === 'fcp')
        expect(fcp.value).toBeGreaterThan(0)

        const load = timingsHarvests.find(harvest => harvest.request.body.find(t => t.name === 'load'))
          ?.request.body.find(timing => timing.name === 'load')
        expect(load?.value).toBeGreaterThan(0)
        expect(load?.value).toBeLessThanOrEqual(duration)

        const unload = timingsHarvests.find(harvest => harvest.request.body.find(t => t.name === 'unload'))
          ?.request.body.find(timing => timing.name === 'unload')
        expect(unload?.value).toBeGreaterThan(0)
        expect(unload?.value).toBeLessThanOrEqual(duration)

        const pageHide = timingsHarvests.find(harvest => harvest.request.body.find(t => t.name === 'pageHide'))
          ?.request.body.find(timing => timing.name === 'pageHide')
        expect(pageHide?.value).toBeGreaterThan(0)
        expect(pageHide?.value).toBeLessThanOrEqual(duration)

        if (browserMatch(supportsCumulativeLayoutShift)) {
          const emptyCls = pageHide.attributes.find(a => a.key === 'cls')
          expect(emptyCls.value).toEqual(0)

          // There should also be a standalone CLS node sent on EoL
          expect(timingsHarvests.find(harvest => harvest.request.body.find(t => t.name === 'cls'))).toBeTruthy()
        }
      })

      it.withBrowsersMatching([supportsLargestContentfulPaint])(`LCP is not collected on hidden pages for ${loader} agent`, async () => {
        let url = await browser.testHandle.assetURL('pagehide-beforeload.html', { loader }) // this should use SPA which is full agent
        const [timingsHarvests] = await Promise.all([
          timingsCapture.waitForResult({ totalCount: 1 }),
          browser.url(url)
            .then(() => browser.waitForAgentLoad())
        ])
        const lcp = timingsHarvests[0].request.body.find(t => t.name === 'lcp')
        expect(lcp).toBeUndefined()
      })
    })
  })

  describe('interaction related timings', () => {
    loadersToTest.forEach(loader => {
      it(`FI, INP & LCP for ${loader} agent`, async () => {
        const start = Date.now()
        await browser.url(
          await browser.testHandle.assetURL('basic-click-tracking.html', { loader })
        ).then(() => browser.waitForAgentLoad())

        const [timingsHarvests] = await Promise.all([
          timingsCapture.waitForResult({ timeout: 10000 }),
          $('#free_tacos').click()
            .then(() => browser.pause(1000))
            .then(async () => browser.url(await browser.testHandle.assetURL('/')))
        ])

        // FID is replaced by detecting first INP event
        if (browserMatch(supportsInteractionToNextPaint)) {
          const fi = timingsHarvests.find(harvest => harvest.request.body.find(t => t.name === 'fi'))
            ?.request.body.find(timing => timing.name === 'fi')
          expect(fi.value).toBeGreaterThanOrEqual(0)
          expect(fi.value).toBeLessThan(Date.now() - start)

          const isClickInteractionType = type => type === 'mousedown' || type === 'pointerdown'
          const fiType = fi.attributes.find(attr => attr.key === 'type')
          expect(isClickInteractionType(fiType.value)).toEqual(true)
          expect(fiType.type).toEqual('stringAttribute')
        }

        if (browserMatch(supportsLargestContentfulPaint)) {
          const lcp = timingsHarvests.find(harvest => harvest.request.body.find(t => t.name === 'lcp'))
            ?.request.body.find(timing => timing.name === 'lcp')
          expect(lcp && lcp.value > 0).toEqual(true)

          const eid = lcp.attributes.find(attr => attr.key === 'eid')
          expect(eid.value).toEqual('free_tacos')
          expect(eid.type).toEqual('stringAttribute')

          const size = lcp.attributes.find(attr => attr.key === 'size')
          expect(size.value).toBeGreaterThan(0)
          expect(size.type).toEqual('doubleAttribute')

          const tagName = lcp.attributes.find(attr => attr.key === 'elTag')
          expect(tagName.value).toEqual('BUTTON')
          expect(tagName.type).toEqual('stringAttribute')
        }

        if (browserMatch(supportsInteractionToNextPaint)) {
          const inp = timingsHarvests.find(harvest => harvest.request.body.find(t => t.name === 'inp'))
            ?.request.body.find(timing => timing.name === 'inp')
          expect(inp?.value).toBeBetween(0, Date.now() - start)
        }
      })
    })

    it.withBrowsersMatching(supportsLargestContentfulPaint)('LCP on a page with a preload navigation supplies the correct pageUrl', async () => {
      await browser.url(
        await browser.testHandle.assetURL('cls-lcp-quicknav.html')
      ).then(() => browser.waitForAgentLoad())

      await browser.pause(1000) // wait for the async shenanigans on that test page to wrap up

      const [timingsResult] = await Promise.all([
        timingsCapture.waitForResult({ timeout: 15000 }),
        $('body').click()
      ])

      /** Find the LCP node which could be reported once but be unpredictably reported among potentially many timings harvests */
      const lcpNode = timingsResult
        .map(harvest => harvest.request.body.find(timing => timing.name === 'lcp'))
        .find(timing => !!timing)
      expect(lcpNode).toBeDefined()
      /** Find the page URL attribute in the LCP node and return its value */
      const lcpPageUrl = lcpNode.attributes.find(attr => attr.key === 'pageUrl').value
      /** expect that the pageUrl attribute reflects the original page url and NOT the quick soft nav page url */
      expect(lcpPageUrl).toContain('cls-lcp-quicknav.html')
    })
  })

  describe('layout shift related timings', () => {
    loadersToTest.forEach(loader => {
      [['unload', 'cls-basic.html'], ['pageHide', 'cls-pagehide.html']].forEach(([prop, testAsset]) => {
        it.withBrowsersMatching([supportsCumulativeLayoutShift])(`${prop} for ${loader} agent collects cls attribute & node`, async () => {
          await browser.url(
            await browser.testHandle.assetURL(testAsset, { loader })
          ).then(() => browser.waitForAgentLoad())
          if (prop === 'pageHide') await $('#btn1').click()

          const [timingsHarvests] = await Promise.all([
            timingsCapture.waitForResult({ timeout: 10000 }),
            browser.waitUntil(
              () => browser.execute(function () {
                return window.contentAdded === true
              }),
              {
                timeout: 10000,
                timeoutMsg: 'contentAdded was never set'
              }
            ).then(async () => browser.url(await browser.testHandle.assetURL('/')))
          ])

          const evt = timingsHarvests.find(harvest => harvest.request.body.find(t => t.name === prop))
            ?.request.body.find(timing => timing.name === prop)
          const cls = evt.attributes.find(a => a.key === 'cls')
          expect(cls?.value).toBeGreaterThan(0)
          expect(cls?.type).toEqual('doubleAttribute')
          expect(timingsHarvests.find(harvest => harvest.request.body.find(t => t.name === 'cls'))).toBeTruthy()
        })
      })
    })

    ;[
      ['v1', {}],
      ['rum_v2', { feature_flags: ['rum_v2'] }]
    ].forEach(([label, init]) => {
      /**
       * Regression coverage for an INP/CLS-loss bug: Harvester's EOL harvest is triggered from a 'visibilitychange'
       * listener, which races against any OTHER 'visibilitychange' listener registered by a feature's own aggregate
       * -- namely web-vitals' onINP, which (unlike onCLS) only ever reports its final value from within its own
       * 'visibilitychange' listener. If Harvester's listener ran first and snapshotted the buffer before onINP
       * added its data, INP was lost for good on that unload. The fix required both: (1) deferring Harvester's
       * actual harvest work to a microtask so it always runs after the whole synchronous 'visibilitychange'
       * dispatch settles (see Harvester#startTimer), and (2) `capture: true` on this file's own CLS-flush listener
       * (see the subscribeToVisibilityChange call above) -- confirmed only via real-browser testing, since jsdom's
       * simplified event dispatch doesn't reproduce whatever made that flag necessary. Neither fix is gated behind
       * rum_v2 -- both apply unconditionally -- so this runs under v1 too, to prove the fix (which predates rum_v2)
       * wasn't accidentally scoped to only the v2 path. rum_v2 additionally routes bootstrap through a Connector
       * that does its own async connect/2 round trip before aggregates finish loading -- the v2 case here proves
       * that extra async work doesn't reopen the ordering race.
       */
      it.withBrowsersMatching([supportsCumulativeLayoutShift, supportsInteractionToNextPaint])(
        `sends pageHide, CLS & INP together in a single EoL harvest (${label})`,
        async () => {
          const connectCapture = init.feature_flags?.includes('rum_v2')
            ? await browser.testHandle.createNetworkCaptures('bamServer', { test: testConnectRequest })
            : undefined

          await browser.url(await browser.testHandle.assetURL('cls-pagehide.html', { loader: 'spa', init }))
            .then(() => browser.waitForAgentLoad())

          // Under rum_v2, Connector's connect/2 round trip must complete (and features must activate) before any
          // of this can happen.
          if (connectCapture) await connectCapture.waitForResult({ totalCount: 1 })

          const [timingsHarvests] = await Promise.all([
            timingsCapture.waitForResult({ timeout: 10000 }),
            $('#btn1').click().then(() => browser.waitUntil(
              () => browser.execute(function () { return window.contentAdded === true }),
              { timeout: 10000, timeoutMsg: 'contentAdded was never set' }
            ))
          ])

          // pageHide only ever fires once, on the EoL 'visibilitychange' dispatch that cls-pagehide.html triggers
          // itself -- so the harvest containing it IS the EoL harvest. An unrelated periodic tick could still land
          // its own harvest in the same wait window (e.g. under load), which is fine; what regressed before was CLS/
          // INP landing in a SEPARATE harvest from pageHide instead of this same one, so that's the actual check --
          // not merely counting harvests (which an unrelated tick would make an unreliable proxy) or flattening
          // across all of them (which would hide exactly this failure mode).
          const eolHarvest = timingsHarvests.find(harvest => harvest.request.body.some(e => e.name === 'pageHide'))
          expect(eolHarvest).toBeTruthy()
          const names = eolHarvest.request.body.map(e => e.name)

          expect(names).toEqual(expect.arrayContaining(['pageHide', 'cls', 'inp']))

          const pageHide = eolHarvest.request.body.find(e => e.name === 'pageHide')
          const cls = pageHide.attributes.find(a => a.key === 'cls')
          expect(cls.value).toBeGreaterThan(0)
        }
      )
    })
  })

  describe('custom attribution timings', () => {
    loadersToTest.forEach(loader => {
      it(`window load timing for ${loader} agent includes custom attributes`, async () => {
        let url = await browser.testHandle.assetURL('load-timing-attributes.html', { loader })
        const reservedTimingAttributes = ['size', 'eid', 'cls', 'type', 'fid', 'elUrl', 'elTag',
          'net-type', 'net-etype', 'net-rtt', 'net-dlink']

        const [timingsHarvests] = await Promise.all([
          timingsCapture.waitForResult({ timeout: 10000 }),
          browser.url(url).then(() => browser.waitForAgentLoad())
        ])

        const load = timingsHarvests.find(harvest => harvest.request.body.find(t => t.name === 'load'))
          ?.request.body.find(timing => timing.name === 'load')
        const containsReservedAttributes = load?.attributes.some(a => reservedTimingAttributes.includes(a.key) && a.value === 'invalid')
        expect(containsReservedAttributes).not.toEqual(true)

        const expectedAttribute = load.attributes.find(a => a.key === 'test')
        expect(expectedAttribute?.value).toEqual('testValue')
      })
    })
  })
})
