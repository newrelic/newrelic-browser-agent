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
    expect(timing).toHaveProperty('duration')
    expect(timing).toHaveProperty('timeToLoad')
    expect(timing).toHaveProperty('timeToBeRequested')
    expect(timing).toHaveProperty('timeToFetch')
    expect(timing).toHaveProperty('timeToRegister')
    expect(timing).toHaveProperty('timeAlive')

    // All values should be numbers
    expect(typeof timing.duration).toBe('number')
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

  it('should calculate timeAlive as duration between register and deregister', async () => {
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
      expect(timing.duration).toBeGreaterThan(0)
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
      expect(timing.duration).toBeGreaterThan(0)
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
    expect(timing.duration).toBeGreaterThanOrEqual(0)
    expect(timing.timeToLoad).toBeGreaterThanOrEqual(0)
    expect(timing.timeToBeRequested).toBeGreaterThanOrEqual(0)
    expect(timing.timeToFetch).toBeGreaterThanOrEqual(0)
    expect(timing.timeToRegister).toBeGreaterThanOrEqual(0)
    expect(timing.timeAlive).toBeGreaterThanOrEqual(0)
  })
})
