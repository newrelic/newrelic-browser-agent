/* globals RegisteredEntity */

import { testErrorsRequest, testInsRequest, testLogsRequest, testRumRequest } from '../../../tools/testing-server/utils/expect-tests'

describe('registered-entity', () => {
  it('Smoke Test - Can send distinct payloads of all relevant data types to multiple app IDs', async () => {
    const [rumCapture, errorsCapture, insightsCapture, logsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testRumRequest },
      { test: testErrorsRequest },
      { test: testInsRequest },
      { test: testLogsRequest }
    ])
    await browser.url(await browser.testHandle.assetURL('test-builds/browser-agent-wrapper/registered-entity.html'))

    await browser.execute(function () {
      window.agent1 = new RegisteredEntity({
        licenseKey: window.NREUM.info.licenseKey,
        entityID: 1,
        entityName: 'agent1'
      })
      window.agent2 = new RegisteredEntity({
        licenseKey: window.NREUM.info.licenseKey,
        entityID: 2,
        entityName: 'agent2'
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
      errorsCapture.waitForResult({ totalCount: 1 }),
      insightsCapture.waitForResult({ totalCount: 1 }),
      logsCapture.waitForResult({ totalCount: 1 })
    ])

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
        const id = err.custom.entityID || query.a // MFEs use entityID, regular agents use appId
        expect(ranOnce(id, 'err')).toEqual(true)
        expect(Number(id)).toEqual(Number(err.params.message))
      })
    })

    insightsHarvests.forEach(({ request: { query, body } }) => {
      const data = body.ins
      data.forEach(ins => {
        if (ins.eventType === 'PageAction') {
          const id = ins.entityID || query.a // MFEs use entityID, regular agents use appId
          expect(ranOnce(id, 'pa')).toEqual(true)
          expect(Number(id)).toEqual(Number(ins.val))
        }
      })
    })

    logsHarvest.forEach(({ request: { query, body } }) => {
      const data = JSON.parse(body)[0]
      data.logs.forEach(log => {
        const id = log.attributes.entityID || data.common.attributes.appId // MFEs use entityID, regular agents use appId
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
