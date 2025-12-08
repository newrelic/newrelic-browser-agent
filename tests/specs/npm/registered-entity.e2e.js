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

  it('should still harvest scoped data after deregistering', async () => {
    await browser.url(await browser.testHandle.assetURL('test-builds/browser-agent-wrapper/registered-entity.html', { init: { feature_flags: ['register', 'register.jserrors'] } }))

    await browser.execute(function () {
      window.agent1 = new RegisteredEntity({
        id: 1,
        name: 'agent1'
      })
      window.agent1.noticeError('1')
      window.agent1.deregister()
    })

    const errorsHarvests = await mfeErrorsCapture.waitForResult({ totalCount: 1 })

    // should still get a harvest even tho the MFE was deregistered
    expect(errorsHarvests.length).toEqual(1)

    // should not get future data now that the MFE was deregistered
    await browser.execute(function () {
      window.agent1.noticeError('2')
    })

    const errorsHarvests2 = await mfeErrorsCapture.waitForResult({ timeout: 10000 })

    // should not have gotten more data
    expect(errorsHarvests2.length).toEqual(errorsHarvests.length)
  })

  it('should allow multiple registers with same id', async () => {
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
      data.forEach((err, idx) => {
        expect(Number(err.params.message)).toEqual(idx + 1)
        expect(err.custom['mfe.name']).toEqual('agent' + (idx + 1))
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
        expect(err.custom['mfe.name']).toEqual('agent' + (idx + 1))
        if (idx === 0) expect(err.custom['parent.id']).toEqual(containerAgentEntityGuid) // first app should have container as its parent
        if (idx === 1) expect(err.custom['parent.id']).toEqual(1) // second app should have first app as its parent
        if (idx === 2) expect(err.custom['parent.id']).toEqual(2) // third app should have second app as its parent
      })
    })
  })

  describe('MFE timing tracking', () => {
    it('should report MicroFrontEndTiming event with all timing attributes on deregister', async () => {
      await browser.url(await browser.testHandle.assetURL('test-builds/browser-agent-wrapper/registered-entity.html', {
        init: { feature_flags: ['register', 'register.generic_events'] }
      }))

      await browser.execute(function () {
        const mfe = new RegisteredEntity({ id: 1, name: 'test-mfe' })

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
      await browser.url(await browser.testHandle.assetURL('test-builds/browser-agent-wrapper/registered-entity.html', {
        init: { feature_flags: ['register', 'register.generic_events'] }
      }))

      await browser.execute(function () {
        window.mfe = new RegisteredEntity({ id: 1, name: 'test-mfe' })

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
      await browser.url(await browser.testHandle.assetURL('test-builds/browser-agent-wrapper/registered-entity.html', {
        init: { feature_flags: ['register', 'register.generic_events'] }
      }))

      await browser.execute(function () {
        const mfe = new RegisteredEntity({ id: 1, name: 'test-mfe' })
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
      await browser.url(await browser.testHandle.assetURL('test-builds/browser-agent-wrapper/registered-entity.html', {
        init: { feature_flags: ['register', 'register.generic_events'] }
      }))

      const waitTime = await browser.execute(function () {
        const waitMs = 100
        const mfe = new RegisteredEntity({ id: 1, name: 'timed-mfe' })

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
      await browser.url(await browser.testHandle.assetURL('test-builds/browser-agent-wrapper/registered-entity.html', {
        init: { feature_flags: ['register', 'register.generic_events'] }
      }))

      await browser.execute(function () {
        const parent = new RegisteredEntity({ id: 1, name: 'parent-mfe' })

        // Wait a bit before creating child
        const start = Date.now()
        while (Date.now() - start < 10) {
          // busy wait
        }

        const child = new RegisteredEntity({ id: 2, name: 'child-mfe' }, parent)

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
      await browser.url(await browser.testHandle.assetURL('test-builds/browser-agent-wrapper/registered-entity.html', {
        init: { feature_flags: ['register', 'register.generic_events'] }
      }))

      await browser.execute(function () {
        const mfes = []

        // Create multiple MFEs rapidly
        for (let i = 1; i <= 5; i++) {
          mfes.push(new RegisteredEntity({ id: i, name: `mfe-${i}` }))
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
      await browser.url(await browser.testHandle.assetURL('test-builds/browser-agent-wrapper/registered-entity.html', {
        init: { feature_flags: ['register', 'register.generic_events'] }
      }))

      await browser.execute(function () {
        const mfe = new RegisteredEntity({ id: 1, name: 'test-mfe' })

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
})
