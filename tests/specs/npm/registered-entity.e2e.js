/* globals RegisteredEntity */

import { testAjaxEventsRequest, testErrorsRequest, testInsRequest, testLogsRequest, testRumRequest } from '../../../tools/testing-server/utils/expect-tests'

describe('registered-entity', () => {
  it('Smoke Test - Can send distinct payloads of all relevant data types to multiple app IDs', async () => {
    const [rumCapture, errorsCapture, insightsCapture, logsCapture, ajaxCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testRumRequest },
      { test: testErrorsRequest },
      { test: testInsRequest },
      { test: testLogsRequest },
      { test: testAjaxEventsRequest }
    ])
    await browser.url(await browser.testHandle.assetURL('test-builds/browser-agent-wrapper/registered-entity.html'))
      .then(() => browser.waitForAgentLoad())

    await browser.execute(function () {
      window.agent1 = new RegisteredEntity({
        licenseKey: window.NREUM.info.licenseKey,
        applicationID: 1
      }).on('ready', ({ metadata }) => {
        var xhr = new XMLHttpRequest()
        xhr.open('GET', '/json')
        xhr.setRequestHeader('X-Newrelic-Entity-Guid', metadata.target.entityGuid) // app 1 should report XMLHttpRequest
        xhr.send()
      }).on('error', (err) => {
        newrelic.noticeError(err)
      })

      window.agent2 = new RegisteredEntity({
        licenseKey: window.NREUM.info.licenseKey,
        applicationID: 2
      }).on('ready', ({ metadata }) => {
        fetch('/json', {
          headers: {
            'X-Newrelic-Entity-Guid': metadata.target.entityGuid // app 2 should report fetch
          }
        })
      }).on('error', (err) => {
        newrelic.noticeError(err)
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
      window.agent1.log('1')
      window.agent2.log('2')

      const jsonXHR = new XMLHttpRequest()
      jsonXHR.open('GET', '/json')
      jsonXHR.send()
    })
    const [rumHarvests, errorsHarvests, insightsHarvests, logsHarvest, ajaxHarvests] = await Promise.all([
      rumCapture.waitForResult({ totalCount: 3 }),
      errorsCapture.waitForResult({ totalCount: 3 }),
      insightsCapture.waitForResult({ totalCount: 3 }),
      logsCapture.waitForResult({ totalCount: 3 }),
      ajaxCapture.waitForResult({ timeout: 15000 })
    ])

    // these props will get set to true once a test has matched it
    // if it gets tried again, the test will fail, since these should all
    // only have one distinct matching payload
    const tests = {
      42: { rum: false, err: false, pa: false, log: false, ajax: false }, // container agent defaults to appId 42
      1: { rum: false, err: false, pa: false, log: false, ajax: false }, // agent1 instance
      2: { rum: false, err: false, pa: false, log: false, ajax: false } // agent2 instance
    }

    // each type of test should check that:
    // each payload exists once per appId
    // each payload should have internal attributes matching it to the right appId
    rumHarvests.forEach(({ request: { query, body } }) => {
      expect(ranOnce(query.a, 'rum')).toEqual(true)
    })

    errorsHarvests.forEach(({ request: { query, body } }) => {
      expect(ranOnce(query.a, 'err')).toEqual(true)
      expect(payloadMatchesAppId(query.a, body.err[0].params.message)).toEqual(true)
    })

    insightsHarvests.forEach(({ request: { query, body } }) => {
      expect(ranOnce(query.a, 'pa')).toEqual(true)
      const data = body.ins[0]
      expect(payloadMatchesAppId(query.a, data.val, data.actionName, data.customAttr)).toEqual(true)
    })

    logsHarvest.forEach(({ request: { query, body } }) => {
      const data = JSON.parse(body)[0]
      expect(ranOnce(data.common.attributes.appId, 'log')).toEqual(true)
      expect(payloadMatchesAppId(data.common.attributes.appId, data.logs[0].message)).toEqual(true)
    })

    ajaxHarvests.forEach(({ request: { query, body } }) => {
      body.filter(x => x.path === '/json').forEach(x => {
        expect(ranOnce(query.a, 'ajax')).toEqual(true)
        if (query.a === '2') expect(body[0].requestedWith).toEqual('fetch')
        else expect(body[0].requestedWith).toEqual('XMLHttpRequest')
      })
    })

    function payloadMatchesAppId (appId, ...props) {
      // each payload in this test is decorated with data that matches its appId for ease of testing
      return props.every(p => Number(appId) === Number(p))
    }

    function ranOnce (appId, type) {
      if (tests[appId][type]) return false
      tests[appId][type] = true
      return true
    }
  })
})
