import { supportsCumulativeLayoutShift, supportsInteractionToNextPaint, supportsLargestContentfulPaint } from '../../../../tools/browser-matcher/common-matchers.mjs'
import {
  testMFETimingEventsRequest
} from '../../../../tools/testing-server/utils/expect-tests'

describe('Register API - Auto-Detection - Page View Timings', () => {
  beforeEach(async () => {
    await browser.enableLogging()
  })

  afterEach(async () => {
    await browser.destroyAgentSession()
  })

  // Helper function to get attribute value from timing event
  function getAttributeValue (timing, key) {
    const attr = timing.attributes?.find(a => a.key === key)
    return attr?.value
  }

  // Helper function to check if timing has MFE attributes
  function hasMFEAttributes (timing) {
    return getAttributeValue(timing, 'source.id') !== undefined
  }

  async function interactWithPage () {
    // Click the button in the main MFE (id: vite-main-mfe)
    const button = await $('#mfe-main-button')
    await button.click().catch(() => {})

    // Click the div created by 2nd-mfe (id: vite-second-mfe)
    const secondMfeDiv = await $('#second-mfe-div')
    await secondMfeDiv.click()

    // Wait for lazy content to load, then click it
    async function clickLazyButton () {
      const lazyButton = await $('#lazy-button')
      if (await lazyButton.isExisting()) {
        await lazyButton.click()
      } else {
        await browser.pause(500)
        await clickLazyButton()
      }
    }
    await clickLazyButton()
    await browser.pause(1000)
    await browser.refresh() // force any pending useractions or bIxn requests to release and harvest
  }

  it('should auto-detect multiple MFEs from different script sources for Page View Timing events', async () => {
    const pvtCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testMFETimingEventsRequest })

    await browser.url(await browser.testHandle.assetURL('test-builds/vite-react-mfe/index.html', {
      init: {
        api: {
          allow_registered_children: true
        },
        logging: {
          enabled: true
        }
      }
    }))

    await browser.waitForAgentLoad()

    // trigger all the events
    await interactWithPage()

    const [pvtHarvests] = await Promise.all([
      pvtCapture.waitForResult({ timeout: 10000 })
    ])

    // Verify Page View Timing events from both MFEs
    const allPageViewTimings = pvtHarvests.flatMap(harvest => (harvest.request.body || []))
    expect(allPageViewTimings.length).toBeGreaterThan(0)

    // LCP should have MFE attributes from main MFE
    if (browserMatch(supportsLargestContentfulPaint)) {
      const lcpTiming = allPageViewTimings.find(t => t.type === 'timing' && t.name === 'lcp' && getAttributeValue(t, 'source.id') === 'vite-main-mfe')
      expect(lcpTiming).toBeDefined()
      expect(getAttributeValue(lcpTiming, 'source.name')).toEqual('Main MFE')
      expect(getAttributeValue(lcpTiming, 'source.type')).toEqual('MFE')
      expect(getAttributeValue(lcpTiming, 'parent.id')).toBeDefined()
      expect(getAttributeValue(lcpTiming, 'parent.type')).toEqual('BA')
    }

    // CLS should have MFE attributes if reported from an MFE
    if (browserMatch(supportsCumulativeLayoutShift)) {
      const clsTiming = allPageViewTimings.find(t => t.type === 'timing' && t.name === 'cls' && hasMFEAttributes(t))
      if (clsTiming) {
        expect(getAttributeValue(clsTiming, 'source.id')).toBeDefined()
        expect(getAttributeValue(clsTiming, 'source.type')).toEqual('MFE')
        expect(getAttributeValue(clsTiming, 'parent.type')).toEqual('BA')
      }
    }

    // INP should have MFE attributes if reported from an MFE
    if (browserMatch(supportsInteractionToNextPaint)) {
      const inpTiming = allPageViewTimings.find(t => t.type === 'timing' && t.name === 'inp' && hasMFEAttributes(t))
      if (inpTiming) {
        expect(getAttributeValue(inpTiming, 'source.id')).toBeDefined()
        expect(getAttributeValue(inpTiming, 'source.type')).toEqual('MFE')
        expect(getAttributeValue(inpTiming, 'parent.type')).toEqual('BA')
      }
    }

    // FCP should NOT have MFE attributes (only container agent attributes)
    const fcpTiming = allPageViewTimings.find(t => t.type === 'timing' && t.name === 'fcp')
    if (fcpTiming) {
      expect(hasMFEAttributes(fcpTiming)).toBe(false)
      expect(getAttributeValue(fcpTiming, 'entity.guid')).toBeDefined()
      expect(getAttributeValue(fcpTiming, 'source.id')).toBeUndefined()
    }

    // FP should NOT have MFE attributes (only container agent attributes)
    const fpTiming = allPageViewTimings.find(t => t.type === 'timing' && t.name === 'fp')
    if (fpTiming) {
      expect(hasMFEAttributes(fpTiming)).toBe(false)
      expect(getAttributeValue(fpTiming, 'entity.guid')).toBeDefined()
      expect(getAttributeValue(fpTiming, 'source.id')).toBeUndefined()
    }

    // FI should NOT have MFE attributes (only container agent attributes)
    const fiTiming = allPageViewTimings.find(t => t.type === 'timing' && t.name === 'fi')
    if (fiTiming) {
      expect(hasMFEAttributes(fiTiming)).toBe(false)
      expect(getAttributeValue(fiTiming, 'entity.guid')).toBeDefined()
      expect(getAttributeValue(fiTiming, 'source.id')).toBeUndefined()
    }
  })

  it('should support duplicate_registered_data with auto-detection for Page View Timing events', async () => {
    const mfePvtCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testMFETimingEventsRequest })

    await browser.url(await browser.testHandle.assetURL('test-builds/vite-react-mfe/index.html', {
      init: {
        api: {
          allow_registered_children: true,
          duplicate_registered_data: true
        }
      },
      loader: 'spa'
    }))

    await browser.waitForAgentLoad()

    // trigger all the events
    await interactWithPage()

    // Verify MFE events exist at /ins/2/ endpoint
    const [mfePvtHarvests] = await Promise.all([
      mfePvtCapture.waitForResult({ timeout: 10000 })
    ])

    // MFE Timing events
    const allMfeTimings = mfePvtHarvests.flatMap(harvest => (harvest.request.body || []))
    expect(allMfeTimings.length).toBeGreaterThan(0)

    // LCP with MFE source attributes should also have duplicated child attributes
    if (browserMatch(supportsLargestContentfulPaint)) {
      const lcpWithSourceAttrs = allMfeTimings.find(t =>
        t.type === 'timing' &&
        t.name === 'lcp' &&
        getAttributeValue(t, 'source.id') === 'vite-main-mfe'
      )
      if (lcpWithSourceAttrs) {
        expect(getAttributeValue(lcpWithSourceAttrs, 'source.name')).toEqual('Main MFE')
        expect(getAttributeValue(lcpWithSourceAttrs, 'source.type')).toEqual('MFE')
        expect(getAttributeValue(lcpWithSourceAttrs, 'parent.id')).toBeDefined()
        expect(getAttributeValue(lcpWithSourceAttrs, 'parent.type')).toEqual('BA')
      }

      // Duplicated LCP should have child attributes instead of source attributes
      const duplicatedLcp = allMfeTimings.find(t =>
        t.type === 'timing' &&
        t.name === 'lcp' &&
        getAttributeValue(t, 'child.id') === 'vite-main-mfe'
      )
      if (duplicatedLcp) {
        expect(getAttributeValue(duplicatedLcp, 'entity.guid')).toBeDefined()
        expect(getAttributeValue(duplicatedLcp, 'child.type')).toEqual('MFE')
        expect(getAttributeValue(duplicatedLcp, 'source.id')).toBeUndefined()
      }
    }

    // CLS with MFE attributes should also be duplicated
    if (browserMatch(supportsCumulativeLayoutShift)) {
      const clsWithSourceAttrs = allMfeTimings.find(t =>
        t.type === 'timing' &&
        t.name === 'cls' &&
        hasMFEAttributes(t) &&
        getAttributeValue(t, 'source.id')
      )
      if (clsWithSourceAttrs) {
        const sourceId = getAttributeValue(clsWithSourceAttrs, 'source.id')
        expect(getAttributeValue(clsWithSourceAttrs, 'source.type')).toEqual('MFE')

        // Find duplicated version
        const duplicatedCls = allMfeTimings.find(t =>
          t.type === 'timing' &&
          t.name === 'cls' &&
          getAttributeValue(t, 'child.id') === sourceId
        )
        if (duplicatedCls) {
          expect(getAttributeValue(duplicatedCls, 'entity.guid')).toBeDefined()
          expect(getAttributeValue(duplicatedCls, 'child.type')).toEqual('MFE')
        }
      }
    }

    // INP with MFE attributes should also be duplicated
    if (browserMatch(supportsInteractionToNextPaint)) {
      const inpWithSourceAttrs = allMfeTimings.find(t =>
        t.type === 'timing' &&
        t.name === 'inp' &&
        hasMFEAttributes(t) &&
        getAttributeValue(t, 'source.id')
      )
      if (inpWithSourceAttrs) {
        const sourceId = getAttributeValue(inpWithSourceAttrs, 'source.id')
        expect(getAttributeValue(inpWithSourceAttrs, 'source.type')).toEqual('MFE')

        // Find duplicated version
        const duplicatedInp = allMfeTimings.find(t =>
          t.type === 'timing' &&
          t.name === 'inp' &&
          getAttributeValue(t, 'child.id') === sourceId
        )
        if (duplicatedInp) {
          expect(getAttributeValue(duplicatedInp, 'entity.guid')).toBeDefined()
          expect(getAttributeValue(duplicatedInp, 'child.type')).toEqual('MFE')
        }
      }
    }

    // FCP should NOT have MFE attributes and should NOT be duplicated
    const fcpTimings = allMfeTimings.filter(t => t.type === 'timing' && t.name === 'fcp')
    fcpTimings.forEach(timing => {
      expect(hasMFEAttributes(timing)).toBe(false)
      expect(getAttributeValue(timing, 'entity.guid')).toBeDefined()
      expect(getAttributeValue(timing, 'child.id')).toBeUndefined()
    })

    // FP should NOT have MFE attributes and should NOT be duplicated
    const fpTimings = allMfeTimings.filter(t => t.type === 'timing' && t.name === 'fp')
    fpTimings.forEach(timing => {
      expect(hasMFEAttributes(timing)).toBe(false)
      expect(getAttributeValue(timing, 'entity.guid')).toBeDefined()
      expect(getAttributeValue(timing, 'child.id')).toBeUndefined()
    })

    // FI should NOT have MFE attributes and should NOT be duplicated
    const fiTimings = allMfeTimings.filter(t => t.type === 'timing' && t.name === 'fi')
    fiTimings.forEach(timing => {
      expect(hasMFEAttributes(timing)).toBe(false)
      expect(getAttributeValue(timing, 'entity.guid')).toBeDefined()
      expect(getAttributeValue(timing, 'child.id')).toBeUndefined()
    })
  })
})
