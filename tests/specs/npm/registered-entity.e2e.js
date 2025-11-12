/* globals RegisteredEntity */

import { testMFEErrorsRequest, testMFEInsRequest, testLogsRequest, testRumRequest, testErrorsRequest, testInsRequest } from '../../../tools/testing-server/utils/expect-tests'

let rumCapture, mfeErrorsCapture, mfeInsightsCapture, regularErrorsCapture, regularInsightsCapture, logsCapture
describe('registered-entity', () => {
  beforeEach(async () => {
    [rumCapture, mfeErrorsCapture, mfeInsightsCapture, regularErrorsCapture, regularInsightsCapture, logsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testRumRequest },
      { test: testMFEErrorsRequest },
      { test: testMFEInsRequest },
      { test: testErrorsRequest },
      { test: testInsRequest },
      { test: testLogsRequest }
    ])
  })

  const featureFlags = [
    [],
    ['register'],
    ['register', 'register.jserrors'],
    ['register', 'register.generic_events'],
    ['register', 'register.jserrors', 'register.generic_events'],
    ['register.jserrors', 'register.generic_events'],
    ['register.jserrors'],
    ['register.generic_events']
  ]
  featureFlags.forEach((testSet) => {
    it(`RegisteredEntity -- ${testSet.join(' | ') || 'no flags'}`, async () => {
      await browser.url(await browser.testHandle.assetURL('test-builds/browser-agent-wrapper/registered-entity.html', { init: { feature_flags: testSet } }))

      await browser.execute(function () {
        window.agent1 = new RegisteredEntity({
          id: 1,
          name: 'agent1'
        })
        window.agent2 = new RegisteredEntity({
          id: 2,
          name: 'agent2'
        })

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

        // each payload in this test is decorated with data that matches its appId for ease of testing
        window.newrelic.recordCustomEvent('CustomEvent', { val: 42 })
        window.agent1.recordCustomEvent('CustomEvent', { val: 1 })
        window.agent2.recordCustomEvent('CustomEvent', { val: 2 })

        // each payload in this test is decorated with data that matches its appId for ease of testing
        window.newrelic.measure('42')
        window.agent1.measure('1')
        window.agent2.measure('2')
      })
      const [rumHarvests, errorsHarvests, insightsHarvests, logsHarvest] = await Promise.all([
        rumCapture.waitForResult({ totalCount: 1, timeout: 10000 }),
        ((testSet.includes('register') && testSet.includes('register.jserrors')) ? mfeErrorsCapture : regularErrorsCapture).waitForResult({ totalCount: 1, timeout: 10000 }),
        ((testSet.includes('register') && testSet.includes('register.generic_events')) ? mfeInsightsCapture : regularInsightsCapture).waitForResult({ totalCount: 1, timeout: 10000 }),
        logsCapture.waitForResult({ totalCount: 1, timeout: 10000 })
      ])

      const containerAgentEntityGuid = await browser.execute(function () {
        return Object.values(newrelic.initializedAgents)[0].runtime.appMetadata.agents[0].entityGuid
      })

      // these props will get set to true once a test has matched it
      // if it gets tried again, the test will fail, since these should all
      // only have one distinct matching payload
      const tests = {
        42: { rum: false, err: false, pa: false, log: false, rce: false, measure: false }, // container agent defaults to appId 42
        1: { err: false, pa: false, log: false, rce: false, measure: false }, // agent1 instance
        2: { err: false, pa: false, log: false, rce: false, measure: false } // agent2 instance
      }

      expect(rumHarvests).toHaveLength(1)
      expect(errorsHarvests.length).toBeGreaterThanOrEqual(1)
      expect(insightsHarvests.length).toBeGreaterThanOrEqual(1)
      expect(logsHarvest.length).toBeGreaterThanOrEqual(1)

      // each type of test should check that:
      // each payload exists once per appId
      // each payload should have internal attributes matching it to the right appId
      rumHarvests.forEach(({ request: { query, body } }) => {
        countRuns(query.a, 'rum')
        expect(ranOnce(query.a, 'rum')).toEqual(true)
      })

      errorsHarvests.forEach(({ request: { query, body } }) => {
        const data = body.err
        data.forEach((err, idx) => {
          const id = err.custom['mfe.id'] || query.a // MFEs use mfe.id, regular agents use appId
          if (Number(id) !== 42 && testSet.includes('register.jserrors')) {
            expect(err.custom['mfe.name']).toEqual('agent' + id)
            expect(err.custom.eventSource).toEqual('MicroFrontendBrowserAgent')
            expect(err.custom['parent.id']).toEqual(containerAgentEntityGuid)
          } else {
            if (testSet.includes('register') && testSet.includes('register.jserrors')) {
              expect(err.custom.appId).toEqual(42)
            }
          }
          countRuns(id, 'err')
          if (testSet.includes('register.jserrors')) {
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
            const id = ins['mfe.id'] || query.a // MFEs use mfe.id, regular agents use appId
            if (Number(id) !== 42 && testSet.includes('register.generic_events')) {
              expect(ins['mfe.name']).toEqual('agent' + id)
              expect(ins.eventSource).toEqual('MicroFrontendBrowserAgent')
              expect(ins['parent.id']).toEqual(containerAgentEntityGuid)
            } else {
              if (testSet.includes('register') && testSet.includes('register.generic_events')) {
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

      if (!testSet.includes('register.generic_events')) {
        // each item gets lumped together under the same id without the feature flags
        expect(tests['42'].pa).toEqual(testSet.includes('register') ? 3 : 1)
        expect(tests['42'].rce).toEqual(testSet.includes('register') ? 3 : 1)
        expect(tests['42'].measure).toEqual(testSet.includes('register') ? 3 : 1)
      } else {
        if (testSet.includes('register')) {
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
      }

      logsHarvest.forEach(({ request: { query, body } }) => {
        const data = JSON.parse(body)[0]
        data.logs.forEach(log => {
          const id = log.attributes['mfe.id'] || 42 // MFEs use mfe.id, regular agents supply entity guid so just force it to 42 here if mfe id is not present
          if (Number(id) !== 42 && testSet.includes('register')) {
            expect(log.attributes['mfe.name']).toEqual('agent' + id)
            expect(log.attributes.eventSource).toEqual('MicroFrontendBrowserAgent')
            expect(log.attributes['parent.id']).toEqual(containerAgentEntityGuid)
          } else {
            if (testSet.includes('register')) {
              expect(log.attributes.appId).toEqual(42)
            }
          }
          countRuns(id, 'log')
          expect(ranOnce(id, 'log')).toEqual(true)
          expect(Number(id)).toEqual(Number(log.message))
        })
      })

      function ranOnce (appId, type) {
        return tests[appId][type] === 1
      }

      function countRuns (appId, type) {
        tests[appId][type] ??= 0
        tests[appId][type]++
      }
    })
  })

  it('should use newest name of matching register', async () => {
    await browser.url(await browser.testHandle.assetURL('test-builds/browser-agent-wrapper/registered-entity.html', { init: { feature_flags: ['register', 'register.jserrors'] } }))

    await browser.execute(function () {
      window.agent1 = new RegisteredEntity({
        id: 1,
        name: 'agent1'
      })
      window.agent2 = new RegisteredEntity({
        id: 1,
        name: 'agent2'
      })
      // should get data as "agent2"
      window.agent1.noticeError('1')
      window.agent2.noticeError('2')
    })

    const errorsHarvests = await mfeErrorsCapture.waitForResult({ totalCount: 1 })

    // should get ALL data as "agent2" since it replaced the name of agent 1 of the same id
    errorsHarvests.forEach(({ request: { query, body } }) => {
      const data = body.err
      data.forEach(err => {
        expect(err.custom['mfe.name']).toEqual('agent2')
      })
    })
  })
})
