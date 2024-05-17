import { supportsCumulativeLayoutShift, supportsFirstInputDelay, supportsFirstPaint, supportsInteractionToNextPaint, supportsLargestContentfulPaint, supportsLongTaskTiming } from '../../../tools/browser-matcher/common-matchers.mjs'

const isClickInteractionType = type => type === 'pointerdown' || type === 'mousedown' || type === 'click'

const loadersToTest = ['rum', 'spa']
describe('pvt timings tests', () => {
  describe('page viz related timings', () => {
    loadersToTest.forEach(loader => {
      it.withBrowsersMatching([supportsFirstPaint])(`Load, Unload, FP, FCP & pageHide for ${loader} agent`, async () => {
        let url = await browser.testHandle.assetURL('instrumented.html', { loader }) // this should use SPA which is full agent
        const start = Date.now()
        const [{ request: { body } }] = await Promise.all([
          browser.testHandle.expectTimings(),
          browser.url(url)
            .then(() => browser.waitForAgentLoad())
            .then(() => browser.pause(1000))
            .then(async () => browser.url(await browser.testHandle.assetURL('/')))
        ])
        const duration = Date.now() - start
        const fp = body.find(t => t.name === 'fp')
        const fcp = body.find(t => t.name === 'fcp')
        expect(fp.value).toBeGreaterThan(0)
        expect(fcp.value).toBeGreaterThan(0)

        const load = body.find(t => t.name === 'load')
        expect(load?.value).toBeBetween(0, duration)

        const unload = body.find(t => t.name === 'unload')
        expect(unload?.value).toBeBetween(0, duration)

        const pageHide = body.find(t => t.name === 'pageHide')
        expect(pageHide?.value).toBeBetween(0, duration)

        const emptyCls = pageHide.attributes.find(a => a.key === 'cls')
        expect(emptyCls.value).toEqual(0)
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
      it.withBrowsersMatching([supportsFirstInputDelay, supportsLargestContentfulPaint])(`FI, FID, INP & LCP for ${loader} agent`, async () => {
        let url = await browser.testHandle.assetURL('basic-click-tracking.html', { loader }) // this should use SPA which is full agent

        const start = Date.now()

        const [{ request: { body } }] = await Promise.all([
          browser.testHandle.expectTimings(),
          browser.url(url)
            .then(() => browser.waitForAgentLoad()
              .then(() => $('#free_tacos').click())
              .then(async () => browser.url(await browser.testHandle.assetURL('/')))
            )
        ])

        const fi = body.find(t => t.name === 'fi')
        expect(fi.value).toBeGreaterThan(0)
        expect(fi.value).toBeLessThan(Date.now() - start)

        const fiType = fi.attributes.find(attr => attr.key === 'type')
        expect(isClickInteractionType(fiType.value)).toEqual(true)
        expect(fiType.type).toEqual('stringAttribute')

        const fid = fi.attributes.find(attr => attr.key === 'fid')
        expect(fid.value).toBeGreaterThan(0)
        expect(fid.type).toEqual('doubleAttribute')

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
          let url = await browser.testHandle.assetURL(testAsset, { loader }) // this should use SPA which is full agent
          const [{ request: { body } }] = await Promise.all([
            browser.testHandle.expectTimings(),
            browser.url(url)
              .then(() => browser.waitForAgentLoad())
              .then(() => {
                if (prop === 'pageHide') return $('#btn1').click()
              })
              .then(() => browser.waitUntil(
                () => browser.execute(function () {
                  return window.contentAdded === true
                }),
                {
                  timeout: 30000,
                  timeoutMsg: 'contentAdded was never set'
                }))
              .then(async () => browser.url(await browser.testHandle.assetURL('/')))
          ])

          const unload = body.find(t => t.name === prop)
          const cls = unload.attributes.find(a => a.key === 'cls')
          expect(cls?.value).toBeGreaterThan(0)
          expect(cls?.type).toEqual('doubleAttribute')
        })
      })
    })
  })

  describe('custom attribution timings', () => {
    loadersToTest.forEach(loader => {
      it.withBrowsersMatching([supportsFirstPaint])(`window load timing for ${loader} agent includes custom attributes`, async () => {
        let url = await browser.testHandle.assetURL('load-timing-attributes.html', { loader }) // this should use SPA which is full agent
        const reservedTimingAttributes = ['size', 'eid', 'cls', 'type', 'fid', 'elUrl', 'elTag',
          'net-type', 'net-etype', 'net-rtt', 'net-dlink']
        const [{ request: { body } }] = await Promise.all([
          browser.testHandle.expectTimings(),
          browser.url(url)
            .then(() => browser.waitForAgentLoad())
            .then(() => browser.pause(1000))
            .then(async () => browser.url(await browser.testHandle.assetURL('/')))
        ])
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
        let url = await browser.testHandle.assetURL('long-tasks.html', { loader, init: { page_view_timing: { long_task: true } } }) // this should use SPA which is full agent
        const [{ request: { body } }] = await Promise.all([
          browser.testHandle.expectTimings(),
          browser.url(url)
            .then(() => browser.waitUntil(
              () => browser.execute(function () {
                return window.tasksDone === true
              }),
              {
                timeout: 30000,
                timeoutMsg: 'tasksDone was never set'
              }))
            .then(async () => browser.url(await browser.testHandle.assetURL('/')))
        ])
        const ltEvents = body.filter(t => t.name === 'lt')
        expect(ltEvents.length).toEqual(2)

        ltEvents.forEach(lt => {
          // Attributes array should start with: [ltFrame, ltStart, ltCtr, (ltCtrSrc, ltCtrId, ltCtrName, )...]
          expect(lt.value).toBeGreaterThanOrEqual(59)
          expect(lt.attributes.length).toBeGreaterThanOrEqual(3)
          expect(lt.attributes[1].type).toEqual('doubleAttribute') // entry.startTime
          if (lt.attributes[2].value !== 'window') expect(lt.attributes.length).toBeGreaterThanOrEqual(6)
        })
      })
    })
  })
})
