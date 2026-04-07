import { testSupportMetricsRequest } from '../../tools/testing-server/utils/expect-tests'

describe('Clock Drift Detection', () => {
  let supportabilityMetricsCapture

  beforeEach(async () => {
    supportabilityMetricsCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testSupportMetricsRequest })
  })

  afterEach(async () => {
    await browser.destroyAgentSession()
  })

  it('should detect drift when performance.now() freezes while Date.now() continues', async () => {
    await browser.url(await browser.testHandle.assetURL('clock-drift-simulation.html', { loader: 'rum' }))
      .then(() => browser.waitForAgentLoad())

    // Simulate a 2-second clock freeze (drift)
    await browser.executeAsync(function (done) {
      window.simulateClockFreeze(2000).then(done)
    })

    // Trigger drift detection by calling TimeKeeper methods
    await browser.execute(function () {
      const agent = Object.values(newrelic.initializedAgents)[0]
      const timeKeeper = agent.runtime.timeKeeper

      // Call a method that triggers drift detection
      timeKeeper.convertRelativeTimestamp(performance.now())
    })

    // Navigate away to trigger final harvest with supportability metrics
    const [metricsHarvests] = await Promise.all([
      supportabilityMetricsCapture.waitForResult({ totalCount: 1 }),
      browser.url(await browser.testHandle.assetURL('/'))
    ])

    const supportabilityMetrics = metricsHarvests[0].request.body.sm

    // Look for the drift detection metric
    const driftMetric = supportabilityMetrics.find(sm =>
      sm.params.name === 'Generic/TimeKeeper/ClockDrift/Detected'
    )

    expect(driftMetric).toBeDefined()
    expect(driftMetric.stats.t).toBeGreaterThan(1000) // Drift value should be > 1000ms
  })

  it('should NOT detect drift with normal server time offset', async () => {
    // Load page with 1-hour server offset to verify it doesn't trigger drift detection
    await browser.url(await browser.testHandle.assetURL('instrumented.html', {
      loader: 'rum',
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
      supportabilityMetricsCapture.waitForResult({ totalCount: 1 }),
      browser.refresh()
    ])

    const supportabilityMetrics = metricsHarvests[0].request.body.sm

    // Check that NO drift was detected
    const driftMetric = supportabilityMetrics.find(sm =>
      sm.params.name === 'Generic/TimeKeeper/ClockDrift/Detected'
    )

    expect(driftMetric).toBeUndefined() // Should NOT detect drift from server offset
  })
})
