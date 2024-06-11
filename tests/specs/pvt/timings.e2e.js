import { supportsCumulativeLayoutShift, supportsFirstContentfulPaint, supportsFirstInputDelay, supportsFirstPaint, supportsInteractionToNextPaint, supportsLargestContentfulPaint, supportsLongTaskTiming } from '../../../tools/browser-matcher/common-matchers.mjs'
import { browserClick, mergeBatchedRequestBodies } from '../util/helpers'

const isClickInteractionType = type => type === 'pointerdown' || type === 'mousedown' || type === 'click'

const loadersToTest = ['rum', 'spa']
describe('pvt timings tests', () => {
  const init = { page_view_timing: { harvestTimeSeconds: 3 } }

  describe('page viz related timings', () => {
    loadersToTest.forEach(loader => {
      it(`Load, Unload, FP, FCP & pageHide for ${loader} agent`, async () => {
        let url = await browser.testHandle.assetURL('instrumented.html', { loader })
        const start = Date.now()
        const expects = browser.testHandle.expectTimings(15000, false, 10000)
        await browser.url(url).then(() => browser.waitForAgentLoad())

        await browser.url(await browser.testHandle.assetURL('/'))

        const body = mergeBatchedRequestBodies(await expects)
        const duration = Date.now() - start

        if (browserMatch(supportsFirstPaint)) {
          const fp = body.find(t => t.name === 'fp')
          expect(fp.value).toBeGreaterThan(0)
        }

        if (browserMatch(supportsFirstContentfulPaint)) {
          const fcp = body.find(t => t.name === 'fcp')
          expect(fcp.value).toBeGreaterThan(0)
        }

        const load = body.find(t => t.name === 'load')
        expect(load?.value).toBeBetween(0, duration)

        const unload = body.find(t => t.name === 'unload')
        expect(unload?.value).toBeBetween(0, duration)

        const pageHide = body.find(t => t.name === 'pageHide')
        expect(pageHide?.value).toBeBetween(0, duration)

        if (browserMatch(supportsCumulativeLayoutShift)) {
          const emptyCls = pageHide.attributes.find(a => a.key === 'cls')
          expect(emptyCls.value).toEqual(0)
        }
      })

      it.withBrowsersMatching([supportsLargestContentfulPaint])(`LCP is not collected on hidden pages for ${loader} agent`, async () => {
        let url = await browser.testHandle.assetURL('pagehide-beforeload.html', { loader }) // this should use SPA which is full agent
        const [{ request: { body } }] = await Promise.all([
          browser.testHandle.expectTimings(),
          browser.url(url)
            .then(() => browser.waitForAgentLoad())
        ])
        const lcp = body.find(t => t.name === 'lcp')
        expect(lcp).toBeUndefined()
      })
    })
  })

  describe('interaction related timings', () => {
    loadersToTest.forEach(loader => {
      it(`FI, FID, INP & LCP for ${loader} agent`, async () => {
        let url = await browser.testHandle.assetURL('basic-click-tracking.html', { loader })

        const start = Date.now()
        const expects = browser.testHandle.expectTimings(15000, false, 10000)
        await browser.url(url).then(() => browser.waitForAgentLoad())

        await browserClick('#free_tacos')
          .then(() => browser.pause(1000))
          .then(async () => browser.url(await browser.testHandle.assetURL('/')))

        const body = mergeBatchedRequestBodies(await expects)

        if (browserMatch(supportsFirstInputDelay)) {
          const fi = body.find(t => t.name === 'fi')
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
          const lcp = body.find(t => t.name === 'lcp')
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
          const inp = body.find(t => t.name === 'inp')
          expect(inp?.value).toBeBetween(0, Date.now() - start)
        }
      })
    })
  })

  describe('layout shift related timings', () => {
    loadersToTest.forEach(loader => {
      ;[['unload', 'cls-basic.html'], ['pageHide', 'cls-pagehide.html']].forEach(([prop, testAsset]) => {
        it.withBrowsersMatching([supportsCumulativeLayoutShift])(`${prop} for ${loader} agent collects cls attribute`, async () => {
          let url = await browser.testHandle.assetURL(testAsset, { loader, init })
          const expects = browser.testHandle.expectTimings(15000, false, 10000)
          await browser.url(url).then(() => browser.waitForAgentLoad())
          if (prop === 'pageHide') await browserClick('#btn1')

          await Promise.all([
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

          const body = mergeBatchedRequestBodies(await expects)

          const evt = body.find(t => t.name === prop)
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
        await browser.url(url).then(() => browser.waitForAgentLoad())

        const { request: { body } } = await browser.testHandle.expectTimings(10000)
        const load = body.find(t => t.name === 'load')
        const containsReservedAttributes = load?.attributes.some(a => reservedTimingAttributes.includes(a.key) && a.value === 'invalid')
        expect(containsReservedAttributes).not.toEqual(true)

        const expectedAttribute = load.attributes.find(a => a.key === 'test')
        expect(expectedAttribute?.value).toEqual('testValue')
      })
    })
  })

  describe('long task related timings', () => {
    loadersToTest.forEach(loader => {
      it.withBrowsersMatching([supportsLongTaskTiming])(`emits long task timings when observed for ${loader} agent`, async () => {
        let url = await browser.testHandle.assetURL('long-tasks.html', { loader, init: { page_view_timing: { long_task: true, harvestTimeSeconds: 3 } } })
        await browser.url(url)

        const [{ request: { body } }] = await Promise.all([
          browser.testHandle.expectTimings(10000),
          browser.waitUntil(() => browser.execute(function () {
            return window.tasksDone === true
          }),
          {
            timeout: 10000,
            timeoutMsg: 'tasksDone was never set'
          }
          )
        ])
        const ltEvents = body.filter(t => t.name === 'lt')
        expect(ltEvents.length).toBeGreaterThanOrEqual(2)

        ltEvents.forEach(lt => {
          // Attributes array should start with: [ltFrame, ltStart, ltCtr, (ltCtrSrc, ltCtrId, ltCtrName, )...]
          expect(lt.value).toBeGreaterThanOrEqual(50)
          expect(lt.attributes.length).toBeGreaterThanOrEqual(3)
          expect(lt.attributes[1].type).toEqual('doubleAttribute') // entry.startTime
          if (lt.attributes[2].value !== 'window') expect(lt.attributes.length).toBeGreaterThanOrEqual(6)
        })
      })
    })
  })
})
