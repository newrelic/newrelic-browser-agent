import { testInsRequest, testRumRequest } from '../../../tools/testing-server/utils/expect-tests'

describe('observation_mode', () => {
  const HARVEST_TIMEOUT = 10000

  const observationModeConfig = {
    init: {
      observation_mode: { enabled: true },
      harvest: { interval: 2 }
    }
  }

  let rumCapture, insCapture

  beforeEach(async () => {
    ;[rumCapture, insCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testRumRequest },
      { test: testInsRequest }
    ])
  })

  afterEach(async () => {
    await browser.destroyAgentSession()
  })

  it('activates the agent without ever sending the RUM call, even with no license key', async () => {
    await browser.url(await browser.testHandle.assetURL('no-license-key-before.html', observationModeConfig))
      .then(() => browser.waitForAgentLoad()) // this would time out if activatedFeatures never gets set

    const activatedFeatures = await browser.execute(function () {
      return Object.values(newrelic.initializedAgents)[0].runtime.activatedFeatures
    })
    expect(activatedFeatures).toMatchObject({ err: 1, ins: 1, spa: 1, st: 1 })

    const rumHarvests = await rumCapture.waitForResult({ timeout: HARVEST_TIMEOUT })
    expect(rumHarvests.length).toEqual(0)
  })

  it('activates the agent without ever sending the RUM call, even with no app id', async () => {
    await browser.url(await browser.testHandle.assetURL('no-app-id-before.html', observationModeConfig))
      .then(() => browser.waitForAgentLoad())

    const activatedFeatures = await browser.execute(function () {
      return Object.values(newrelic.initializedAgents)[0].runtime.activatedFeatures
    })
    expect(activatedFeatures).toMatchObject({ err: 1, ins: 1, spa: 1, st: 1 })
  })

  it('never sends page action data to the ins endpoint', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented.html', observationModeConfig))
      .then(() => browser.waitForAgentLoad())

    const [insHarvests] = await Promise.all([
      insCapture.waitForResult({ timeout: HARVEST_TIMEOUT }),
      browser.execute(function () {
        newrelic.addPageAction('observationModeTest')
      })
    ])

    expect(insHarvests.length).toEqual(0)
  })

  it('still runs the beforeHarvest hook so data can be inspected, even though nothing is sent', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented.html', observationModeConfig))
      .then(() => browser.waitForAgentLoad())

    await browser.execute(function () {
      window.observedActionNames = []
      window.observedFeatures = []
      newrelic.beforeHarvest(function ({ feature, payload }) {
        window.observedFeatures.push(feature)
        ;(payload?.body?.ins || []).forEach(function (action) {
          window.observedActionNames.push(action.actionName)
        })
      })
      newrelic.addPageAction('observationModeInspected')
    })

    await browser.waitUntil(async () => {
      const observedActionNames = await browser.execute(function () { return window.observedActionNames })
      return observedActionNames.includes('observationModeInspected')
    }, { timeout: HARVEST_TIMEOUT, timeoutMsg: 'beforeHarvest never observed the page action payload' })

    const observedFeatures = await browser.execute(function () { return window.observedFeatures })
    expect(observedFeatures).toContain('generic_events')
  })
})
