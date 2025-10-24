import { testRumRequest, testTimingEventsRequest } from '../../tools/testing-server/utils/expect-tests'
import { FEATURE_NAMES } from '../../src/loaders/features/features'

describe('consent model', () => {
  let rumCapture, pvtCapture

  const HARVEST_TIMEOUT = 10000

  const consentModeConfig = {
    init: {
      useConsentModel: true
    }
  }
  const manualStartConfig = {
    init: {
      useConsentModel: true,
      [FEATURE_NAMES.pageViewTiming]: { autoStart: false }
    }
  }

  beforeEach(async () => {
    rumCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testRumRequest })
    pvtCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testTimingEventsRequest })
  })

  afterEach(async () => {
    // Make sure the NRBA_SESSION storage is cleared
    await browser.destroyAgentSession()
  })

  describe('consent API called before page has loaded', () => {
    it('should harvest data for PVE feature if consent is given', async () => {
      const [rumHarvests] = await Promise.all([
        rumCapture.waitForResult({ totalCount: 1 }),
        browser.url(await browser.testHandle.assetURL('consent-model-accept.html', consentModeConfig))
      ])

      expect(rumHarvests.length).toBeGreaterThan(0)
    })

    it('should not harvest data if consent is not given', async () => {
      const [rumHarvests] = await Promise.all([
        rumCapture.waitForResult({ timeout: HARVEST_TIMEOUT }),
        browser.url(await browser.testHandle.assetURL('consent-model-reject.html', consentModeConfig))
      ])

      expect(rumHarvests.length).toEqual(0)
    })
  })

  describe('consent API called after page has loaded', () => {
    it('should harvest data for PVE feature if consent is given', async () => {
      await browser.url(await browser.testHandle.assetURL('instrumented.html', consentModeConfig))
        .then(() => browser.waitForWindowLoad())

      await browser.execute(function () {
        newrelic.consent()
      })

      const rumHarvests = await rumCapture.waitForResult({ totalCount: 1 })
      expect(rumHarvests.length).toBeGreaterThan(0)
    })

    it('should not harvest data if consent is not given', async () => {
      await browser.url(await browser.testHandle.assetURL('instrumented.html', consentModeConfig))
        .then(() => browser.waitForWindowLoad())

      await browser.execute(function () {
        newrelic.consent(false)
      })

      const rumHarvests = await rumCapture.waitForResult({ timeout: HARVEST_TIMEOUT })
      expect(rumHarvests.length).toEqual(0)
    })
  })

  describe('consent API not called after page has loaded', () => {
    it('should not harvest data for PVE feature', async () => {
      const [rumHarvests] = await Promise.all([
        rumCapture.waitForResult({ timeout: HARVEST_TIMEOUT }),
        browser.url(await browser.testHandle.assetURL('instrumented.html', consentModeConfig))
      ])

      expect(rumHarvests.length).toEqual(0)
    })
  })

  describe('consent API called after .start()', () => {
    it('should not harvest from feature if consent is not given', async () => {
      await browser.url(await browser.testHandle.assetURL('instrumented.html', manualStartConfig))
        .then(() => browser.waitForWindowLoad())

      await browser.execute(function () {
        newrelic.start()
        setTimeout(() => {
          newrelic.consent(false)
        }, 3000)
      })

      await browser.waitForFeatureAggregate(FEATURE_NAMES.pageViewTiming, HARVEST_TIMEOUT)

      const pvtHarvests = await pvtCapture.waitForResult({ timeout: HARVEST_TIMEOUT })
      expect(pvtHarvests.length).toEqual(0)
    })

    it('should harvest from feature if consent is given', async () => {
      await browser.url(await browser.testHandle.assetURL('instrumented.html', manualStartConfig))
        .then(() => browser.waitForWindowLoad())

      await browser.execute(function () {
        newrelic.start()
        setTimeout(() => {
          newrelic.consent()
        }, 3000)
      })

      await browser.waitForFeatureAggregate(FEATURE_NAMES.pageViewTiming, HARVEST_TIMEOUT)

      const pvtHarvests = await pvtCapture.waitForResult({ timeout: HARVEST_TIMEOUT })
      expect(pvtHarvests.length).toBeGreaterThan(0)
    })
  })

  describe('consent API called before .start()', () => {
    it('should not harvest from feature if consent is not given', async () => {
      await browser.url(await browser.testHandle.assetURL('instrumented.html', manualStartConfig))
        .then(() => browser.waitForWindowLoad())

      await browser.execute(function () {
        newrelic.consent(false)
        setTimeout(() => {
          newrelic.start()
        }, 3000)
      })

      await browser.waitForFeatureAggregate(FEATURE_NAMES.pageViewTiming, HARVEST_TIMEOUT)

      const pvtHarvests = await pvtCapture.waitForResult({ timeout: HARVEST_TIMEOUT })
      expect(pvtHarvests.length).toEqual(0)
    })

    it('should harvest from feature if consent is given', async () => {
      await browser.url(await browser.testHandle.assetURL('instrumented.html', manualStartConfig))
        .then(() => browser.waitForWindowLoad())

      await browser.execute(function () {
        newrelic.consent()
        setTimeout(() => {
          newrelic.start()
        }, 3000)
      })

      await browser.waitForFeatureAggregate(FEATURE_NAMES.pageViewTiming, HARVEST_TIMEOUT)

      const pvtHarvests = await pvtCapture.waitForResult({ timeout: HARVEST_TIMEOUT })
      expect(pvtHarvests.length).toBeGreaterThan(0)
    })
  })

  describe('consent API called after autoStart', () => {
    it('should not harvest from feature if consent is not given', async () => {
      await browser.url(await browser.testHandle.assetURL('instrumented.html', consentModeConfig))
        .then(() => browser.waitForWindowLoad())

      await browser.execute(function () {
        newrelic.consent(false)
      })

      await browser.waitForFeatureAggregate(FEATURE_NAMES.pageViewTiming, HARVEST_TIMEOUT)

      const pvtHarvests = await pvtCapture.waitForResult({ timeout: HARVEST_TIMEOUT })
      expect(pvtHarvests.length).toEqual(0)
    })

    it('should harvest from feature if consent is given', async () => {
      await browser.url(await browser.testHandle.assetURL('instrumented.html', consentModeConfig))
        .then(() => browser.waitForWindowLoad())

      await browser.execute(function () {
        newrelic.consent()
      })

      await browser.waitForFeatureAggregate(FEATURE_NAMES.pageViewTiming, HARVEST_TIMEOUT)

      const pvtHarvests = await pvtCapture.waitForResult({ timeout: HARVEST_TIMEOUT })
      expect(pvtHarvests.length).toBeGreaterThan(0)
    })
  })

  describe('consent is revoked on first page load, accepted after second page load', () => {
    it('should harvest data', async () => {
      // First page load
      await browser.url(await browser.testHandle.assetURL('instrumented.html', consentModeConfig))
        .then(() => browser.waitForWindowLoad())
        .then(() => browser.execute(function () {
          newrelic.consent(false)
        }))

      // Second page load
      await browser.url(await browser.testHandle.assetURL('instrumented.html', consentModeConfig))
        .then(() => browser.waitForWindowLoad())

      await browser.execute(function () {
        newrelic.consent()
      })

      const rumHarvests = await rumCapture.waitForResult({ totalCount: 1 })
      expect(rumHarvests.length).toBeGreaterThan(0)
    })
  })
})
