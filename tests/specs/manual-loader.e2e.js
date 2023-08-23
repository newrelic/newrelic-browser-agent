describe('Manual Loader', () => {
  describe('invalid params do not initialize data', () => {
    it('wrong string', async () => {
      await browser.url(await browser.testHandle.assetURL('instrumented-manual.html')) // Setup expects before loading the page

      const rum = await browser.testHandle.expectRum(5000, true)
      expect(rum).toEqual(undefined)

      Promise.all([
        browser.testHandle.expectRum(10000, true),
        browser.testHandle.expectTimings(10000, true),
        browser.testHandle.expectAjaxEvents(10000, true),
        browser.testHandle.expectErrors(10000, true),
        browser.testHandle.expectMetrics(10000, true),
        browser.testHandle.expectIns(10000, true),
        browser.testHandle.expectResources(10000, true),
        browser.testHandle.expectInteractionEvents(10000, true),
        browser.execute(function () {
          newrelic.run('INVALID')
          setTimeout(function () {
            window.location.reload()
          }, 1000)
        })
      ]).then(expect(1).toEqual(1)).catch(err => expect(1).toEqual(2))
    })

    it('wrong type', async () => {
      await browser.url(await browser.testHandle.assetURL('instrumented-manual.html')) // Setup expects before loading the page

      const rum = await browser.testHandle.expectRum(5000, true)
      expect(rum).toEqual(undefined)

      Promise.all([
        browser.testHandle.expectRum(10000, true),
        browser.testHandle.expectTimings(10000, true),
        browser.testHandle.expectAjaxEvents(10000, true),
        browser.testHandle.expectErrors(10000, true),
        browser.testHandle.expectMetrics(10000, true),
        browser.testHandle.expectIns(10000, true),
        browser.testHandle.expectResources(10000, true),
        browser.testHandle.expectInteractionEvents(10000, true),
        browser.execute(function () {
          newrelic.run(1)
          setTimeout(function () {
            window.location.reload()
          }, 1000)
        })
      ]).then(expect(1).toEqual(1)).catch(err => expect(1).toEqual(2))
    })
  })

  describe('all at once', () => {
    it('empty params initializes all features', async () => {
      await browser.url(await browser.testHandle.assetURL('instrumented-manual.html')) // Setup expects before loading the page

      const rum = await browser.testHandle.expectRum(5000, true)
      expect(rum).toEqual(undefined)

      const [rum2, pvt, ajax, jserrors, metrics, pa, st, spa] = await Promise.all([
        browser.testHandle.expectRum(),
        browser.testHandle.expectTimings(),
        browser.testHandle.expectAjaxEvents(),
        browser.testHandle.expectErrors(),
        browser.testHandle.expectMetrics(),
        browser.testHandle.expectIns(),
        browser.testHandle.expectResources(),
        browser.testHandle.expectInteractionEvents(),
        browser.execute(function () {
          newrelic.run()
          setTimeout(function () {
            window.location.reload()
          }, 1000)
        })
      ])

      checkRum(rum2.request)
      checkPVT(pvt.request)
      checkAjax(ajax.request)
      checkJsErrors(jserrors.request)
      checkMetrics(metrics.request)
      checkPageAction(pa.request)
      checkSessionTrace(st.request)
      checkSpa(spa.request)
    })
  })

  describe('individual features', () => {
    it('page_view_timings', async () => {
      await browser.url(await browser.testHandle.assetURL('instrumented-manual.html')) // Setup expects before loading the page

      const rum = await browser.testHandle.expectRum(5000, true)
      expect(rum).toEqual(undefined)

      const [rum2, timings] = await Promise.all([
        browser.testHandle.expectRum(),
        browser.testHandle.expectTimings(),
        browser.execute(function () {
          newrelic.run('page_view_timing')
        })
      ])
      checkRum(rum2.request)
      checkPVT(timings.request)
    })

    it('ajax', async () => {
      await browser.url(await browser.testHandle.assetURL('instrumented-manual.html')) // Setup expects before loading the page
      // .then(() => browser.waitForAgentLoad())

      const rum = await browser.testHandle.expectRum(5000, true)
      expect(rum).toEqual(undefined)

      const [rum2, ajax] = await Promise.all([
        browser.testHandle.expectRum(),
        browser.testHandle.expectAjaxEvents(),
        browser.execute(function () {
          newrelic.run('ajax')
        })
      ])
      checkRum(rum2.request)
      checkAjax(ajax.request)
    })

    it('jserrors', async () => {
      await browser.url(await browser.testHandle.assetURL('instrumented-manual.html')) // Setup expects before loading the page
      // .then(() => browser.waitForAgentLoad())

      const rum = await browser.testHandle.expectRum(5000, true)
      expect(rum).toEqual(undefined)

      const [rum2, jserrors] = await Promise.all([
        browser.testHandle.expectRum(),
        browser.testHandle.expectErrors(),
        browser.execute(function () {
          newrelic.run('jserrors')
        })
      ])
      checkRum(rum2.request)
      checkJsErrors(jserrors.request)
    })

    it('metrics', async () => {
      await browser.url(await browser.testHandle.assetURL('instrumented-manual.html')) // Setup expects before loading the page
      // .then(() => browser.waitForAgentLoad())

      const rum = await browser.testHandle.expectRum(5000, true)
      expect(rum).toEqual(undefined)

      const [rum2, metrics] = await Promise.all([
        browser.testHandle.expectRum(),
        browser.testHandle.expectMetrics(),
        browser.execute(function () {
          newrelic.run('metrics')
          window.location.reload()
        })
      ])
      checkRum(rum2.request)
      checkMetrics(metrics.request)
    })

    it('page_action', async () => {
      await browser.url(await browser.testHandle.assetURL('instrumented-manual.html')) // Setup expects before loading the page
      // .then(() => browser.waitForAgentLoad())

      const rum = await browser.testHandle.expectRum(5000, true)
      expect(rum).toEqual(undefined)

      const [rum2, page_action] = await Promise.all([
        browser.testHandle.expectRum(),
        browser.testHandle.expectIns(),
        browser.execute(function () {
          newrelic.run('page_action')
        })
      ])
      checkRum(rum2.request)
      checkPageAction(page_action.request)
    })

    it('session_trace', async () => {
      await browser.url(await browser.testHandle.assetURL('instrumented-manual.html')) // Setup expects before loading the page
      // .then(() => browser.waitForAgentLoad())

      const rum = await browser.testHandle.expectRum(5000, true)
      expect(rum).toEqual(undefined)

      const [rum2, session_trace] = await Promise.all([
        browser.testHandle.expectRum(),
        browser.testHandle.expectResources(),
        browser.execute(function () {
          newrelic.run('session_trace')
        })
      ])
      checkRum(rum2.request)
      checkSessionTrace(session_trace.request)
    })

    it('spa', async () => {
      await browser.url(await browser.testHandle.assetURL('instrumented-manual.html')) // Setup expects before loading the page
      // .then(() => browser.waitForAgentLoad())

      const rum = await browser.testHandle.expectRum(5000, true)
      expect(rum).toEqual(undefined)

      const [rum2, spa] = await Promise.all([
        browser.testHandle.expectRum(),
        browser.testHandle.expectInteractionEvents(),
        browser.execute(function () {
          newrelic.run('spa')
        })
      ])
      checkRum(rum2.request)
      checkSpa(spa.request)
    })
  })
})

const baseQuery = expect.objectContaining({
  a: expect.any(String),
  ck: expect.any(String),
  ref: expect.any(String),
  rst: expect.any(String),
  s: expect.any(String),
  t: expect.any(String),
  v: expect.any(String)
})

function checkRum ({ query, body }) {
  expect(query).toEqual(expect.objectContaining({
    a: expect.any(String),
    af: expect.any(String),
    be: expect.any(String),
    ck: expect.any(String),
    dc: expect.any(String),
    fcp: expect.any(String),
    fe: expect.any(String),
    fp: expect.any(String),
    perf: expect.any(String),
    ref: expect.any(String),
    rst: expect.any(String),
    s: expect.any(String),
    t: expect.any(String),
    v: expect.any(String)
  }))
  expect(body).toEqual('')
}

function checkPVT ({ query, body }) {
  const pvtItem = expect.objectContaining({
    attributes: expect.any(Array),
    name: expect.any(String),
    type: expect.any(String),
    value: expect.any(Number)
  })
  expect(query).toEqual(baseQuery)
  expect(body[0]).toEqual(pvtItem)
}

function checkAjax ({ query, body }) {
  expect(query).toEqual(baseQuery)
  expect(body.find(x => x.path === '/json')).toEqual(expect.objectContaining({
    callbackDuration: expect.any(Number),
    callbackEnd: expect.any(Number),
    children: expect.any(Array),
    domain: expect.any(String),
    end: expect.any(Number),
    guid: null,
    method: expect.any(String),
    nodeId: expect.any(String),
    path: expect.any(String),
    requestBodySize: expect.any(Number),
    requestedWith: expect.any(String),
    responseBodySize: expect.any(Number),
    start: expect.any(Number),
    status: expect.any(Number),
    timestamp: null,
    traceId: null,
    type: expect.any(String)
  }))
}

function checkJsErrors ({ query, body }) {
  expect(query).toEqual(baseQuery)

  expect(body.err[0]).toBeTruthy()
  expect(body.err[0].params.message).toEqual('test')
}

function checkMetrics ({ query, body }) {
  expect(query).toEqual(baseQuery)
  expect(body.sm?.length).toBeTruthy()
}

function checkPageAction ({ query, body }) {
  expect(query).toEqual(baseQuery)
  expect(body.ins?.[0]?.test).toEqual(1)
}

function checkSessionTrace ({ query, body }) {
  expect(query).toEqual(baseQuery)
  expect(body.res.length).toBeGreaterThanOrEqual(1)
}

function checkSpa ({ query, body }) {
  expect(query).toEqual(baseQuery)
  expect(body.length).toBeGreaterThanOrEqual(1)
}
