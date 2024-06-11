import { onlyFirefox } from '../../../tools/browser-matcher/common-matchers.mjs'
import { checkAjaxEvents, checkAjaxMetrics } from '../../util/basic-checks'
import { browserClick } from '../util/helpers'

describe('XHR Ajax', () => {
  it('creates event and metric data for xhr', async () => {
    await browser.url(await browser.testHandle.assetURL('ajax/xhr-simple.html'))
      .then(() => browser.waitForAgentLoad())
      .then(() => browser.execute(function () {
        window.disableAjaxHashChange = true
      }))

    const expects = Promise.all([
      browser.testHandle.expectAjaxEvents(),
      browser.testHandle.expectAjaxTimeSlices()
    ])

    await browser.pause(500)
    await browserClick('#sendAjax')

    expects.then(([ajaxEventsHarvest, ajaxTimeSlicesHarvest]) => {
      checkAjaxEvents(ajaxEventsHarvest.request, { specificPath: '/json' })
      checkAjaxMetrics(ajaxTimeSlicesHarvest.request, { specificPath: '/json' })

      const ajaxEvent = ajaxEventsHarvest.request.body.find(event => event.path === '/json')
      expect(ajaxEvent.end).toBeGreaterThanOrEqual(ajaxEvent.start)
      expect(ajaxEvent.callbackEnd).toEqual(ajaxEvent.end)

      const ajaxMetric = ajaxTimeSlicesHarvest.request.body.xhr.find(metric => metric.params.pathname === '/json')

      // Metric duration is not an exact calculation of `end - start`
      const calculatedDuration = ajaxEvent.end - ajaxEvent.start
      expect(ajaxMetric.metrics.duration.t).toBeWithin(calculatedDuration - 10, calculatedDuration + 11)
    })
  })

  it('creates event and metric data for erred xhr', async () => {
    await browser.url(await browser.testHandle.assetURL('ajax/xhr-404.html'))
      .then(() => browser.waitForAgentLoad())
      .then(() => browser.execute(function () {
        window.disableAjaxHashChange = true
      }))

    const expects = Promise.all([
      browser.testHandle.expectAjaxEvents(),
      browser.testHandle.expectAjaxTimeSlices()
    ])

    await browser.pause(500)
    await browserClick('#sendAjax')

    expects.then(([ajaxEventsHarvest, ajaxTimeSlicesHarvest]) => {
      checkAjaxEvents(ajaxEventsHarvest.request, { specificPath: '/paththatdoesnotexist' })
      checkAjaxMetrics(ajaxTimeSlicesHarvest.request, { specificPath: '/paththatdoesnotexist' })

      const ajaxEvent = ajaxEventsHarvest.request.body.find(event => event.path === '/paththatdoesnotexist')
      expect(ajaxEvent.status).toEqual(404)

      const ajaxMetric = ajaxTimeSlicesHarvest.request.body.xhr.find(metric => metric.params.pathname === '/paththatdoesnotexist')
      expect(ajaxMetric.params.status).toEqual(404)
    })
  })

  it('creates event and metric data for xhr with network error', async () => {
    await browser.url(await browser.testHandle.assetURL('ajax/xhr-network-error.html'))
      .then(() => browser.waitForAgentLoad())
      .then(() => browser.execute(function () {
        window.disableAjaxHashChange = true
      }))

    const expects = Promise.all([
      browser.testHandle.expectAjaxEvents(),
      browser.testHandle.expectAjaxTimeSlices()
    ])

    await browser.pause(500)
    await browserClick('#sendAjax')

    expects.then(([ajaxEventsHarvest, ajaxTimeSlicesHarvest]) => {
      checkAjaxEvents(ajaxEventsHarvest.request, { specificPath: '/bizbaz' })
      checkAjaxMetrics(ajaxTimeSlicesHarvest.request, { specificPath: '/bizbaz' })

      const ajaxEvent = ajaxEventsHarvest.request.body.find(event => event.path === '/bizbaz')
      expect(ajaxEvent.status).toEqual(0)

      const ajaxMetric = ajaxTimeSlicesHarvest.request.body.xhr.find(metric => metric.params.pathname === '/bizbaz')
      expect(ajaxMetric.params.status).toEqual(0)
    })
  })

  it('only includes load handlers in metric timings', async () => {
    await browser.url(await browser.testHandle.assetURL('ajax/xhr-callback-duration.html'))
      .then(() => browser.waitForAgentLoad())
      .then(() => browser.execute(function () {
        window.disableAjaxHashChange = true
      }))

    const expects = Promise.all([
      browser.testHandle.expectAjaxEvents(),
      browser.testHandle.expectAjaxTimeSlices()
    ])

    await browser.pause(500)
    await browserClick('#sendAjax')

    expects.then(([ajaxEventsHarvest, ajaxTimeSlicesHarvest]) => {
      checkAjaxEvents(ajaxEventsHarvest.request, { specificPath: '/json' })
      checkAjaxMetrics(ajaxTimeSlicesHarvest.request, { specificPath: '/json' })

      const ajaxEvent = ajaxEventsHarvest.request.body.find(event => event.path === '/json')
      // Ajax event should have a 0 callbackDuration when not picked up by the SPA feature
      expect(ajaxEvent.callbackDuration).toEqual(0)

      const ajaxMetric = ajaxTimeSlicesHarvest.request.body.xhr.find(metric => metric.params.pathname === '/json')
      // Callback duration can be flaky, but we are expecting around 100 milliseconds
      expect(ajaxMetric.metrics.cbTime.t).toBeWithin(75, 126)
    })
  })

  it('produces the correct event and metric timings when xhr times out', async () => {
    await browser.url(await browser.testHandle.assetURL('ajax/xhr-timeout.html'))
      .then(() => browser.waitForAgentLoad())
      .then(() => browser.execute(function () {
        window.disableAjaxHashChange = true
      }))

    const expects = Promise.all([
      browser.testHandle.expectAjaxEvents(),
      browser.testHandle.expectAjaxTimeSlices()
    ])

    await browser.pause(500)
    await browserClick('#sendAjax')

    expects.then(([ajaxEventsHarvest, ajaxTimeSlicesHarvest]) => {
      checkAjaxEvents(ajaxEventsHarvest.request, { specificPath: '/delayed' })
      checkAjaxMetrics(ajaxTimeSlicesHarvest.request, { specificPath: '/delayed' })

      const ajaxEvent = ajaxEventsHarvest.request.body.find(event => event.path === '/delayed')
      // Ajax event should have a 0 callbackDuration when not picked up by the SPA feature
      expect(ajaxEvent.callbackDuration).toEqual(0)
      // Ajax event should have a 0 status when timed out
      expect(ajaxEvent.status).toEqual(0)

      const ajaxMetric = ajaxTimeSlicesHarvest.request.body.xhr.find(metric => metric.params.pathname === '/delayed')
      // Callback duration should be 0 since the xhr timed out and the load handlers should not have ran
      expect(ajaxMetric.metrics.cbTime.t).toEqual(0)
      // Ajax metric should have a 0 status when timed out
      expect(ajaxMetric.params.status).toEqual(0)
    })
  })

  it('produces no event and metric data when xhr is aborted', async () => {
    await browser.url(await browser.testHandle.assetURL('ajax/xhr-abort.html'))
      .then(() => browser.waitForAgentLoad())
      .then(() => browser.execute(function () {
        window.disableAjaxHashChange = true
      }))

    const expects = Promise.all([
      browser.testHandle.expectAjaxEvents(),
      browser.testHandle.expectAjaxTimeSlices()
    ])

    await browser.pause(500)
    await browserClick('#sendAjax')

    expects.then(([ajaxEventsHarvest, ajaxTimeSlicesHarvest]) => {
      const ajaxEvent = ajaxEventsHarvest.request.body.find(event => event.path === '/delayed')
      expect(ajaxEvent).toBeUndefined()

      const ajaxMetric = ajaxTimeSlicesHarvest.request.body.xhr.find(metric => metric.params.pathname === '/delayed')
      expect(ajaxMetric).toBeUndefined()
    })
  })

  it('produces event and metric with correct transmit and receive size calculated', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented.html'))
      .then(() => browser.waitForAgentLoad())

    const expects = Promise.all([
      browser.testHandle.expectAjaxEvents(),
      browser.testHandle.expectAjaxTimeSlices()
    ])

    await browser.pause(500)
    await browser.execute(function () {
      var xhr = new XMLHttpRequest()
      xhr.open('POST', '/echo')
      xhr.send('foobar-bizbaz')
    })

    expects.then(([ajaxEventsHarvest, ajaxTimeSlicesHarvest]) => {
      checkAjaxEvents(ajaxEventsHarvest.request, { specificPath: '/echo' })
      checkAjaxMetrics(ajaxTimeSlicesHarvest.request, { specificPath: '/echo' })

      const ajaxEvent = ajaxEventsHarvest.request.body.find(event => event.path === '/echo')
      expect(ajaxEvent.requestBodySize).toEqual(13)
      expect(ajaxEvent.responseBodySize).toEqual(13)

      const ajaxMetric = ajaxTimeSlicesHarvest.request.body.xhr.find(metric => metric.params.pathname === '/echo')
      expect(ajaxMetric.metrics.txSize.t).toEqual(13)
      expect(ajaxMetric.metrics.rxSize.t).toEqual(13)
    })
  })

  it('captures cats header in metric for same-origin xhr', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented.html'))
      .then(() => browser.waitForAgentLoad())

    const expects = Promise.all([
      browser.testHandle.expectAjaxTimeSlices()
    ])

    await browser.pause(500)
    await browser.execute(function () {
      var xhr = new XMLHttpRequest()
      xhr.open('GET', '/xhr_with_cat/1')
      xhr.send()
    })

    expects.then(([ajaxTimeSlicesHarvest]) => {
      const ajaxMetric = ajaxTimeSlicesHarvest.request.body.xhr.find(metric => metric.params.pathname === '/xhr_with_cat/1')
      expect(ajaxMetric.params.cat).toEqual('foo')
    })
  })

  it('does not capture cats header in metric for cross-origin xhr', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented.html'))
      .then(() => browser.waitForAgentLoad())

    const expects = Promise.all([
      browser.testHandle.expectAjaxTimeSlices()
    ])

    await browser.pause(500)
    await browser.execute(function (host, port) {
      var xhr = new XMLHttpRequest()
      xhr.open('GET', 'http://' + host + ':' + port + '/xhr_with_cat/1')
      xhr.send()
    }, browser.testHandle.bamServerConfig.host, browser.testHandle.bamServerConfig.port)

    expects.then(([ajaxTimeSlicesHarvest]) => {
      const ajaxMetric = ajaxTimeSlicesHarvest.request.body.xhr.find(metric => metric.params.pathname === '/xhr_with_cat/1')
      expect(ajaxMetric.params.cat).toBeUndefined()
    })
  })

  it('does not capture cats header in metric for same-origin xhr when header does not exist', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented.html'))
      .then(() => browser.waitForAgentLoad())

    const expects = Promise.all([
      browser.testHandle.expectAjaxTimeSlices()
    ])

    await browser.pause(500)
    await browser.execute(function () {
      var xhr = new XMLHttpRequest()
      xhr.open('GET', '/xhr_no_cat')
      xhr.send()
    })

    expects.then(([ajaxTimeSlicesHarvest]) => {
      const ajaxMetric = ajaxTimeSlicesHarvest.request.body.xhr.find(metric => metric.params.pathname === '/xhr_no_cat')
      expect(ajaxMetric.params.cat).toBeUndefined()
    })
  })

  it('produces event and metric with correct transmit and receive size calculated when using array buffer', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented.html'))
      .then(() => browser.waitForAgentLoad())

    const expects = Promise.all([
      browser.testHandle.expectAjaxEvents(),
      browser.testHandle.expectAjaxTimeSlices()
    ])

    await browser.pause(500)
    await browser.execute(function () {
      var xhr = new XMLHttpRequest()
      xhr.open('POST', '/postwithhi/arraybufferxhr')
      xhr.responseType = 'arraybuffer'
      xhr.setRequestHeader('Content-Type', 'text/plain')
      xhr.send((new Int8Array([104, 105, 33])).buffer)
    })

    expects.then(([ajaxEventsHarvest, ajaxTimeSlicesHarvest]) => {
      const ajaxEvent = ajaxEventsHarvest.request.body.find(event => event.path === '/postwithhi/arraybufferxhr')
      // Firefox is different for some reason
      if (browserMatch(onlyFirefox)) {
        expect(ajaxEvent.requestBodySize).toEqual(2)
      } else {
        expect(ajaxEvent.requestBodySize).toEqual(3)
      }
      expect(ajaxEvent.responseBodySize).toEqual(3)

      const ajaxMetric = ajaxTimeSlicesHarvest.request.body.xhr.find(metric => metric.params.pathname === '/postwithhi/arraybufferxhr')
      // Firefox is different for some reason
      if (browserMatch(onlyFirefox)) {
        expect(ajaxMetric.metrics.txSize.t).toEqual(2)
      } else {
        expect(ajaxMetric.metrics.txSize.t).toEqual(3)
      }
      expect(ajaxMetric.metrics.rxSize.t).toEqual(3)
    })
  })

  it('produces event and metric with correct transmit and receive size calculated when using blob', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented.html'))
      .then(() => browser.waitForAgentLoad())

    const expects = Promise.all([
      browser.testHandle.expectAjaxEvents(),
      browser.testHandle.expectAjaxTimeSlices()
    ])

    await browser.pause(500)
    await browser.execute(function () {
      var xhr = new XMLHttpRequest()
      xhr.open('POST', '/postwithhi/blobxhr')
      xhr.responseType = 'blob'
      xhr.setRequestHeader('Content-Type', 'text/plain')
      xhr.send(new Blob(['hi!']))
    })

    expects.then(([ajaxEventsHarvest, ajaxTimeSlicesHarvest]) => {
      const ajaxEvent = ajaxEventsHarvest.request.body.find(event => event.path === '/postwithhi/blobxhr')
      expect(ajaxEvent.requestBodySize).toEqual(3)
      expect(ajaxEvent.responseBodySize).toEqual(3)

      const ajaxMetric = ajaxTimeSlicesHarvest.request.body.xhr.find(metric => metric.params.pathname === '/postwithhi/blobxhr')
      expect(ajaxMetric.metrics.txSize.t).toEqual(3)
      expect(ajaxMetric.metrics.rxSize.t).toEqual(3)
    })
  })

  it('produces event and metric with correct transmit and receive size calculated when using form data', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented.html'))
      .then(() => browser.waitForAgentLoad())

    const expects = Promise.all([
      browser.testHandle.expectAjaxEvents(),
      browser.testHandle.expectAjaxTimeSlices()
    ])

    await browser.pause(500)
    await browser.execute(function () {
      var data = new FormData()
      data.append('name', 'bob')
      data.append('x', 5)

      var xhr = new XMLHttpRequest()
      xhr.open('POST', '/formdata')
      xhr.send(data)
    })

    expects.then(([ajaxEventsHarvest, ajaxTimeSlicesHarvest]) => {
      const ajaxEvent = ajaxEventsHarvest.request.body.find(event => event.path === '/formdata')
      // We do not attempt to calculate txSize when FormData is used
      expect(ajaxEvent.requestBodySize).toEqual(0)
      expect(ajaxEvent.responseBodySize).toEqual(165)

      const ajaxMetric = ajaxTimeSlicesHarvest.request.body.xhr.find(metric => metric.params.pathname === '/formdata')
      // We do not attempt to calculate txSize when FormData is used
      expect(ajaxMetric.metrics.txSize).toBeUndefined()
      expect(ajaxMetric.metrics.rxSize.t).toEqual(165)
    })
  })

  it('produces event and metric with receive size calculated from the decompressed payload', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented.html'))
      .then(() => browser.waitForAgentLoad())

    const expects = Promise.all([
      browser.testHandle.expectAjaxEvents(),
      browser.testHandle.expectAjaxTimeSlices()
    ])

    await browser.pause(500)
    await browser.execute(function () {
      var xhr = new XMLHttpRequest()
      xhr.open('GET', '/gzipped')
      xhr.send()
    })

    expects.then(([ajaxEventsHarvest, ajaxTimeSlicesHarvest]) => {
      const ajaxEvent = ajaxEventsHarvest.request.body.find(event => event.path === '/gzipped')
      expect(ajaxEvent.responseBodySize).toEqual(10000)

      const ajaxMetric = ajaxTimeSlicesHarvest.request.body.xhr.find(metric => metric.params.pathname === '/gzipped')
      expect(ajaxMetric.metrics.rxSize.t).toEqual(10000)
    })
  })

  it('produces event and metric with receive size calculated from the complete chunked payload', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented.html'))
      .then(() => browser.waitForAgentLoad())

    const expects = Promise.all([
      browser.testHandle.expectAjaxEvents(),
      browser.testHandle.expectAjaxTimeSlices()
    ])

    await browser.pause(500)
    await browser.execute(function () {
      var xhr = new XMLHttpRequest()
      xhr.open('GET', '/chunked')
      xhr.send()
    })

    expects.then(([ajaxEventsHarvest, ajaxTimeSlicesHarvest]) => {
      const ajaxEvent = ajaxEventsHarvest.request.body.find(event => event.path === '/chunked')
      expect(ajaxEvent.responseBodySize).toEqual(10000)

      const ajaxMetric = ajaxTimeSlicesHarvest.request.body.xhr.find(metric => metric.params.pathname === '/chunked')
      expect(ajaxMetric.metrics.rxSize.t).toEqual(10000)
    })
  })

  it('properly wraps onreadystatechange function added before send call', async () => {
    await browser.url(await browser.testHandle.assetURL('ajax/xhr-readystate-before-send.html'))
      .then(() => browser.waitForAgentLoad())
      .then(() => browser.execute(function () {
        window.disableAjaxHashChange = true
      }))

    const ajaxRequest = browser.testHandle.expectAjaxEvents()

    await browserClick('#sendAjax')

    const readyStatesSeen = await browser.execute(function () {
      return window.readyStatesSeen
    })

    ajaxRequest.then(() => {
      expect(readyStatesSeen).toEqual(expect.arrayContaining([
        [1, expect.stringContaining('nr@original')],
        [2, expect.stringContaining('nr@original')],
        [3, expect.stringContaining('nr@original')],
        [4, expect.stringContaining('nr@original')]
      ]))
    })
  })

  it('properly wraps onreadystatechange function added after send call', async () => {
    await browser.url(await browser.testHandle.assetURL('ajax/xhr-readystate-after-send.html'))
      .then(() => browser.waitForAgentLoad())
      .then(() => browser.execute(function () {
        window.disableAjaxHashChange = true
      }))

    const ajaxRequest = browser.testHandle.expectAjaxEvents()

    await browserClick('#sendAjax')

    const readyStatesSeen = await browser.execute(function () {
      return window.readyStatesSeen
    })

    ajaxRequest.then(() => {
      expect(readyStatesSeen).toEqual(expect.arrayContaining([
        [2, expect.stringContaining('nr@original')],
        [3, expect.stringContaining('nr@original')],
        [4, expect.stringContaining('nr@original')]
      ]))
    })
  })

  it('creates event and metric data for xhr with bad 3rd party wrapping after agent', async () => {
    await browser.url(await browser.testHandle.assetURL('ajax/xhr-bad-wrapper-after.html'))
      .then(() => browser.waitForAgentLoad())
      .then(() => browser.execute(function () {
        window.disableAjaxHashChange = true
      }))

    const expects = Promise.all([
      browser.testHandle.expectAjaxEvents(),
      browser.testHandle.expectAjaxTimeSlices()
    ])

    await browser.pause(500)
    await browserClick('#sendAjax')

    expects.then(([ajaxEventsHarvest, ajaxTimeSlicesHarvest]) => {
      checkAjaxEvents(ajaxEventsHarvest.request, { specificPath: '/json' })
      checkAjaxMetrics(ajaxTimeSlicesHarvest.request, { specificPath: '/json' })

      const ajaxEvent = ajaxEventsHarvest.request.body.find(event => event.path === '/json')
      expect(ajaxEvent.end).toBeGreaterThanOrEqual(ajaxEvent.start)
      expect(ajaxEvent.callbackEnd).toEqual(ajaxEvent.end)

      const ajaxMetric = ajaxTimeSlicesHarvest.request.body.xhr.find(metric => metric.params.pathname === '/json')

      // Metric duration is not an exact calculation of `end - start`
      const calculatedDuration = ajaxEvent.end - ajaxEvent.start
      expect(ajaxMetric.metrics.duration.t).toBeWithin(calculatedDuration - 10, calculatedDuration + 11)
    })
  })

  it('creates event and metric data for xhr with 3rd party listener patch after agent', async () => {
    await browser.url(await browser.testHandle.assetURL('ajax/xhr-patch-listener-after.html'))
      .then(() => browser.waitForAgentLoad())
      .then(() => browser.execute(function () {
        window.disableAjaxHashChange = true
      }))

    const expects = Promise.all([
      browser.testHandle.expectAjaxEvents(),
      browser.testHandle.expectAjaxTimeSlices()
    ])

    await browser.pause(500)
    await browserClick('#sendAjax')

    expects.then(async ([ajaxEventsHarvest, ajaxTimeSlicesHarvest]) => {
      checkAjaxEvents(ajaxEventsHarvest.request, { specificPath: '/json' })
      checkAjaxMetrics(ajaxTimeSlicesHarvest.request, { specificPath: '/json' })

      const ajaxEvent = ajaxEventsHarvest.request.body.find(event => event.path === '/json')
      expect(ajaxEvent.end).toBeGreaterThanOrEqual(ajaxEvent.start)
      expect(ajaxEvent.callbackEnd).toEqual(ajaxEvent.end)

      const ajaxMetric = ajaxTimeSlicesHarvest.request.body.xhr.find(metric => metric.params.pathname === '/json')

      // Metric duration is not an exact calculation of `end - start`
      const calculatedDuration = ajaxEvent.end - ajaxEvent.start
      expect(ajaxMetric.metrics.duration.t).toBeWithin(calculatedDuration - 20, calculatedDuration + 21)

      await expect(browser.execute(function () {
        return window.wrapperInvoked
      })).resolves.toEqual(true)
    })
  })
})
