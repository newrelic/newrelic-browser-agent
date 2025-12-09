/* globals RegisteredEntity */

import { testMFEErrorsRequest, testMFEInsRequest, testLogsRequest, testRumRequest, testErrorsRequest, testInsRequest, testMFEAjaxEventsRequest, testAjaxEventsRequest, testInteractionEventsRequest } from '../../../tools/testing-server/utils/expect-tests'

let rumCapture, mfeErrorsCapture, mfeInsightsCapture, regularErrorsCapture, regularInsightsCapture, logsCapture, mfeAjaxCapture, regularAjaxCapture, interactionsCapture
describe('registered-entity', () => {
  beforeEach(async () => {
    [rumCapture, mfeErrorsCapture, mfeInsightsCapture, regularErrorsCapture, regularInsightsCapture, logsCapture, mfeAjaxCapture, regularAjaxCapture, interactionsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
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
  })

  const featureFlags = [
    [],
    ['register'],
    ['register', 'register.jserrors'],
    ['register', 'register.generic_events'],
    ['register', 'register.ajax'],
    ['register', 'register.jserrors', 'register.generic_events'],
    ['register', 'register.jserrors', 'register.ajax'],
    ['register', 'register.generic_events', 'register.ajax'],
    ['register', 'register.jserrors', 'register.generic_events', 'register.ajax'],
    ['register.jserrors', 'register.generic_events'],
    ['register.jserrors', 'register.ajax'],
    ['register.generic_events', 'register.ajax'],
    ['register.jserrors', 'register.generic_events', 'register.ajax'],
    ['register.jserrors'],
    ['register.generic_events'],
    ['register.ajax']
  ]
  featureFlags.forEach((testSet) => {
    it(`RegisteredEntity -- ${testSet.join(' | ') || 'no flags'}`, async () => {
      await browser.url(await browser.testHandle.assetURL('test-builds/browser-agent-wrapper/registered-entity.html', { loader: 'spa', init: { feature_flags: testSet } }))
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
        const CONTAINER_XHR_POST = new XMLHttpRequest()
        CONTAINER_XHR_POST.open('GET', '/mock/post/42')
        CONTAINER_XHR_POST.send()

        const MFE_XHR_1_POST = new XMLHttpRequest()
        MFE_XHR_1_POST.open('GET', '/mock/post/1')
        MFE_XHR_1_POST.setRequestHeader('newrelic-mfe-id', 1)
        MFE_XHR_1_POST.send()

        const MFE_XHR_2_POST = new XMLHttpRequest()
        MFE_XHR_2_POST.open('GET', '/mock/post/2')
        MFE_XHR_2_POST.setRequestHeader('newrelic-mfe-id', 2)
        MFE_XHR_2_POST.send()

        fetch('/mock/post/42')

        fetch('/mock/post/1', {
          headers: {
            'newrelic-mfe-id': 1
          }
        })

        fetch('/mock/post/2', {
          headers: {
            'newrelic-mfe-id': 2
          }
        })
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
        rumCapture.waitForResult({ totalCount: 1, timeout: 10000 }),
        ((testSet.includes('register') && testSet.includes('register.jserrors')) ? mfeErrorsCapture : regularErrorsCapture).waitForResult({ totalCount: 1, timeout: 10000 }),
        ((testSet.includes('register') && testSet.includes('register.generic_events')) ? mfeInsightsCapture : regularInsightsCapture).waitForResult({ totalCount: 1, timeout: 10000 }),
        logsCapture.waitForResult({ totalCount: 1, timeout: 10000 }),
        ((testSet.includes('register') && testSet.includes('register.ajax')) ? mfeAjaxCapture : regularAjaxCapture).waitForResult({ timeout: 10000 }),
        interactionsCapture.waitForResult({ totalCount: 1, timeout: 10000 })
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
      expect(ajaxHarvest.length).toBeGreaterThanOrEqual(1)
      expect(spaHarvest.length).toBeGreaterThanOrEqual(1)

      // each type of test should check that:
      // each payload exists once per appId
      // each payload should have internal attributes matching it to the right appId
      rumHarvests.forEach(({ request: { query, body } }) => {
        countRuns(query.a, 'rum')
        expect(ranOnce(query.a, 'rum')).toEqual(true)
      })

      /**
      * Finds AJAX requests in the payload that match specific path OR/AND/ANY criteria,
      * handling nested 'interaction' nodes recursively.
      * * @param {Array<Object>} payload - The root payload array (containing objects with 'request.body').
      * @param {string} targetPathEnd - The path segment to match (e.g., "/42").
      * @param {string} targetKey - The attribute key to look for (e.g., "appId", "mfe.id").
      * @param {number|string} targetValue - The value to match (e.g., 42, 1, 2).
      * @param {string} matchType - 'or', 'and', or 'any'.
      * @returns {Array<Object>} An array of matching AJAX request objects.
      */
      function findAjaxRequests (payload, targetPathEnd, targetKey, targetValue, matchType) {
        const results = []

        const collectRequests = (items) => {
          if (!Array.isArray(items)) return

          for (const req of items) {
            if (req.type === 'interaction' && Array.isArray(req.children)) {
              collectRequests(req.children)
              continue
            }

            if (req.type === 'ajax' && req.path?.startsWith('/mock')) {
              const pathMatches = req.path.endsWith(targetPathEnd)
              const childrenMatch = req.children?.some(child =>
                child.key === targetKey && child.value === targetValue
              )

              const isMatch = matchType === 'any' ||
                (matchType === 'or' && (pathMatches || childrenMatch)) ||
                (matchType === 'and' && pathMatches && childrenMatch)

              if (isMatch) results.push(req)
            }
          }
        }

        payload.forEach(item => collectRequests(item.request?.body))
        return results
      }

      const containerAjax = findAjaxRequests(ajaxHarvest, '/42', 'appId', 42, 'any')
      const mfe1Ajax = findAjaxRequests(ajaxHarvest, '/1', 'mfe.id', 1, 'and')
      const mfe2Ajax = findAjaxRequests(ajaxHarvest, '/2', 'mfe.id', 2, 'and')

      const containerSpa = findAjaxRequests(spaHarvest, '/42', 'appId', 42, 'any')
      const mfe1Spa = findAjaxRequests(spaHarvest, '/1', 'mfe.id', 1, 'and')
      const mfe2Spa = findAjaxRequests(spaHarvest, '/2', 'mfe.id', 2, 'and')

      // 3 pre, 3 post for each of fetch and xhr = 12 total requests made
      const expectMFEdata = testSet.includes('register') && testSet.includes('register.ajax')
      // container should capture all the request data, all the time
      expect(containerSpa.map(r => r.path)).toEqual(expect.arrayContaining([
        '/mock/pre/42',
        '/mock/pre/42',
        '/mock/pre/1',
        '/mock/pre/2',
        '/mock/pre/1',
        '/mock/pre/2'
      ]))
      expect(containerAjax.map(r => r.path)).toEqual(expect.arrayContaining([
        '/mock/post/42',
        '/mock/post/42',
        '/mock/post/1',
        '/mock/post/2',
        '/mock/post/1',
        '/mock/post/2'
      ]))
      expect(mfe1Spa.length).toEqual(0) // MFE ajax calls are not scoped and harvested in SPA
      expect(mfe2Spa.length).toEqual(0) // MFE ajax calls are not scoped and harvested in SPA
      expect(mfe1Ajax.length).toEqual(expectMFEdata ? 4 : 0) // should have detected the 4 targeted at mfe 1
      expect(mfe2Ajax.length).toEqual(expectMFEdata ? 4 : 0) // should have detected the 4 targeted at mfe 2
      mfe1Ajax.forEach(event => {
        expect(event.path.includes('/mock/pre/1') || event.path.includes('/mock/post/1')).toBeTrue()
        expect(event.children.find(child => child.key === 'mfe.id' && child.value === 1)).toBeDefined()
      })
      mfe2Ajax.forEach(event => {
        expect(event.path.includes('/mock/pre/2') || event.path.includes('/mock/post/2')).toBeTrue()
        expect(event.children.find(child => child.key === 'mfe.id' && child.value === 2)).toBeDefined()
      })

      errorsHarvests.forEach(({ request: { query, body } }) => {
        const data = body.err
        data.forEach((err, idx) => {
          const id = err.custom['source.id'] || query.a // MFEs use source.id, regular agents use appId
          if (Number(id) !== 42 && testSet.includes('register.jserrors')) {
            expect(err.custom['source.name']).toEqual('agent' + id)
            expect(err.custom['source.type']).toEqual('MFE')
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
            const id = ins['source.id'] || query.a // MFEs use source.id, regular agents use appId
            if (Number(id) !== 42 && testSet.includes('register.generic_events')) {
              expect(ins['source.name']).toEqual('agent' + id)
              expect(ins['source.type']).toEqual('MFE')
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
          const id = log.attributes['source.id'] || 42 // MFEs use source.id, regular agents supply entity guid so just force it to 42 here if source id is not present
          if (Number(id) !== 42 && testSet.includes('register')) {
            expect(log.attributes['source.name']).toEqual('agent' + id)
            expect(log.attributes['source.type']).toEqual('MFE')
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
      // id 1 already exists on test page
      window.agent3 = new RegisteredEntity({
        id: 1,
        name: 'agent3'
      })
      // should get data with name of "agent3"
      window.agent3.noticeError('3')
    })

    const errorsHarvests = await mfeErrorsCapture.waitForResult({ totalCount: 1 })

    // should get ALL data as "agent3" since it replaced the name of agent 1 of the same id
    errorsHarvests.forEach(({ request: { query, body } }) => {
      const data = body.err
      data.forEach(err => {
        expect(err.custom['source.name']).toEqual('agent2')
      })
    })
  })

  it('should allow a nested register', async () => {
    await browser.url(await browser.testHandle.assetURL('test-builds/browser-agent-wrapper/registered-entity.html', { init: { feature_flags: ['register', 'register.jserrors'] } }))

    await browser.execute(function () {
      window.agent1 = new RegisteredEntity({
        id: 1,
        name: 'agent1'
      })
      window.agent2 = window.agent1.register({
        id: 2,
        name: 'agent2'
      })
      window.agent3 = window.agent2.register({
        id: 3,
        name: 'agent3'
      })
      // should get data as "agent2"
      window.agent1.noticeError('1')
      window.agent2.noticeError('2')
      window.agent3.noticeError('3')
    })

    const errorsHarvests = await mfeErrorsCapture.waitForResult({ totalCount: 1 })

    const containerAgentEntityGuid = await browser.execute(function () {
      return Object.values(newrelic.initializedAgents)[0].runtime.appMetadata.agents[0].entityGuid
    })

    // should get ALL data as "agent2" since it replaced the name of agent 1 of the same id
    errorsHarvests.forEach(({ request: { query, body } }) => {
      const data = body.err
      data.forEach((err, idx) => {
        expect(err.custom['source.name']).toEqual('agent' + (idx + 1))
        if (idx === 0) expect(err.custom['parent.id']).toEqual(containerAgentEntityGuid) // first app should have container as its parent
        if (idx === 1) expect(err.custom['parent.id']).toEqual(1) // second app should have first app as its parent
        if (idx === 2) expect(err.custom['parent.id']).toEqual(2) // third app should have second app as its parent
      })
    })
  })
})
