import { testErrorsRequest, testRumRequest, testMetricsRequest } from '../../../tools/testing-server/utils/expect-tests'
import { rumFlags } from '../../../tools/testing-server/constants'
import { LOGGING_MODE } from '../../../src/features/logging/constants'

describe('harvest endpoint cannot be redirected at runtime', () => {
  let errorsCapture
  let metricsCapture
  let attackerUrl

  beforeEach(async () => {
    [errorsCapture, metricsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [{ test: testErrorsRequest }, { test: testMetricsRequest }])
    // Pin auto-captured logging so the harvest under test is not affected by the cycling sample rate
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify(rumFlags({ log: LOGGING_MODE.INFO, logapi: LOGGING_MODE.INFO }))
    })
    const { host, port } = browser.testHandle.assetServerConfig
    attackerUrl = `${host}:${port}/attacker`

    await browser.url(await browser.testHandle.assetURL('instrumented.html'))
    await browser.waitForAgentLoad()
  })

  const attackerRequests = () => browser.execute(function (needle) {
    return performance.getEntriesByType('resource').filter(function (entry) { return entry.name.indexOf(needle) > -1 }).length
  }, attackerUrl)

  it('ignores writes to the agent\'s beacon settings and still reports to the configured endpoint', async () => {
    const outcome = await browser.execute(function (attacker) {
      const agent = Object.values(NREUM.initializedAgents)[0]
      const attempts = [
        function () { agent.info.errorBeacon = attacker },
        function () { agent.info.beacon = attacker },
        function () { agent.info.licenseKey = 'attacker-license' },
        function () { agent.info.applicationID = '999999' },
        function () { Object.defineProperty(agent.info, 'licenseKey', { value: 'attacker-license' }) },
        function () { Object.defineProperty(agent.info, 'applicationID', { value: '999999' }) },
        function () { agent.init.proxy.beacon = attacker },
        function () { agent.init.proxy.assets = 'http://' + attacker },
        function () { Object.defineProperty(agent.info, 'errorBeacon', { value: attacker }) },
        function () { Object.defineProperty(agent.init.proxy, 'beacon', { value: attacker }) },
        function () { Object.defineProperty(agent.init.proxy, 'assets', { value: 'http://' + attacker }) }
      ]
      attempts.forEach(function (attempt) { try { attempt() } catch (err) { /* rejected, which is the expected outcome */ } })
      return { licenseKey: agent.info.licenseKey, applicationID: agent.info.applicationID, errorBeacon: agent.info.errorBeacon, proxyBeacon: agent.init.proxy.beacon, proxyAssets: agent.init.proxy.assets }
    }, attackerUrl)

    expect(outcome.errorBeacon).not.toContain('attacker')
    expect(outcome.licenseKey).not.toContain('attacker')
    expect(outcome.applicationID).not.toEqual('999999')
    // unset values come back from browser.execute as null, so assert they are still empty rather than undefined
    expect(outcome.proxyBeacon).toBeFalsy()
    expect(outcome.proxyAssets).toBeFalsy()

    const [errorHarvests] = await Promise.all([
      errorsCapture.waitForResult({ totalCount: 1 }),
      browser.execute(function () { newrelic.noticeError(new Error('endpoint lock')) })
    ])

    expect(errorHarvests.length).toBeGreaterThanOrEqual(1)
    expect(await attackerRequests()).toEqual(0)
  })

  it('reports attempts to change locked config as supportability metrics', async () => {
    await browser.execute(function () {
      const agent = Object.values(NREUM.initializedAgents)[0]
      agent.info.licenseKey = 'attacker-license'
      agent.info.errorBeacon = 'attacker.example.com'
    })

    const metricsHarvests = await metricsCapture.waitForResult({ timeout: 30000 })
    const names = metricsHarvests.flatMap(harvest => harvest.request.body.sm || []).map(sm => sm.params.name)

    expect(names).toContain('Config/Locked/info.licenseKey/Changed')
    expect(names).toContain('Config/Locked/info.errorBeacon/Changed')
  })

  it('does not harvest at all if the config objects are replaced', async () => {
    await browser.execute(function (attacker) {
      const agent = Object.values(NREUM.initializedAgents)[0]
      agent.init = Object.assign({}, agent.init, { proxy: { beacon: attacker } })
      agent.info = Object.assign({}, agent.info, { errorBeacon: attacker })
    }, attackerUrl)

    const errorHarvests = await Promise.all([
      errorsCapture.waitForResult({ timeout: 10000 }),
      browser.execute(function () { newrelic.noticeError(new Error('endpoint lock')) })
    ]).then(([harvests]) => harvests)

    expect(errorHarvests).toEqual([])
    expect(await attackerRequests()).toEqual(0)
  })
})
