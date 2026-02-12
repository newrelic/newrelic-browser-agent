const { testMFEInsRequest } = require('../../../../tools/testing-server/utils/expect-tests')
const { fullySupportsPreloadResourceTimings } = require('../../../../tools/browser-matcher/common-matchers.mjs')

let mfeInsightsCapture
describe('Register API - Timings', () => {
  beforeEach(async () => {
    [mfeInsightsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testMFEInsRequest }
    ])
  })

  afterEach(async () => {
    await browser.destroyAgentSession()
  })

  it('should report MicroFrontEndTiming event with all timing attributes on deregister', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented.html', {
      init: { feature_flags: ['register', 'register.generic_events'] }
    }))

    await browser.execute(function () {
      const mfe = newrelic.register({ id: 1, name: 'test-mfe' })

      // Simulate some work
      const start = Date.now()
      while (Date.now() - start < 10) {
        // busy wait for ~10ms
      }

      mfe.deregister()
    })

    const insightsHarvests = await mfeInsightsCapture.waitForResult({ totalCount: 1, timeout: 10000 })
    expect(insightsHarvests.length).toBeGreaterThanOrEqual(1)

    const timingEvents = insightsHarvests
      .flatMap(({ request: { body } }) => body.ins)
      .filter(event => event.eventType === 'MicroFrontEndTiming')

    expect(timingEvents.length).toBeGreaterThanOrEqual(1)

    const timing = timingEvents[0]
    expect(timing).toHaveProperty('timeToLoad')
    expect(timing).toHaveProperty('timeToBeRequested')
    expect(timing).toHaveProperty('timeToFetch')
    expect(timing).toHaveProperty('timeToRegister')
    expect(timing).toHaveProperty('timeAlive')
    expect(timing).toHaveProperty('assetType')
    expect(timing).toHaveProperty('assetUrl')

    // timing values should be numbers
    expect(typeof timing.timeToLoad).toBe('number')
    expect(typeof timing.timeToBeRequested).toBe('number')
    expect(typeof timing.timeToFetch).toBe('number')
    expect(typeof timing.timeToRegister).toBe('number')
    expect(typeof timing.timeAlive).toBe('number')

    // assetType should be a string with valid value
    expect(typeof timing.assetType).toBe('string')
    expect(['script', 'link', 'preload', 'inline', 'unknown']).toContain(timing.assetType)

    // timeAlive should be positive since work was done
    expect(timing.timeAlive).toBeGreaterThan(0)
  })

  it('should report MicroFrontEndTiming event on pagehide', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented.html', {
      init: { feature_flags: ['register', 'register.generic_events'] }
    }))

    await browser.execute(function () {
      window.mfe = newrelic.register({ id: 1, name: 'test-mfe' })

      // Simulate some work
      const start = Date.now()
      while (Date.now() - start < 10) {
        // busy wait
      }

      // Trigger pagehide instead of deregister
      window.dispatchEvent(new Event('pagehide'))
    })

    const insightsHarvests = await mfeInsightsCapture.waitForResult({ totalCount: 1, timeout: 10000 })

    const timingEvents = insightsHarvests
      .flatMap(({ request: { body } }) => body.ins)
      .filter(event => event.eventType === 'MicroFrontEndTiming')

    expect(timingEvents.length).toBeGreaterThanOrEqual(1)
    expect(timingEvents[0].timeAlive).toBeGreaterThan(0)
  })

  it('should not report timing twice if deregistered before pagehide', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented.html', {
      init: { feature_flags: ['register', 'register.generic_events'] }
    }))

    await browser.execute(function () {
      const mfe = newrelic.register({ id: 1, name: 'test-mfe' })
      mfe.deregister()
      window.dispatchEvent(new Event('pagehide'))
    })

    const insightsHarvests = await mfeInsightsCapture.waitForResult({ totalCount: 1, timeout: 10000 })

    const timingEvents = insightsHarvests
      .flatMap(({ request: { body } }) => body.ins)
      .filter(event => event.eventType === 'MicroFrontEndTiming')

    // Should only get one timing event despite both deregister and pagehide
    expect(timingEvents).toHaveLength(1)
  })

  it('should calculate timeAlive as time between register and deregister', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented.html', {
      init: { feature_flags: ['register', 'register.generic_events'] }
    }))

    const waitTime = await browser.execute(function () {
      const waitMs = 100
      const mfe = newrelic.register({ id: 1, name: 'timed-mfe' })

      setTimeout(() => {
        mfe.deregister()
      }, waitMs)

      return waitMs
    })

    const insightsHarvests = await mfeInsightsCapture.waitForResult({ totalCount: 1, timeout: 10000 })

    const timingEvents = insightsHarvests
      .flatMap(({ request: { body } }) => body.ins)
      .filter(event => event.eventType === 'MicroFrontEndTiming')

    expect(timingEvents.length).toBeGreaterThanOrEqual(1)

    const timing = timingEvents[0]
    // timeAlive should be approximately the wait time (with some tolerance for execution time)
    expect(timing.timeAlive).toBeGreaterThanOrEqual(waitTime - 50)
    expect(timing.timeAlive).toBeLessThan(waitTime + 200)
  })

  it('should track separate timings for nested MFEs', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented.html', {
      init: { feature_flags: ['register', 'register.generic_events'] }
    }))

    await browser.execute(function () {
      const parent = newrelic.register({ id: 1, name: 'parent-mfe' })

      // Wait a bit before creating child
      const start = Date.now()
      while (Date.now() - start < 10) {
        // busy wait
      }

      const child = newrelic.register({ id: 2, name: 'child-mfe' }, parent)

      // Deregister child first, then parent
      setTimeout(() => {
        child.deregister()
        parent.deregister()
      }, 50)
    })

    const insightsHarvests = await mfeInsightsCapture.waitForResult({ totalCount: 1, timeout: 10000 })

    const timingEvents = insightsHarvests
      .flatMap(({ request: { body } }) => body.ins)
      .filter(event => event.eventType === 'MicroFrontEndTiming')

    // Should get timing events for both parent and child
    expect(timingEvents.length).toBeGreaterThanOrEqual(2)

    // Each should have independent timing calculations
    timingEvents.forEach(timing => {
      expect(timing.timeAlive).toBeGreaterThan(0)
    })
  })

  it('should handle rapid registration and deregistration of multiple MFEs', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented.html', {
      init: { feature_flags: ['register', 'register.generic_events'] }
    }))

    await browser.execute(function () {
      const mfes = []

      // Create multiple MFEs rapidly
      for (let i = 1; i <= 5; i++) {
        mfes.push(newrelic.register({ id: i, name: `mfe-${i}` }))
      }

      // Deregister all after a short delay
      setTimeout(() => {
        mfes.forEach(mfe => mfe.deregister())
      }, 30)
    })

    const insightsHarvests = await mfeInsightsCapture.waitForResult({ totalCount: 1, timeout: 10000 })

    const timingEvents = insightsHarvests
      .flatMap(({ request: { body } }) => body.ins)
      .filter(event => event.eventType === 'MicroFrontEndTiming')

    // Should get timing events for all 5 MFEs
    expect(timingEvents.length).toBeGreaterThanOrEqual(5)

    // All should have valid timing data
    timingEvents.forEach(timing => {
      expect(timing.timeAlive).toBeGreaterThanOrEqual(0)
      expect(typeof timing.timeToLoad).toBe('number')
    })
  })

  it('should report timing metrics with correct relationships', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented.html', {
      init: { feature_flags: ['register', 'register.generic_events'] }
    }))

    await browser.execute(function () {
      const mfe = newrelic.register({ id: 1, name: 'test-mfe' })

      // Do some work
      const start = Date.now()
      while (Date.now() - start < 20) {
        // busy wait
      }

      mfe.deregister()
    })

    const insightsHarvests = await mfeInsightsCapture.waitForResult({ totalCount: 1, timeout: 10000 })

    const timingEvents = insightsHarvests
      .flatMap(({ request: { body } }) => body.ins)
      .filter(event => event.eventType === 'MicroFrontEndTiming')

    expect(timingEvents).toHaveLength(1)

    const timing = timingEvents[0]

    // Verify all timing values are non-negative
    expect(timing.timeToLoad).toBeGreaterThanOrEqual(0)
    expect(timing.timeToBeRequested).toBeGreaterThanOrEqual(0)
    expect(timing.timeToFetch).toBeGreaterThanOrEqual(0)
    expect(timing.timeToRegister).toBeGreaterThanOrEqual(0)
    expect(timing.timeAlive).toBeGreaterThanOrEqual(0)

    // Verify assetType is present and valid
    expect(timing.assetType).toBeDefined()
    expect(['script', 'link', 'preload', 'inline', 'unknown']).toContain(timing.assetType)
  })

  it('should report correct assetType for inline scripts', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented.html', {
      init: { feature_flags: ['register', 'register.generic_events'] }
    }))

    await browser.execute(function () {
      // This is an inline script registration
      const mfe = newrelic.register({ id: 1, name: 'inline-mfe' })
      mfe.deregister()
    })

    const insightsHarvests = await mfeInsightsCapture.waitForResult({ totalCount: 1, timeout: 10000 })

    const timingEvents = insightsHarvests
      .flatMap(({ request: { body } }) => body.ins)
      .filter(event => event.eventType === 'MicroFrontEndTiming')

    expect(timingEvents.length).toBeGreaterThanOrEqual(1)

    const timing = timingEvents[0]
    // Inline scripts should have assetType 'inline'
    expect(timing.assetType).toBe('inline')
    // Inline scripts should have zero fetch timings since they're part of the document
    expect(timing.timeToBeRequested).toBe(0)
    expect(timing.timeToFetch).toBe(0)
    // assetUrl should be the page URL
    expect(timing.assetUrl).toContain('instrumented.html')
  })

  it('should properly handle preloaded scripts with overloaded resource buffer', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented-with-mfe-inline-overloaded.html'))
      .then(() => browser.waitForAgentLoad())

    // The main MFE is registered inline, but there's a preloaded script
    // Wait for deregistration
    await browser.pause(3500)

    const insightsHarvests = await mfeInsightsCapture.waitForResult({ timeout: 10000 })

    const timingEvents = insightsHarvests
      .flatMap(({ request: { body } }) => body.ins)
      .filter(event => event.eventType === 'MicroFrontEndTiming')

    expect(timingEvents.length).toBeGreaterThanOrEqual(1)

    const mainMfe = timingEvents.find(event => event['source.name'] === 'main')
    expect(mainMfe).toBeDefined()

    // Main should be inline type
    expect(mainMfe.assetType).toBe('inline')
    expect(mainMfe.timeToBeRequested).toBe(0)
    expect(mainMfe.timeToFetch).toBe(0)
  })

  it('should detect and report preload asset type when resource buffer is full', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented-with-mfe-inline-overloaded.html'))
      .then(() => browser.waitForAgentLoad())

    // Click to trigger async MFEs to load
    await $('body').click()

    // Wait for scripts to load
    await browser.pause(3500)

    // Dispatch pagehide to trigger harvest
    await browser.execute(function () {
      window.dispatchEvent(new Event('pagehide'))
    })

    const insightsHarvests = await mfeInsightsCapture.waitForResult({ timeout: 10000 })

    const timingEvents = insightsHarvests
      .flatMap(({ request: { body } }) => body.ins)
      .filter(event => event.eventType === 'MicroFrontEndTiming')

    expect(timingEvents.length).toBeGreaterThanOrEqual(1)

    const mainMfe = timingEvents.find(event => event['source.name'] === 'main')
    expect(mainMfe).toBeDefined()

    // Main should be inline type
    expect(mainMfe.assetType).toBe('inline')
    expect(mainMfe.timeToBeRequested).toBe(0)
    expect(mainMfe.timeToFetch).toBe(0)

    // Find the preloaded script MFE
    const preloadedMfe = timingEvents.find(event =>
      event['source.name'] === 'test 4'
    )

    // With the resource buffer set to 0, preloaded scripts should still be detected through the PO retroactively
    expect(preloadedMfe).toBeDefined()
    expect(preloadedMfe.assetType).toBe('link')
    expect(preloadedMfe.assetUrl.includes('preload.js')).toEqual(true)
  })

  it('should differentiate between script and link initiator types', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented-with-mfe-remote.html'))
      .then(() => browser.waitForAgentLoad())

    // Click to trigger async MFEs to load
    await $('body').click()

    // Wait for all scripts to load
    await browser.pause(3500)

    // Dispatch pagehide to trigger harvest
    await browser.execute(function () {
      window.dispatchEvent(new Event('pagehide'))
    })

    const insightsHarvests = await mfeInsightsCapture.waitForResult({ timeout: 10000 })

    const timingEvents = insightsHarvests
      .flatMap(({ request: { body } }) => body.ins)
      .filter(event => event.eventType === 'MicroFrontEndTiming')

    expect(timingEvents.length).toBeGreaterThanOrEqual(1)

    // assetType should be one of the valid values for all events
    timingEvents.forEach(timing => {
      expect(['script', 'link', 'preload', 'inline', 'unknown']).toContain(timing.assetType)
      expect(timing.assetUrl).toBeDefined()
    })
  })

  it('should handle MFEs with unknown asset type gracefully', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented.html', {
      init: { feature_flags: ['register', 'register.generic_events'] }
    }))

    await browser.execute(function () {
      // Register from eval'd code which won't match any resource
      const code = `
        const api = newrelic.register({ id: 999, name: 'eval-mfe' });
        api.deregister();
      `
      // eslint-disable-next-line
      eval(code)
    })

    const insightsHarvests = await mfeInsightsCapture.waitForResult({ totalCount: 1, timeout: 10000 })

    const timingEvents = insightsHarvests
      .flatMap(({ request: { body } }) => body.ins)
      .filter(event => event.eventType === 'MicroFrontEndTiming')

    expect(timingEvents.length).toBeGreaterThanOrEqual(1)

    const evalMfe = timingEvents.find(event => event['source.name'] === 'eval-mfe')
    expect(evalMfe).toBeDefined()

    // Eval'd code should still have a valid assetType (likely 'inline' because stack points to page URL)
    expect(['script', 'link', 'preload', 'inline', 'unknown']).toContain(evalMfe.assetType)
  })

  describe('Fetch time assumptions work with different types of scripts', () => {
    const testFiles = [
      ['instrumented-with-mfe-inline.html', 'inline loader'],
      ['instrumented-with-mfe-remote.html', 'remote loader']
    ]

    testFiles.forEach(([testFile, description]) => {
      it(`should report all four MFEs with correct timing attributes for ${description}`, async () => {
        await browser.url(await browser.testHandle.assetURL(testFile))
          .then(() => browser.waitForAgentLoad())

        // Click to trigger async MFEs to load
        await $('body').click()

        // Wait for all scripts to load and do their things
        await browser.pause(3500)

        // Dispatch pagehide to trigger mfe2 and mfe3 harvest
        await browser.execute(function () {
          window.dispatchEvent(new Event('pagehide'))
        })

        const insightsHarvests = await mfeInsightsCapture.waitForResult({ timeout: 10000 })

        const timingEvents = insightsHarvests
          .flatMap(({ request: { body } }) => body.ins)
          .filter(event => event.eventType === 'MicroFrontEndTiming')

        expect(timingEvents.length).toBeGreaterThanOrEqual(5)

        const mainMfe = timingEvents.find(event => event['source.name'] === 'main')
        const mfe1 = timingEvents.find(event => event['source.name'] === 'test')
        const mfe2 = timingEvents.find(event => event['source.name'] === 'test 2')
        const mfe3 = timingEvents.find(event => event['source.name'] === 'test 3')
        const mfe4 = timingEvents.find(event => event['source.name'] === 'test 4')

        // Main MFE should have zero fetch timings and be inline type
        expect(mainMfe).toBeDefined()
        expect(mainMfe.timeToBeRequested).toBe(0)
        expect(mainMfe.timeToFetch).toBe(0)
        expect(mainMfe.assetType).toBe('inline')
        expect(mainMfe.assetUrl).toBeDefined()

        // MFE1 (test) should have fetch timings and be preload type (due to overloaded buffer)
        expect(mfe1).toBeDefined()
        expect(mfe1.timeToBeRequested).toBeGreaterThanOrEqual(0)
        expect(mfe1.timeToFetch).toBeGreaterThanOrEqual(0)
        expect(mfe1.assetType).toBe('script')
        expect(mfe1.assetUrl).toBeDefined()

        // MFE2 (test 2) should have fetch timings
        expect(mfe2).toBeDefined()
        expect(mfe2.timeToBeRequested).toBeGreaterThan(0)
        expect(mfe2.timeToFetch).toBeGreaterThan(0)
        expect(mfe2.assetType).toEqual('script')
        expect(mfe2.assetUrl).toBeDefined()

        // MFE3 (test 3) should have fetch timings (loaded via dynamic import)
        expect(mfe3).toBeDefined()
        expect(mfe3.timeToBeRequested).toBeGreaterThan(0)
        expect(mfe3.timeToFetch).toBeGreaterThan(0)
        expect(mfe3.assetType).toEqual('script')
        expect(mfe3.assetUrl).toBeDefined()

        // MFE4 (test 4) should have fetch timings (preloaded script), but fetch time may be 0 in Safari/iOS due to how they implement the preload spec and dynamic imports
        expect(mfe4).toBeDefined()
        expect(mfe4.timeToBeRequested).toBeGreaterThan(0)
        if (browserMatch(fullySupportsPreloadResourceTimings)) expect(mfe4.timeToFetch).toBeGreaterThan(0)
        else {
          // Safari & iOS safari report preloaded script durations as "0" (or sometimes "1") because they consider the preload to be the fetch, and the dynamic import just pulls from cache, resulting in no additional fetch time. Other browsers report the dynamic import as a separate fetch which has a small amount of time.
          expect(mfe4.timeToFetch).toBeGreaterThanOrEqual(0)
          expect(mfe4.timeToFetch).toBeLessThanOrEqual(1)
        }
        expect(mfe4.assetType).toEqual('link')
        expect(mfe4.assetUrl).toBeDefined()
      })
    })
  })
})
