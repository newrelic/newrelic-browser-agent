/* globals RegisteredEntity */

import { testMFEErrorsRequest, testMFEInsRequest, testLogsRequest, testRumRequest } from '../../../tools/testing-server/utils/expect-tests'

describe('registered-entity', () => {
  it('Smoke Test - Can send distinct payloads of all relevant data types to multiple app IDs', async () => {
    const [rumCapture, mfeErrorsCapture, mfeInsightsCapture, logsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testRumRequest },
      { test: testMFEErrorsRequest },
      { test: testMFEInsRequest },
      { test: testLogsRequest }
    ])
    await browser.url(await browser.testHandle.assetURL('test-builds/browser-agent-wrapper/registered-entity.html'))

    await browser.execute(function () {
      var features = Object.values(newrelic.initializedAgents)[0].features
      features.jserrors.featAggregate.supportsRegisteredEntities = true
      features.generic_events.featAggregate.supportsRegisteredEntities = true
      features.logging.featAggregate.supportsRegisteredEntities = true

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
    })
    const [rumHarvests, errorsHarvests, insightsHarvests, logsHarvest] = await Promise.all([
      rumCapture.waitForResult({ totalCount: 1 }),
      mfeErrorsCapture.waitForResult({ totalCount: 1 }),
      mfeInsightsCapture.waitForResult({ totalCount: 1 }),
      logsCapture.waitForResult({ totalCount: 1 })
    ])

    const containerAgentEntityGuid = await browser.execute(function () {
      return Object.values(newrelic.initializedAgents)[0].runtime.appMetadata.agents[0].entityGuid
    })

    // these props will get set to true once a test has matched it
    // if it gets tried again, the test will fail, since these should all
    // only have one distinct matching payload
    const tests = {
      42: { rum: false, err: false, pa: false, log: false }, // container agent defaults to appId 42
      1: { err: false, pa: false, log: false }, // agent1 instance
      2: { err: false, pa: false, log: false } // agent2 instance
    }

    // each type of test should check that:
    // each payload exists once per appId
    // each payload should have internal attributes matching it to the right appId
    rumHarvests.forEach(({ request: { query, body } }) => {
      expect(ranOnce(query.a, 'rum')).toEqual(true)
    })

    errorsHarvests.forEach(({ request: { query, body } }) => {
      const data = body.err
      data.forEach(err => {
        const id = err.custom['mfe.id'] || query.a // MFEs use mfe.id, regular agents use appId
        if (Number(id) !== 42) {
          expect(err.custom['mfe.name']).toEqual('agent' + id)
          expect(err.custom.eventSource).toEqual('MicroFrontendBrowserAgent')
          expect(err.custom['container.id']).toEqual(containerAgentEntityGuid)
        }
        expect(ranOnce(id, 'err')).toEqual(true)
        expect(Number(id)).toEqual(Number(err.params.message))
      })
    })

    insightsHarvests.forEach(({ request: { query, body } }) => {
      const data = body.ins
      data.forEach(ins => {
        if (ins.eventType === 'PageAction') {
          const id = ins['mfe.id'] || query.a // MFEs use mfe.id, regular agents use appId
          if (Number(id) !== 42) {
            expect(ins['mfe.name']).toEqual('agent' + id)
            expect(ins.eventSource).toEqual('MicroFrontendBrowserAgent')
            expect(ins['container.id']).toEqual(containerAgentEntityGuid)
          }
          expect(ranOnce(id, 'pa')).toEqual(true)
          expect(Number(id)).toEqual(Number(ins.val))
        }
      })
    })

    logsHarvest.forEach(({ request: { query, body } }) => {
      const data = JSON.parse(body)[0]
      data.logs.forEach(log => {
        const id = log.attributes['mfe.id'] || 42 // MFEs use mfe.id, regular agents supply entity guid so just force it to 42 here if mfe id is not present
        if (Number(id) !== 42) {
          expect(log.attributes['mfe.name']).toEqual('agent' + id)
          expect(log.attributes.eventSource).toEqual('MicroFrontendBrowserAgent')
          expect(log.attributes['container.id']).toEqual(containerAgentEntityGuid)
        }
        expect(ranOnce(id, 'log')).toEqual(true)
        expect(Number(id)).toEqual(Number(log.message))
      })
    })

    function ranOnce (appId, type) {
      if (tests[appId][type]) return false
      tests[appId][type] = true
      return true
    }
  })
})
