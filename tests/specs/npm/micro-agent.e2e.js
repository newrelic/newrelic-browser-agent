/* globals MicroAgent */

import { testErrorsRequest, testInsRequest, testLogsRequest, testRumRequest } from '../../../tools/testing-server/utils/expect-tests'
import { LOGGING_MODE } from '../../../src/features/logging/constants'

describe('micro-agent', () => {
  it('all agents correctly shuts down logging if first agent receives LOGGING_MODE.OFF', async () => {
    await browser.enableLogging({
      logMode: LOGGING_MODE.OFF,
      secondLogMode: LOGGING_MODE.DEBUG
    })

    const [rumCapture, errorsCapture, insightsCapture, logsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testRumRequest },
      { test: testErrorsRequest },
      { test: testInsRequest },
      { test: testLogsRequest }
    ])
    // Note: this tests when micro-agents are created around the same time
    await browser.url(await browser.testHandle.assetURL('test-builds/browser-agent-wrapper/micro-agent.html'))
      .then(() => browser.waitForAgentLoad())

    const result = await browser.execute(function () {
      // each payload in this test is decorated with data that matches its appId for ease of testing
      window.agent1.noticeError('1')
      window.agent2.noticeError('2')

      // each payload in this test is decorated with data that matches its appId for ease of testing
      window.agent1.addPageAction('1', { val: 1 })
      window.agent2.addPageAction('2', { val: 2 })

      // each payload in this test is decorated with data that matches its appId for ease of testing
      window.agent1.log('1')
      window.agent2.log('2')

      return {
        agent1: {
          loggingMode: window.agent1.features.logging.loggingMode
        },
        agent2: {
          loggingMode: window.agent2.features.logging.loggingMode
        }
      }
    })
    const [rumHarvests, errorsHarvests, insightsHarvests, logsHarvest] = await Promise.all([
      rumCapture.waitForResult({ totalCount: 2, timeout: 10000 }),
      errorsCapture.waitForResult({ totalCount: 2, timeout: 10000 }),
      insightsCapture.waitForResult({ totalCount: 2, timeout: 10000 }),
      logsCapture.waitForResult({ totalCount: 2, timeout: 10000 })
    ])

    // these props will get set to true once a test has matched it
    // if it gets tried again, the test will fail, since these should all
    // only have one distinct matching payload
    const tests = {
      1: { rum: false, err: false, pa: false, log: false },
      2: { rum: false, err: false, pa: false, log: false }
    }
    const ranOnce = createRanOnceCheck(tests)

    // each type of test should check that:
    // each payload exists once per appId
    // each payload should have internal attributes matching it to the right appId
    rumHarvests.forEach(({ request: { query, body } }) => {
      expect(ranOnce(query.a, 'rum')).toEqual(true)
      expect(payloadMatchesAppId(query.a, body.ja.customAttr)).toEqual(true)
    })

    errorsHarvests.forEach(({ request: { query, body } }) => {
      expect(body.err.length).toEqual(1) // ensure only one error per appId
      expect(ranOnce(query.a, 'err')).toEqual(true)
      expect(payloadMatchesAppId(query.a, body.err[0].params.message)).toEqual(true)
    })

    insightsHarvests.forEach(({ request: { query, body } }) => {
      expect(body.ins.length).toEqual(1) // ensure only one page action per appId
      expect(ranOnce(query.a, 'pa')).toEqual(true)
      const data = body.ins[0]
      expect(payloadMatchesAppId(query.a, data.val, data.actionName, data.customAttr)).toEqual(true)
    })

    expect(logsHarvest.length).toEqual(0)

    // check to ensure both agents have the same logging mode (shared session)
    expect(result.agent1.loggingMode).toEqual({ auto: LOGGING_MODE.OFF, api: LOGGING_MODE.OFF })
    expect(result.agent2.loggingMode).toEqual(result.agent1.loggingMode)
    expect(tests[1]).toEqual({ rum: true, err: true, pa: true, log: false })
    expect(tests[2]).toEqual({ rum: true, err: true, pa: true, log: false })
  })

  it('Smoke Test - Can send distinct payloads of all relevant data types to 2 distinct app IDs', async () => {
    await browser.enableLogging({
      logMode: LOGGING_MODE.INFO,
      secondLogMode: LOGGING_MODE.DEBUG
    })

    const [rumCapture, errorsCapture, insightsCapture, logsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testRumRequest },
      { test: testErrorsRequest },
      { test: testInsRequest },
      { test: testLogsRequest }
    ])
    // Note: this tests when micro-agents are created around the same time
    await browser.url(await browser.testHandle.assetURL('test-builds/browser-agent-wrapper/micro-agent.html'))
      .then(() => browser.waitForAgentLoad())

    const result = await browser.execute(function () {
      // each payload in this test is decorated with data that matches its appId for ease of testing
      window.agent1.noticeError('1')
      window.agent2.noticeError('2')

      // each payload in this test is decorated with data that matches its appId for ease of testing
      window.agent1.addPageAction('1', { val: 1 })
      window.agent2.addPageAction('2', { val: 2 })

      // each payload in this test is decorated with data that matches its appId for ease of testing
      window.agent1.log('1')
      window.agent2.log('2')

      return {
        agent1: {
          loggingMode: window.agent1.features.logging.loggingMode
        },
        agent2: {
          loggingMode: window.agent2.features.logging.loggingMode
        }
      }
    })
    const [rumHarvests, errorsHarvests, insightsHarvests, logsHarvest] = await Promise.all([
      rumCapture.waitForResult({ totalCount: 2, timeout: 10000 }),
      errorsCapture.waitForResult({ totalCount: 2, timeout: 10000 }),
      insightsCapture.waitForResult({ totalCount: 2, timeout: 10000 }),
      logsCapture.waitForResult({ totalCount: 2, timeout: 10000 })
    ])

    // these props will get set to true once a test has matched it
    // if it gets tried again, the test will fail, since these should all
    // only have one distinct matching payload
    const tests = {
      1: { rum: false, err: false, pa: false, log: false },
      2: { rum: false, err: false, pa: false, log: false }
    }
    const ranOnce = createRanOnceCheck(tests)

    // each type of test should check that:
    // each payload exists once per appId
    // each payload should have internal attributes matching it to the right appId
    rumHarvests.forEach(({ request: { query, body } }) => {
      expect(ranOnce(query.a, 'rum')).toEqual(true)
      expect(payloadMatchesAppId(query.a, body.ja.customAttr)).toEqual(true)
    })

    errorsHarvests.forEach(({ request: { query, body } }) => {
      expect(body.err.length).toEqual(1) // ensure only one error per appId
      expect(ranOnce(query.a, 'err')).toEqual(true)
      expect(payloadMatchesAppId(query.a, body.err[0].params.message)).toEqual(true)
    })

    insightsHarvests.forEach(({ request: { query, body } }) => {
      expect(body.ins.length).toEqual(1) // ensure only one page action per appId
      expect(ranOnce(query.a, 'pa')).toEqual(true)
      const data = body.ins[0]
      expect(payloadMatchesAppId(query.a, data.val, data.actionName, data.customAttr)).toEqual(true)
    })

    // check to ensure both agents have the same logging mode (shared session)
    expect(result.agent1.loggingMode).toEqual({ auto: LOGGING_MODE.INFO, api: LOGGING_MODE.INFO })
    expect(result.agent2.loggingMode).toEqual(result.agent1.loggingMode)
    expect(logsHarvest.length).toEqual(2)

    logsHarvest.forEach(({ request: { query, body } }) => {
      const data = JSON.parse(body)[0]
      expect(data.logs.length).toEqual(1) // ensure only one log per appId
      expect(ranOnce(data.common.attributes.appId, 'log')).toEqual(true)
      expect(payloadMatchesAppId(data.common.attributes.appId, data.logs[0].message)).toEqual(true)
    })
  })

  // https://new-relic.atlassian.net/browse/NR-453240 <-- issue with rollup seen here around dynamic imports
  it('Smoke Test - Can send distinct payloads of all relevant data types to 2 distinct app IDs - ROLL UP BUNDLE', async () => {
    await browser.enableLogging({
      logMode: LOGGING_MODE.INFO,
      secondLogMode: LOGGING_MODE.DEBUG
    })

    const [rumCapture, errorsCapture, insightsCapture, logsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testRumRequest },
      { test: testErrorsRequest },
      { test: testInsRequest },
      { test: testLogsRequest }
    ])

    // Note: this tests when micro-agent creation is staggered
    await browser.url(await browser.testHandle.assetURL('test-builds/rollup-micro-agent/index.html'))
      .then(() => browser.waitForAgentLoad())

    const result = await browser.execute(function () {
      // each payload in this test is decorated with data that matches its appId for ease of testing
      window.agent1.noticeError('1')
      window.agent2.noticeError('2')

      // each payload in this test is decorated with data that matches its appId for ease of testing
      window.agent1.addPageAction('1', { val: 1 })
      window.agent2.addPageAction('2', { val: 2 })

      // each payload in this test is decorated with data that matches its appId for ease of testing
      window.agent1.log('1')
      window.agent2.log('2')

      return {
        agent1: {
          loggingMode: window.agent1.features.logging.loggingMode
        },
        agent2: {
          loggingMode: window.agent2.features.logging.loggingMode
        }
      }
    })

    const [rumHarvests, errorsHarvests, insightsHarvests, logsHarvest] = await Promise.all([
      rumCapture.waitForResult({ totalCount: 2, timeout: 10000 }),
      errorsCapture.waitForResult({ totalCount: 2, timeout: 10000 }),
      insightsCapture.waitForResult({ totalCount: 2, timeout: 10000 }),
      logsCapture.waitForResult({ totalCount: 2, timeout: 10000 })
    ])

    // these props will get set to true once a test has matched it
    // if it gets tried again, the test will fail, since these should all
    // only have one distinct matching payload
    const tests = {
      1: { rum: false, err: false, pa: false, log: false },
      2: { rum: false, err: false, pa: false, log: false }
    }
    const ranOnce = createRanOnceCheck(tests)

    // each type of test should check that:
    // each payload exists once per appId
    // each payload should have internal attributes matching it to the right appId
    rumHarvests.forEach(({ request: { query, body } }) => {
      expect(ranOnce(query.a, 'rum')).toEqual(true)
      expect(payloadMatchesAppId(query.a, body.ja.customAttr)).toEqual(true)
    })

    errorsHarvests.forEach(({ request: { query, body } }) => {
      expect(body.err.length).toEqual(1) // ensure only one error per appId
      expect(ranOnce(query.a, 'err')).toEqual(true)
      expect(payloadMatchesAppId(query.a, body.err[0].params.message)).toEqual(true)
    })

    insightsHarvests.forEach(({ request: { query, body } }) => {
      expect(body.ins.length).toEqual(1) // ensure only one page action per appId
      expect(ranOnce(query.a, 'pa')).toEqual(true)
      const data = body.ins[0]
      expect(payloadMatchesAppId(query.a, data.val, data.actionName, data.customAttr)).toEqual(true)
    })

    // check to ensure both agents have the same logging mode (shared session)
    expect(result.agent1.loggingMode).toEqual({ auto: LOGGING_MODE.INFO, api: LOGGING_MODE.INFO })
    expect(result.agent2.loggingMode).toEqual(result.agent1.loggingMode)

    expect(logsHarvest.length).toEqual(2)
    logsHarvest.forEach(({ request: { query, body } }) => {
      const data = JSON.parse(body)[0]
      expect(data.logs.length).toEqual(1) // ensure only one log per appId
      expect(ranOnce(data.common.attributes.appId, 'log')).toEqual(true)
      expect(payloadMatchesAppId(data.common.attributes.appId, data.logs[0].message)).toEqual(true)
    })
  })

  it('returns null on top-level spa api interaction call', async () => {
    await browser.url(await browser.testHandle.assetURL('test-builds/browser-agent-wrapper/micro-agent.html'))

    const ixn = await browser.execute(function () {
      var opts = {
        info: NREUM.info,
        init: NREUM.init
      }
      window.agent1 = new MicroAgent({ ...opts, info: { ...opts.info, applicationID: 1 } })

      // top-level interaction call should return null since there is no non-micro agent to respond to the api call
      return window.newrelic.interaction()
    })

    expect(ixn).toBeNull()
  })

  function payloadMatchesAppId (appId, ...props) {
    // each payload in this test is decorated with data that matches its appId for ease of testing
    return props.every(p => Number(appId) === Number(p))
  }

  function createRanOnceCheck (tests) {
    return (appId, type) => {
      if (tests[appId][type]) return false
      tests[appId][type] = true
      return true
    }
  }
})
