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
      ]).then(expect(1).toEqual(1)).catch(() => expect(1).toEqual(2))
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
      ]).then(expect(1).toEqual(1)).catch(() => expect(1).toEqual(2))
    })
  })

  describe('all at once', () => {
    it('runs all features if top level is true', async () => {
      const [rum, pvt, ajax, jserrors, pa, st, spa] = await Promise.all([
        browser.testHandle.expectRum(),
        browser.testHandle.expectTimings(),
        browser.testHandle.expectAjaxEvents(),
        browser.testHandle.expectErrors(),
        browser.testHandle.expectIns(),
        browser.testHandle.expectResources(),
        browser.testHandle.expectInteractionEvents(),
        browser.url(await browser.testHandle.assetURL('instrumented.html', { init: { auto: true, ajax: { block_internal: false } } })) // Setup expects before loading the page
          .then(() => browser.execute(function () {
            setTimeout(function () {
              var xhr = new XMLHttpRequest()
              xhr.open('GET', '/json')
              xhr.send()
              newrelic.noticeError('test')
              newrelic.addPageAction('test', { test: 1 })
            }, 1000)
          }))
      ])

      await browser.pause(2000)
      checkRum(rum.request)
      checkPVT(pvt.request)
      checkAjax(ajax.request)
      checkJsErrors(jserrors.request)
      checkPageAction(pa.request)
      checkSessionTrace(st.request)
      checkSpa(spa.request)
    })

    it('does NOT run features if top level is false', async () => {
      await browser.url(await browser.testHandle.assetURL('instrumented.html', { init: { auto: false, ajax: { block_internal: false } } })) // Setup expects before loading the page
        .then(() => browser.execute(function () {
          var xhr = new XMLHttpRequest()
          xhr.open('GET', '/json')
          xhr.send()
          newrelic.noticeError('test')
          newrelic.addPageAction('test', { test: 1 })
        }))

      await Promise.all([
        browser.testHandle.expectRum(5000, true),
        browser.testHandle.expectTimings(5000, true),
        browser.testHandle.expectAjaxEvents(5000, true),
        browser.testHandle.expectErrors(5000, true),
        browser.testHandle.expectMetrics(5000, true),
        browser.testHandle.expectIns(5000, true),
        browser.testHandle.expectResources(5000, true),
        browser.testHandle.expectInteractionEvents(5000, true),
        browser.execute(function () {
          setTimeout(function () {
            window.location.reload()
          }, 1000)
        })
      ])
    })

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

  describe('partial implementations', () => {
    it('works if config supplied is incomplete', async () => {
      const [rum, pvt, ajax, jserrors, st, spa] = await Promise.all([
        browser.testHandle.expectRum(),
        browser.testHandle.expectTimings(),
        browser.testHandle.expectAjaxEvents(10000, true),
        browser.testHandle.expectErrors(10000, true),
        browser.testHandle.expectResources(),
        browser.testHandle.expectInteractionEvents(),
        browser.url(await browser.testHandle.assetURL('instrumented.html', {
          init: {
            auto: {
              ajax: false,
              jserrors: false
            },
            ajax: {
              block_internal: false
            }
          }
        })).then(() => browser.execute(function () {
          setTimeout(function () {
            var xhr = new XMLHttpRequest()
            xhr.open('GET', '/json')
            xhr.send()
            newrelic.noticeError('test')
          }, 1000)
        }))
      ])

      await browser.pause(2000)
      checkRum(rum.request)
      checkPVT(pvt.request)
      checkSessionTrace(st.request)
      checkSpa(spa.request)

      expect(ajax).toEqual(undefined)
      expect(jserrors).toEqual(undefined)

      await browser.pause(1000)
      const [ajax2, jserrors2] = await Promise.all([
        browser.testHandle.expectAjaxEvents(),
        browser.testHandle.expectErrors(),
        browser.execute(function () {
          newrelic.run()
        })
      ])

      checkAjax(ajax2.request)
      checkJsErrors(jserrors2.request)
    })

    it('still initializes manual features later when split', async () => {
      const [rum, pvt, ajax, jserrors, st, spa] = await Promise.all([
        browser.testHandle.expectRum(),
        browser.testHandle.expectTimings(),
        browser.testHandle.expectAjaxEvents(10000, true),
        browser.testHandle.expectErrors(10000, true),
        browser.testHandle.expectResources(),
        browser.testHandle.expectInteractionEvents(),
        browser.url(await browser.testHandle.assetURL('instrumented.html', {
          init: {
            auto: {
              ajax: false,
              jserrors: false,
              metrics: true,
              page_action: true,
              page_view_event: true,
              page_view_timing: true,
              session_trace: true,
              session_replay: true,
              spa: true
            },
            ajax: {
              block_internal: false
            }
          }
        })).then(() => browser.execute(function () {
          setTimeout(function () {
            var xhr = new XMLHttpRequest()
            xhr.open('GET', '/json')
            xhr.send()
            newrelic.noticeError('test')
          }, 1000)
        }))
      ])

      await browser.pause(2000)
      checkRum(rum.request)
      checkPVT(pvt.request)
      checkSessionTrace(st.request)
      checkSpa(spa.request)

      expect(ajax).toEqual(undefined)
      expect(jserrors).toEqual(undefined)

      await browser.pause(1000)
      const [ajax2, jserrors2] = await Promise.all([
        browser.testHandle.expectAjaxEvents(),
        browser.testHandle.expectErrors(),
        browser.execute(function () {
          newrelic.run()
        })
      ])

      checkAjax(ajax2.request)
      checkJsErrors(jserrors2.request)
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

      const rum = await browser.testHandle.expectRum(5000, true)
      expect(rum).toEqual(undefined)

      const [rum2, metrics] = await Promise.all([
        browser.testHandle.expectRum(),
        browser.testHandle.expectMetrics(),
        browser.execute(function () {
          newrelic.run('metrics')
          setTimeout(function () {
            window.location.reload()
          }, 1000)
        })
      ])
      await browser.pause(2000)
      checkRum(rum2.request)
      checkMetrics(metrics.request)
    })

    it('page_action', async () => {
      await browser.url(await browser.testHandle.assetURL('instrumented-manual.html')) // Setup expects before loading the page

      const rum = await browser.testHandle.expectRum(5000, true)
      expect(rum).toEqual(undefined)

      const [rum2, pageAction] = await Promise.all([
        browser.testHandle.expectRum(),
        browser.testHandle.expectIns(),
        browser.execute(function () {
          newrelic.run('page_action')
        })
      ])
      checkRum(rum2.request)
      checkPageAction(pageAction.request)
    })

    it('session_trace', async () => {
      await browser.url(await browser.testHandle.assetURL('instrumented-manual.html')) // Setup expects before loading the page

      const rum = await browser.testHandle.expectRum(5000, true)
      expect(rum).toEqual(undefined)

      const [rum2, sessionTrace] = await Promise.all([
        browser.testHandle.expectRum(),
        browser.testHandle.expectResources(),
        browser.execute(function () {
          newrelic.run('session_trace')
        })
      ])
      checkRum(rum2.request)
      checkSessionTrace(sessionTrace.request)
    })

    it('spa', async () => {
      await browser.url(await browser.testHandle.assetURL('instrumented-manual.html')) // Setup expects before loading the page

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
  expect(query).toMatchObject({
    a: expect.any(String),
    af: expect.any(String),
    be: expect.any(String),
    ck: expect.any(String),
    dc: expect.any(String),
    fe: expect.any(String),
    perf: expect.any(String),
    ref: expect.any(String),
    rst: expect.any(String),
    s: expect.any(String),
    t: expect.any(String),
    v: expect.any(String)
  })
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
  expect(body.find(x => x.path === '/json')).toMatchObject({
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
  })
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
