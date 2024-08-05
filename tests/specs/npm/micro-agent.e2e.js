/* globals MicroAgent */

describe('micro-agent', () => {
  it('Smoke Test - Can send distinct payloads of all relevant data types to 2 distinct app IDs', async () => {
    await browser.url(await browser.testHandle.assetURL('test-builds/browser-agent-wrapper/micro-agent.html'))

    await browser.execute(function () {
      var opts = {
        info: NREUM.info,
        init: NREUM.init
      }
      window.agent1 = new MicroAgent({ ...opts, info: { ...opts.info, applicationID: 1 } })
      window.agent2 = new MicroAgent({ ...opts, info: { ...opts.info, applicationID: 2 } })

      // each payload in this test is decorated with data that matches its appId for ease of testing
      window.agent1.setCustomAttribute('customAttr', '1')
      window.agent2.setCustomAttribute('customAttr', '2')

      // each payload in this test is decorated with data that matches its appId for ease of testing
      window.agent1.noticeError('1')
      window.agent2.noticeError('2')

      // each payload in this test is decorated with data that matches its appId for ease of testing
      window.agent1.addPageAction('1', { val: 1 })
      window.agent2.addPageAction('2', { val: 2 })
    })
    const [rumCalls, errCalls, paCalls] = await Promise.all([
      Promise.all([
        browser.testHandle.expectRum(5000),
        browser.testHandle.expectRum(5000)
      ]),
      Promise.all([
        browser.testHandle.expectErrors(10000),
        browser.testHandle.expectErrors(10000)
      ]),
      Promise.all([
        browser.testHandle.expectIns(10000),
        browser.testHandle.expectIns(10000)
      ])
    ])

    // these props will get set to true once a test has matched it
    // if it gets tried again, the test will fail, since these should all
    // only have one distinct matching payload
    const tests = {
      1: { rum: false, err: false, pa: false },
      2: { rum: false, err: false, pa: false }
    }

    // each type of test should check that:
    // each payload exists once per appId
    // each payload should have internal attributes matching it to the right appId
    rumCalls.forEach(({ request: { query, body } }) => {
      expect(ranOnce(query.a, 'rum')).toEqual(true)
      expect(payloadMatchesAppId(query.a, body.ja.customAttr)).toEqual(true)
    })

    errCalls.forEach(({ request: { query, body } }) => {
      expect(ranOnce(query.a, 'err')).toEqual(true)
      expect(payloadMatchesAppId(query.a, body.err[0].params.message)).toEqual(true)
    })

    paCalls.forEach(({ request: { query, body } }) => {
      expect(ranOnce(query.a, 'pa')).toEqual(true)
      const data = body.ins[0]
      expect(payloadMatchesAppId(query.a, data.val, data.actionName, data.customAttr)).toEqual(true)
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
