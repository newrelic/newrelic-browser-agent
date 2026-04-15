import { testSupportMetricsRequest, testInsRequest } from '../../tools/testing-server/utils/expect-tests'

describe('Clock Drift Detection', () => {
  let supportabilityMetricsCapture
  let insightsCapture

  beforeEach(async () => {
    supportabilityMetricsCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testSupportMetricsRequest })
    insightsCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testInsRequest })
  })

  afterEach(async () => {
    await browser.destroyAgentSession()
  })

  it('should detect drift when performance.now() freezes while Date.now() continues', async () => {
    await browser.url(await browser.testHandle.assetURL('clock-drift-simulation.html', { loader: 'spa' }))
      .then(() => browser.waitForAgentLoad())

    // Wait for the initial RUM call to complete so TimeKeeper is ready
    await browser.execute(function () {
      const agent = Object.values(newrelic.initializedAgents)[0]
      const timeKeeper = agent.runtime.timeKeeper
      // Ensure TimeKeeper is initialized by waiting for it to be ready
      return new Promise((resolve) => {
        const checkReady = () => {
          if (timeKeeper.ready) {
            resolve()
          } else {
            setTimeout(checkReady, 10)
          }
        }
        checkReady()
      })
    })

    // Capture timestamps before drift
    const beforeDrift = await browser.execute(function () {
      const agent = Object.values(newrelic.initializedAgents)[0]
      const timeKeeper = agent.runtime.timeKeeper
      const perfNow = performance.now()
      const dateNow = Date.now()

      // Add a page action before the drift with timing data
      newrelic.addPageAction('beforeDrift', {
        perfNow,
        dateNow,
        convertedTimestamp: timeKeeper.convertRelativeTimestamp(perfNow)
      })

      return {
        perfNow,
        dateNow,
        convertedTimestamp: timeKeeper.convertRelativeTimestamp(perfNow)
      }
    })

    // Simulate a 4-hour clock freeze (drift) - realistic machine sleep scenario
    await browser.execute(function () {
      return window.simulateClockFreeze(14400000)
    })

    // Trigger drift detection and capture corrected timestamps
    const afterDrift = await browser.execute(function () {
      const agent = Object.values(newrelic.initializedAgents)[0]
      const timeKeeper = agent.runtime.timeKeeper

      // Log to verify the freeze worked
      const perfNow = performance.now()
      const dateNow = Date.now()

      // Trigger drift detection multiple times to ensure it fires
      for (let i = 0; i < 5; i++) {
        timeKeeper.convertRelativeTimestamp(perfNow)
        timeKeeper.convertAbsoluteTimestamp(dateNow)
      }

      // Call a method that triggers drift detection
      const convertedTimestamp = timeKeeper.convertRelativeTimestamp(perfNow)
      const convertedAbsolute = timeKeeper.convertAbsoluteTimestamp(dateNow)

      // Add a page action after the drift with timing data
      newrelic.addPageAction('afterDrift', {
        perfNow,
        dateNow,
        convertedTimestamp,
        convertedAbsolute
      })

      return {
        perfNow,
        dateNow,
        convertedTimestamp,
        convertedAbsolute
      }
    })

    // Verify that timestamps are corrected for drift
    // After drift, Date.now() has advanced ~4 hours more than performance.now()
    // The converted timestamp should add the drift to compensate
    const expectedDrift = Math.floor((afterDrift.dateNow - beforeDrift.dateNow) - (afterDrift.perfNow - beforeDrift.perfNow))
    expect(expectedDrift).toBeGreaterThan(14000000) // ~4 hours

    // The converted timestamp should be close to Date.now() because it includes drift correction
    const timestampDifference = Math.abs(afterDrift.convertedTimestamp - afterDrift.dateNow)
    expect(timestampDifference).toBeLessThan(100) // Allow small tolerance for execution time

    // convertAbsoluteTimestamp should give us back approximately performance.now() (subtracting drift)
    const absoluteDifference = Math.abs(afterDrift.convertedAbsolute - afterDrift.perfNow)
    expect(absoluteDifference).toBeLessThan(100)

    // Small delay to ensure page actions are buffered
    await browser.pause(100)

    // Unfreeze clocks before triggering harvest to avoid timer issues
    await browser.execute(function () {
      window.unfreezeClocks()
    })

    // Trigger harvest by navigating away
    const [insightsHarvests, metricsHarvests] = await Promise.all([
      insightsCapture.waitForResult({ totalCount: 1, timeout: 10000 }),
      supportabilityMetricsCapture.waitForResult({ totalCount: 1, timeout: 10000 }),
      browser.url(await browser.testHandle.assetURL('/'))
    ])

    // Verify page action timestamps
    expect(insightsHarvests).toBeDefined()
    expect(insightsHarvests.length).toBeGreaterThan(0)

    const allInsights = insightsHarvests[0].request.body.ins
    // Filter to only PageAction events (exclude UserAction like blur)
    const pageActions = allInsights.filter(event => event.eventType === 'PageAction')
    expect(pageActions).toHaveLength(2)

    // Find the before and after page actions
    const beforeAction = pageActions.find(pa => pa.actionName === 'beforeDrift')
    const afterAction = pageActions.find(pa => pa.actionName === 'afterDrift')

    expect(beforeAction).toBeDefined()
    expect(afterAction).toBeDefined()

    // Verify the page action attributes are close to what we captured
    // Note: perfNow might differ slightly between beforeDrift capture and the freeze point
    expect(Math.abs(beforeAction.perfNow - beforeDrift.perfNow)).toBeLessThan(500) // Allow up to 500ms for execution time
    expect(Math.abs(beforeAction.dateNow - beforeDrift.dateNow)).toBeLessThan(500)
    expect(Math.abs(beforeAction.convertedTimestamp - beforeDrift.convertedTimestamp)).toBeLessThan(500)

    // After drift, perfNow should be frozen (same value in page action as captured)
    expect(Math.abs(afterAction.perfNow - afterDrift.perfNow)).toBeLessThan(1)
    expect(Math.abs(afterAction.dateNow - afterDrift.dateNow)).toBeLessThan(1)
    expect(Math.abs(afterAction.convertedTimestamp - afterDrift.convertedTimestamp)).toBeLessThan(1)
    expect(Math.abs(afterAction.convertedAbsolute - afterDrift.convertedAbsolute)).toBeLessThan(1)

    // The before-drift page action timestamp should be close to its dateNow
    // (no drift correction needed since drift hadn't happened yet)
    const beforeActionDiff = Math.abs(beforeAction.timestamp - beforeAction.dateNow)
    expect(beforeActionDiff).toBeLessThan(1000) // Allow 1 second tolerance due to network time for wdio tests

    // The after-drift page action timestamp should be close to its dateNow
    // It should be corrected to current time, NOT 4 hours behind
    const afterActionDiff = Math.abs(afterAction.timestamp - afterAction.dateNow)
    expect(afterActionDiff).toBeLessThan(1000) // Should be corrected to current time

    // Verify the difference between the two page actions is approximately the drift amount
    const timeDiffBetweenActions = afterAction.timestamp - beforeAction.timestamp
    expect(timeDiffBetweenActions).toBeGreaterThan(14000000) // Should be ~4 hours apart

    // Also verify using the captured dateNow values
    const dateDiff = afterAction.dateNow - beforeAction.dateNow
    expect(dateDiff).toBeGreaterThan(14000000) // Date.now() advanced ~4 hours

    // perfNow increased slightly before freezing, but stayed frozen after
    // The key is that Date.now advanced much more than perfNow
    const perfDiff = afterAction.perfNow - beforeAction.perfNow
    expect(perfDiff).toBeLessThan(1000) // Should be minimal (just wdio network + execution time before freeze)
    expect(dateDiff - perfDiff).toBeGreaterThan(14000000) // The drift amount

    // Verify the supportability metric was reported
    expect(metricsHarvests.length).toBeGreaterThan(0)
    const supportabilityMetrics = metricsHarvests[0].request.body.sm

    const driftMetric = supportabilityMetrics.find(sm =>
      sm.params.name === 'Generic/TimeKeeper/ClockDrift/Detected'
    )
    expect(driftMetric).toBeDefined()
    expect(driftMetric.stats.t).toBeGreaterThan(14400000) // Should report ~4 hours of drift
  })

  it('should NOT detect drift with normal server time offset', async () => {
    // Load page with 1-hour server offset to verify it doesn't trigger drift detection
    await browser.url(await browser.testHandle.assetURL('instrumented.html', {
      loader: 'spa',
      init: {
        app: { nrServerTime: Date.now() + 3600000 } // 1 hour in the future
      }
    }))
      .then(() => browser.waitForAgentLoad())

    // Trigger drift detection by calling time conversion methods
    await browser.execute(function () {
      const agent = Object.values(newrelic.initializedAgents)[0]
      const timeKeeper = agent.runtime.timeKeeper

      // Call methods that trigger drift detection
      for (let i = 0; i < 5; i++) {
        timeKeeper.convertRelativeTimestamp(performance.now())
      }
    })

    // Navigate away to trigger final harvest
    const [metricsHarvests] = await Promise.all([
      supportabilityMetricsCapture.waitForResult({ totalCount: 1, timeout: 10000 }),
      browser.url(await browser.testHandle.assetURL('/'))
    ])

    const supportabilityMetrics = metricsHarvests[0].request.body.sm

    // Check that NO drift was detected (no 'Generic/TimeKeeper/ClockDrift/Detected' metric)
    const driftMetric = supportabilityMetrics.find(sm =>
      sm.params.name === 'Generic/TimeKeeper/ClockDrift/Detected'
    )
    expect(driftMetric).toBeUndefined()
  })

  it('should handle multiple drift events and continue correcting timestamps', async () => {
    await browser.url(await browser.testHandle.assetURL('clock-drift-simulation.html', { loader: 'spa' }))
      .then(() => browser.waitForAgentLoad())

    // Add initial page action before any drift
    const initial = await browser.execute(function () {
      const perfNow = performance.now()
      const dateNow = Date.now()

      newrelic.addPageAction('initial', {
        perfNow,
        dateNow
      })

      return { perfNow, dateNow }
    })

    // First drift event: 4 hours
    await browser.execute(function () {
      return window.simulateClockFreeze(14400000)
    })

    const afterFirstDrift = await browser.execute(function () {
      const agent = Object.values(newrelic.initializedAgents)[0]
      const timeKeeper = agent.runtime.timeKeeper
      const perfNow = performance.now()
      const dateNow = Date.now()
      const convertedTimestamp = timeKeeper.convertRelativeTimestamp(perfNow)

      // Add page action after first drift
      newrelic.addPageAction('afterFirstDrift', {
        perfNow,
        dateNow,
        convertedTimestamp
      })

      return {
        perfNow,
        dateNow,
        convertedTimestamp
      }
    })

    // Verify first drift correction
    // Note: Some drift may accumulate during test execution, so allow reasonable tolerance
    const firstDriftCheck = Math.abs(afterFirstDrift.convertedTimestamp - afterFirstDrift.dateNow)
    expect(firstDriftCheck).toBeLessThan(500) // Allow tolerance for execution time and wdio overhead

    // Second drift event: another 2 hours
    await browser.execute(function () {
      return window.simulateClockFreeze(7200000)
    })

    const afterSecondDrift = await browser.execute(function () {
      const agent = Object.values(newrelic.initializedAgents)[0]
      const timeKeeper = agent.runtime.timeKeeper
      const perfNow = performance.now()
      const dateNow = Date.now()
      const convertedTimestamp = timeKeeper.convertRelativeTimestamp(perfNow)

      // Add page action after second drift
      newrelic.addPageAction('afterSecondDrift', {
        perfNow,
        dateNow,
        convertedTimestamp
      })

      return {
        perfNow,
        dateNow,
        convertedTimestamp
      }
    })

    // Verify second drift correction (cumulative ~6 hours total drift)
    // Note: Some drift may accumulate during test execution, so allow reasonable tolerance
    const secondDriftCheck = Math.abs(afterSecondDrift.convertedTimestamp - afterSecondDrift.dateNow)
    expect(secondDriftCheck).toBeLessThan(500) // Allow tolerance for execution time and wdio overhead

    // Small delay to ensure page actions are buffered
    await browser.pause(100)

    // Unfreeze clocks before triggering harvest to avoid timer issues
    await browser.execute(function () {
      window.unfreezeClocks()
    })

    // Trigger harvest by navigating away
    const [insightsHarvests, metricsHarvests] = await Promise.all([
      insightsCapture.waitForResult({ totalCount: 1, timeout: 10000 }),
      supportabilityMetricsCapture.waitForResult({ totalCount: 1, timeout: 10000 }),
      browser.url(await browser.testHandle.assetURL('/'))
    ])

    // Verify page actions were collected with correct timestamps
    expect(insightsHarvests).toBeDefined()
    expect(insightsHarvests.length).toBeGreaterThan(0)

    const allInsights = insightsHarvests[0].request.body.ins
    // Filter to only PageAction events (exclude UserAction like blur)
    const pageActions = allInsights.filter(event => event.eventType === 'PageAction')
    expect(pageActions.length).toBeGreaterThanOrEqual(3)

    const initialAction = pageActions.find(pa => pa.actionName === 'initial')
    const firstDriftAction = pageActions.find(pa => pa.actionName === 'afterFirstDrift')
    const secondDriftAction = pageActions.find(pa => pa.actionName === 'afterSecondDrift')

    expect(initialAction).toBeDefined()
    expect(firstDriftAction).toBeDefined()
    expect(secondDriftAction).toBeDefined()

    // Verify attributes are close to captured values (allow for execution time)
    expect(Math.abs(initialAction.perfNow - initial.perfNow)).toBeLessThan(500)
    expect(Math.abs(initialAction.dateNow - initial.dateNow)).toBeLessThan(500)

    expect(Math.abs(firstDriftAction.perfNow - afterFirstDrift.perfNow)).toBeLessThan(1)
    expect(Math.abs(firstDriftAction.dateNow - afterFirstDrift.dateNow)).toBeLessThan(1)
    expect(Math.abs(firstDriftAction.convertedTimestamp - afterFirstDrift.convertedTimestamp)).toBeLessThan(1)

    expect(Math.abs(secondDriftAction.perfNow - afterSecondDrift.perfNow)).toBeLessThan(1)
    expect(Math.abs(secondDriftAction.dateNow - afterSecondDrift.dateNow)).toBeLessThan(1)
    expect(Math.abs(secondDriftAction.convertedTimestamp - afterSecondDrift.convertedTimestamp)).toBeLessThan(1)

    // perfNow should stay approximately frozen after first drift (allowing for small execution time before freeze)
    expect(Math.abs(firstDriftAction.perfNow - initialAction.perfNow)).toBeLessThan(1000)
    expect(Math.abs(secondDriftAction.perfNow - firstDriftAction.perfNow)).toBeLessThan(10) // Very close after frozen

    // dateNow should advance with each drift
    const dateDiff1 = firstDriftAction.dateNow - initialAction.dateNow
    expect(dateDiff1).toBeGreaterThan(14000000) // ~4 hours

    const dateDiff2 = secondDriftAction.dateNow - firstDriftAction.dateNow
    expect(dateDiff2).toBeGreaterThan(7000000) // ~2 hours

    // Page action timestamps should reflect the drift-corrected time
    const actionTimeDiff1 = firstDriftAction.timestamp - initialAction.timestamp
    expect(actionTimeDiff1).toBeGreaterThan(14000000) // ~4 hours

    const actionTimeDiff2 = secondDriftAction.timestamp - firstDriftAction.timestamp
    expect(actionTimeDiff2).toBeGreaterThan(7000000) // ~2 hours

    // Verify supportability metrics were reported
    expect(metricsHarvests.length).toBeGreaterThan(0)
    const supportabilityMetrics = metricsHarvests[0].request.body.sm

    // Should have reported drift detection (at least once, possibly twice)
    const driftMetrics = supportabilityMetrics.filter(sm =>
      sm.params.name === 'Generic/TimeKeeper/ClockDrift/Detected'
    )

    expect(driftMetrics.length).toBeGreaterThan(0)
    // Count should be at least 1 (may report both drift events or aggregate them)
    const totalCount = driftMetrics.reduce((sum, metric) => sum + metric.stats.c, 0)
    expect(totalCount).toBeGreaterThanOrEqual(1)
  })
})
