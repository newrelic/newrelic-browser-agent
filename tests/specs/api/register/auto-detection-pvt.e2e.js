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

  // Helper function to check if timing has child MFE attributes
  function hasChildMFEAttributes (timing) {
    return getAttributeValue(timing, 'child.id') !== undefined
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

  it('should auto-detect MFEs and add child attributes to Page View Timing events', async () => {
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

    // LCP should have child.id and child.type attributes from main MFE
    if (browserMatch(supportsLargestContentfulPaint)) {
      const lcpTiming = allPageViewTimings.find(t => t.type === 'timing' && t.name === 'lcp' && getAttributeValue(t, 'child.id') === 'vite-main-mfe')
      if (lcpTiming) {
        expect(getAttributeValue(lcpTiming, 'child.id')).toEqual('vite-main-mfe')
        expect(getAttributeValue(lcpTiming, 'child.type')).toEqual('MFE')
        // Should NOT have source attributes (not duplicated to MFE)
        expect(getAttributeValue(lcpTiming, 'source.id')).toBeUndefined()
        expect(getAttributeValue(lcpTiming, 'source.type')).toBeUndefined()
      }
    }

    // CLS should have child MFE attributes if reported from an MFE
    if (browserMatch(supportsCumulativeLayoutShift)) {
      const clsTiming = allPageViewTimings.find(t => t.type === 'timing' && t.name === 'cls' && hasChildMFEAttributes(t))
      if (clsTiming) {
        expect(getAttributeValue(clsTiming, 'child.id')).toBeDefined()
        expect(getAttributeValue(clsTiming, 'child.type')).toEqual('MFE')
        // Should NOT have source attributes
        expect(getAttributeValue(clsTiming, 'source.id')).toBeUndefined()
        expect(getAttributeValue(clsTiming, 'source.type')).toBeUndefined()
      }
    }

    // INP should have child MFE attributes if reported from an MFE
    if (browserMatch(supportsInteractionToNextPaint)) {
      const inpTiming = allPageViewTimings.find(t => t.type === 'timing' && t.name === 'inp' && hasChildMFEAttributes(t))
      if (inpTiming) {
        expect(getAttributeValue(inpTiming, 'child.id')).toBeDefined()
        expect(getAttributeValue(inpTiming, 'child.type')).toEqual('MFE')
        // Should NOT have source attributes
        expect(getAttributeValue(inpTiming, 'source.id')).toBeUndefined()
        expect(getAttributeValue(inpTiming, 'source.type')).toBeUndefined()
      }
    }

    // FCP should NOT have child MFE attributes (only container agent)
    const fcpTiming = allPageViewTimings.find(t => t.type === 'timing' && t.name === 'fcp')
    if (fcpTiming) {
      expect(hasChildMFEAttributes(fcpTiming)).toBe(false)
      expect(getAttributeValue(fcpTiming, 'child.id')).toBeUndefined()
    }

    // FP should NOT have child MFE attributes (only container agent)
    const fpTiming = allPageViewTimings.find(t => t.type === 'timing' && t.name === 'fp')
    if (fpTiming) {
      expect(hasChildMFEAttributes(fpTiming)).toBe(false)
      expect(getAttributeValue(fpTiming, 'child.id')).toBeUndefined()
    }

    // FI should NOT have child MFE attributes (only container agent)
    const fiTiming = allPageViewTimings.find(t => t.type === 'timing' && t.name === 'fi')
    if (fiTiming) {
      expect(hasChildMFEAttributes(fiTiming)).toBe(false)
      expect(getAttributeValue(fiTiming, 'child.id')).toBeUndefined()
    }
  })
})
