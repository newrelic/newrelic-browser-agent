import { supportsCumulativeLayoutShift, supportsFirstInputDelay, supportsFirstPaint, supportsInteractionToNextPaint, supportsLargestContentfulPaint } from '../../../tools/browser-matcher/common-matchers.mjs'
import { testTimingEventsRequest } from '../../../tools/testing-server/utils/expect-tests'

const isClickInteractionType = type => type === 'pointerdown' || type === 'mousedown' || type === 'click'
const loadersToTest = ['rum', 'spa']
const init = { page_view_timing: { harvestTimeSeconds: 3 } }

describe('pvt timings tests', () => {
  let timingsCapture

  beforeEach(async () => {
    timingsCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testTimingEventsRequest })
  })

  describe('page viz related timings', () => {
    loadersToTest.forEach(loader => {
      it(`Load, Unload, FP, FCP & pageHide for ${loader} agent`, async () => {
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
        expect(load?.value).toBeBetween(0, duration)

        const unload = timingsHarvests.find(harvest => harvest.request.body.find(t => t.name === 'unload'))
          ?.request.body.find(timing => timing.name === 'unload')
        expect(unload?.value).toBeBetween(0, duration)

        const pageHide = timingsHarvests.find(harvest => harvest.request.body.find(t => t.name === 'pageHide'))
          ?.request.body.find(timing => timing.name === 'pageHide')
        expect(pageHide?.value).toBeBetween(0, duration)

        if (browserMatch(supportsCumulativeLayoutShift)) {
          const emptyCls = pageHide.attributes.find(a => a.key === 'cls')
          expect(emptyCls.value).toEqual(0)
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
      it(`FI, FID, INP & LCP for ${loader} agent`, async () => {
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

        if (browserMatch(supportsFirstInputDelay)) {
          const fi = timingsHarvests.find(harvest => harvest.request.body.find(t => t.name === 'fi'))
            ?.request.body.find(timing => timing.name === 'fi')
          expect(fi.value).toBeGreaterThanOrEqual(0)
          expect(fi.value).toBeLessThan(Date.now() - start)

          const fiType = fi.attributes.find(attr => attr.key === 'type')
          expect(isClickInteractionType(fiType.value)).toEqual(true)
          expect(fiType.type).toEqual('stringAttribute')

          const fid = fi.attributes.find(attr => attr.key === 'fid')
          expect(fid.value).toBeGreaterThanOrEqual(0)
          expect(fid.type).toEqual('doubleAttribute')
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
  })

  describe('layout shift related timings', () => {
    loadersToTest.forEach(loader => {
      [['unload', 'cls-basic.html'], ['pageHide', 'cls-pagehide.html']].forEach(([prop, testAsset]) => {
        it.withBrowsersMatching([supportsCumulativeLayoutShift])(`${prop} for ${loader} agent collects cls attribute`, async () => {
          await browser.url(
            await browser.testHandle.assetURL(testAsset, { loader, init })
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
        })
      })
    })
  })

  describe('custom attribution timings', () => {
    loadersToTest.forEach(loader => {
      it(`window load timing for ${loader} agent includes custom attributes`, async () => {
        let url = await browser.testHandle.assetURL('load-timing-attributes.html', { loader, init })
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
