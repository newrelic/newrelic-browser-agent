import { testAjaxEventsRequest, testErrorsRequest, testInsRequest, testInteractionEventsRequest, testLogsRequest, testMFEAjaxEventsRequest, testMFEErrorsRequest, testMFEInsRequest, testRumRequest } from '../../../../tools/testing-server/utils/expect-tests'
import { rumFlags } from '../../../../tools/testing-server/constants'
import { LOGGING_MODE } from '../../../../src/features/logging/constants'
import { SUPPORTS_REGISTERED_ENTITIES } from '../../../../src/common/constants/agent-constants'
import { FEATURE_NAMES } from '../../../../src/loaders/features/features'

/**
 * Shared test execution logic for registered entity feature flag tests
 */
export async function runRegisteredEntityTest (testSet) {
  const [rumCapture, mfeErrorsCapture, mfeInsightsCapture, regularErrorsCapture, regularInsightsCapture, logsCapture, mfeAjaxCapture, regularAjaxCapture, interactionsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
    { test: testRumRequest },
    { test: testMFEErrorsRequest },
    { test: testMFEInsRequest },
    { test: testErrorsRequest },
    { test: testInsRequest },
    { test: testLogsRequest },
    { test: testMFEAjaxEventsRequest },
    { test: testAjaxEventsRequest },
    { test: testInteractionEventsRequest }
  ])

  // Set log level to 5 (TRACE) before running tests
  await browser.testHandle.scheduleReply('bamServer', {
    test: testRumRequest,
    body: JSON.stringify(rumFlags({ log: LOGGING_MODE.TRACE, logapi: LOGGING_MODE.TRACE }))
  })

  await browser.url(await browser.testHandle.assetURL('register-api.html', { loader: 'spa', init: { feature_flags: testSet } }))
    .then(() => browser.waitForAgentLoad())

  await browser.execute(function () {
    // each payload in this test is decorated with data that matches its appId for ease of testing
    window.newrelic.setCustomAttribute('customAttr', '42') // container agent
    window.agent1.setCustomAttribute('customAttr', '1') // micro agent (agent1)
    window.agent2.setCustomAttribute('customAttr', '2') // micro agent (agent2)

    // each payload in this test is decorated with data that matches its appId for ease of testing
    window.newrelic.noticeError('42')
    window.agent1.noticeError('1')
    window.agent2.noticeError('2')

    // each payload in this test is decorated with data that matches its appId for ease of testing
    window.newrelic.addPageAction('42', { val: 42 })
    window.agent1.addPageAction('1', { val: 1 })
    window.agent2.addPageAction('2', { val: 2 })

    // each payload in this test is decorated with data that matches its appId for ease of testing
    window.newrelic.log('42')
    window.agent1.log('1', { level: 'error' })
    window.agent2.log('2', { level: 'error' })

    // post load ajax calls (standalone)
    const XHR_POST = new XMLHttpRequest()
    XHR_POST.open('GET', '/mock/post/xhr')
    XHR_POST.send()

    fetch('/mock/post/fetch')
    // each payload in this test is decorated with data that matches its appId for ease of testing
    window.newrelic.recordCustomEvent('CustomEvent', { val: 42 })
    window.agent1.recordCustomEvent('CustomEvent', { val: 1 })
    window.agent2.recordCustomEvent('CustomEvent', { val: 2 })

    // each payload in this test is decorated with data that matches its appId for ease of testing
    window.newrelic.measure('42')
    window.agent1.measure('1')
    window.agent2.measure('2')
  })

  const [rumHarvests, errorsHarvests, insightsHarvests, logsHarvest, ajaxHarvest, spaHarvest] = await Promise.all([
    rumCapture.waitForResult({ timeout: 10000 }),
    ((testSet.includes('register') && SUPPORTS_REGISTERED_ENTITIES[FEATURE_NAMES.jserrors]) ? mfeErrorsCapture : regularErrorsCapture).waitForResult({ timeout: 10000 }),
    ((testSet.includes('register') && SUPPORTS_REGISTERED_ENTITIES[FEATURE_NAMES.genericEvents]) ? mfeInsightsCapture : regularInsightsCapture).waitForResult({ timeout: 10000 }),
    logsCapture.waitForResult({ timeout: 10000 }),
    ((testSet.includes('register') && SUPPORTS_REGISTERED_ENTITIES[FEATURE_NAMES.ajax]) ? mfeAjaxCapture : regularAjaxCapture).waitForResult({ timeout: 10000 }),
    interactionsCapture.waitForResult({ timeout: 10000 })
  ])

  const containerAgentEntityGuid = await browser.execute(function () {
    return Object.values(newrelic.initializedAgents)[0].runtime.appMetadata.agents[0].entityGuid
  })

  // Track whether each agent's events have been validated exactly once.
  // Used to ensure proper scoping: each agent (container=42, agent1=1, agent2=2)
  // should generate distinct events when proper flags are enabled.
  const tests = {
    42: { rum: false, err: false, pa: false, log: false, rce: false, measure: false }, // container agent defaults to appId 42
    1: { err: false, pa: false, log: false, rce: false, measure: false }, // agent1 instance
    2: { err: false, pa: false, log: false, rce: false, measure: false } // agent2 instance
  }

  expect(rumHarvests).toHaveLength(1)
  expect(errorsHarvests.length).toBeGreaterThanOrEqual(1)
  expect(insightsHarvests.length).toBeGreaterThanOrEqual(1)
  expect(logsHarvest.length).toBeGreaterThanOrEqual(1)
  expect(ajaxHarvest.length).toBeGreaterThanOrEqual(1)
  expect(spaHarvest.length).toBeGreaterThanOrEqual(1)

  // each type of test should check that:
  // each payload exists once per appId
  // each payload should have internal attributes matching it to the right appId
  rumHarvests.forEach(({ request: { query, body } }) => {
    expect(ranOnce(query.a, 'rum')).toEqual(true)
  })

  // Helper to find all ajax requests with /mock paths
  const getAllMockRequests = (payload) => {
    const results = []
    const collectRequests = (items) => {
      if (!Array.isArray(items)) return
      for (const req of items) {
        if (req.type === 'interaction' && Array.isArray(req.children)) {
          collectRequests(req.children)
          continue
        }
        if (req.type === 'ajax' && req.path?.startsWith('/mock')) {
          results.push(req)
        }
      }
    }
    payload.forEach(item => collectRequests(item.request?.body))
    return results
  }

  // Helper to get attribute value from children array (same as auto-detection test)
  const getAttr = (event, key) => {
    const child = event.children?.find(c => c.key === key)
    return child?.value
  }

  const allMockAjax = getAllMockRequests(ajaxHarvest)
  const allMockSpa = getAllMockRequests(spaHarvest)

  const containerAjax = allMockAjax.filter(r => !getAttr(r, 'source.id'))
  const mfe1Ajax = allMockAjax.filter(r => getAttr(r, 'source.id') === '1')
  const mfe2Ajax = allMockAjax.filter(r => getAttr(r, 'source.id') === '2')

  const containerSpa = allMockSpa.filter(r => !getAttr(r, 'source.id'))
  const mfe1Spa = allMockSpa.filter(r => getAttr(r, 'source.id') === '1')
  const mfe2Spa = allMockSpa.filter(r => getAttr(r, 'source.id') === '2')

  // 1 pre xhr, 1 pre fetch, 1 post xhr, 1 post fetch = 4 total requests made
  const expectAjaxMFEdata = testSet.includes('register') && SUPPORTS_REGISTERED_ENTITIES[FEATURE_NAMES.ajax]

  // When MFE is disabled: container captures all requests
  // When MFE is enabled: MFE1 and MFE2 each capture all requests (auto-detected via stack trace)
  if (!expectAjaxMFEdata) {
    expect(containerSpa.map(r => r.path)).toEqual(expect.arrayContaining([
      '/mock/pre/xhr',
      '/mock/pre/fetch'
    ]))
    expect(containerAjax.map(r => r.path)).toEqual(expect.arrayContaining([
      '/mock/post/xhr',
      '/mock/post/fetch'
    ]))
    expect(mfe1Ajax.length).toEqual(0)
    expect(mfe2Ajax.length).toEqual(0)
  } else {
    // With MFE enabled, both MFE1 and MFE2 auto-detect all requests
    expect(containerSpa.length).toEqual(0)
    expect(containerAjax.length).toEqual(0)

    expect(mfe1Ajax.map(r => r.path).sort()).toEqual([
      '/mock/post/fetch',
      '/mock/post/xhr',
      '/mock/pre/fetch',
      '/mock/pre/xhr'
    ].sort())

    expect(mfe2Ajax.map(r => r.path).sort()).toEqual([
      '/mock/post/fetch',
      '/mock/post/xhr',
      '/mock/pre/fetch',
      '/mock/pre/xhr'
    ])
  }

  expect(mfe1Spa.length).toEqual(0) // MFE ajax calls are not scoped and harvested in SPA
  expect(mfe2Spa.length).toEqual(0) // MFE ajax calls are not scoped and harvested in SPA

  errorsHarvests.forEach(({ request: { query, body } }) => {
    const data = body.err
    data.forEach((err, idx) => {
      // MFEs use source.id attribute; container agent uses appId from query string
      const id = err.custom['source.id'] || query.a
      if (Number(id) !== 42 && testSet.includes('register')) {
        // MFE-scoped errors: validate source attributes and parent relationship
        expect(err.custom['source.name']).toEqual('agent' + id)
        expect(err.custom['source.type']).toEqual('MFE')
        expect(err.custom['parent.id']).toEqual(containerAgentEntityGuid)
      } else {
        if (testSet.includes('register')) {
          expect(err.custom.appId).toEqual(42)
        }
      }
      countRuns(id, 'err')
      if (testSet.includes('register')) {
        expect(ranOnce(id, 'err')).toEqual(true)
        expect(Number(id)).toEqual(Number(err.params.message))
      } else {
        expect(tests[id].err).toEqual(idx + 1) // each error gets lumped together under the same id without the feature flags
        expect(Number(id)).toEqual(42)
      }
    })
  })

  insightsHarvests.forEach(({ request: { query, body } }) => {
    const data = body.ins
    data.forEach((ins, idx) => {
      if (ins.eventType === 'PageAction' || ins.eventType === 'CustomEvent' || (ins.eventType === 'BrowserPerformance' && ins.entryType === 'measure')) {
        // MFEs use source.id attribute; container agent uses appId from query string
        const id = ins['source.id'] || query.a
        if (Number(id) !== 42 && testSet.includes('register')) {
          // MFE-scoped events: validate source attributes and parent relationship
          expect(ins['source.name']).toEqual('agent' + id)
          expect(ins['source.type']).toEqual('MFE')
          expect(ins['parent.id']).toEqual(containerAgentEntityGuid)
        } else {
          if (testSet.includes('register')) {
            expect(ins.appId).toEqual(42)
          }
        }

        let countType
        if (ins.eventType === 'PageAction') {
          countType = 'pa'
        } else if (ins.eventType === 'CustomEvent') {
          countType = 'rce'
        } else if (ins.eventType === 'BrowserPerformance') {
          countType = 'measure'
        }
        countRuns(id, countType)
      }
    })
  })

  if (!testSet.includes('register')) {
    expect(tests['42'].pa).toEqual(1)
    expect(tests['42'].rce).toEqual(1)
    expect(tests['42'].measure).toEqual(1)
  } else {
    expect(ranOnce('42', 'pa')).toEqual(true)
    expect(ranOnce('42', 'rce')).toEqual(true)
    expect(ranOnce('42', 'measure')).toEqual(true)
    expect(ranOnce('1', 'pa')).toEqual(true)
    expect(ranOnce('1', 'rce')).toEqual(true)
    expect(ranOnce('1', 'measure')).toEqual(true)
    expect(ranOnce('2', 'pa')).toEqual(true)
    expect(ranOnce('2', 'rce')).toEqual(true)
    expect(ranOnce('2', 'measure')).toEqual(true)
  }

  logsHarvest.forEach(({ request: { query, body } }) => {
    const data = JSON.parse(body)[0]
    data.logs.forEach(log => {
      // MFEs use source.id attribute; container agent uses appId. Default to 42 if source.id is not present.
      const id = log.attributes['source.id'] || 42
      if (Number(id) !== 42 && testSet.includes('register')) {
        // MFE-scoped logs: validate source attributes and parent relationship
        expect(log.attributes['source.name']).toEqual('agent' + id)
        expect(log.attributes['source.type']).toEqual('MFE')
        expect(log.attributes['parent.id']).toEqual(containerAgentEntityGuid)
        expect(ranOnce(id, 'log')).toEqual(true)
        expect(Number(id)).toEqual(Number(log.message))
      } else {
        // Container logs: when 'register' is enabled, all logs may still fall back to the container
        // (id=42) but with varying messages ('42', '1', '2'). Don't validate message content.
        if (testSet.includes('register')) {
          expect(log.attributes.appId).toEqual(42)
        }
        countRuns(id, 'log')
      }
    })
  })

  function ranOnce (appId, type) {
    if (tests[appId][type] > 1) return false
    countRuns(appId, type)
    return true
  }

  function countRuns (appId, type) {
    tests[appId][type] ??= 0
    tests[appId][type]++
  }
}
