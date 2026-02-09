const { testMFEInsRequest } = require('../../../../tools/testing-server/utils/expect-tests')

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

    // All values should be numbers
    expect(typeof timing.timeToLoad).toBe('number')
    expect(typeof timing.timeToBeRequested).toBe('number')
    expect(typeof timing.timeToFetch).toBe('number')
    expect(typeof timing.timeToRegister).toBe('number')
    expect(typeof timing.timeAlive).toBe('number')

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
  })

  describe('Fetch time assumptions work with different types of scripts', () => {
    const testFiles = [
      ['instrumented-with-mfe-inline.html', 'inline loader'],
      ['instrumented-with-mfe-remote.html', 'remote loader']
    ]

    testFiles.forEach(([testFile, description]) => {
      // the pagehide event is fickle for these mobile browsers in LT, works locally though
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

        expect(timingEvents.length).toBeGreaterThanOrEqual(4)

        const mainMfe = timingEvents.find(event => event['source.name'] === 'main')
        const mfe1 = timingEvents.find(event => event['source.name'] === 'test')
        const mfe2 = timingEvents.find(event => event['source.name'] === 'test 2')
        const mfe3 = timingEvents.find(event => event['source.name'] === 'test 3')

        // Main MFE should have zero fetch timings
        expect(mainMfe).toBeDefined()
        expect(mainMfe.timeToBeRequested).toBe(0)
        expect(mainMfe.timeToFetch).toBe(0)

        // MFE1 (test) should have fetch timings
        expect(mfe1).toBeDefined()
        expect(mfe1.timeToBeRequested).toBeGreaterThan(0)
        expect(mfe1.timeToFetch).toBeGreaterThan(0)

        // MFE2 (test 2) should have fetch timings
        expect(mfe2).toBeDefined()
        expect(mfe2.timeToBeRequested).toBeGreaterThan(0)
        expect(mfe2.timeToFetch).toBeGreaterThan(0)

        // MFE3 (test 3) should have fetch timings (loaded via dynamic import)
        expect(mfe3).toBeDefined()
        expect(mfe3.timeToBeRequested).toBeGreaterThan(0)
        expect(mfe3.timeToFetch).toBeGreaterThan(0)
      })
    })
  })
})
