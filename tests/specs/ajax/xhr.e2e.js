import { onlyFirefox } from '../../../tools/browser-matcher/common-matchers.mjs'
import { checkAjaxEvents, checkAjaxMetrics } from '../../util/basic-checks'
import { testAjaxEventsRequest, testAjaxTimeSlicesRequest } from '../../../tools/testing-server/utils/expect-tests'

describe('XHR Ajax', () => {
  let ajaxEventsCapture
  let ajaxMetricsCapture

  beforeEach(async () => {
    [ajaxEventsCapture, ajaxMetricsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testAjaxEventsRequest },
      { test: testAjaxTimeSlicesRequest }
    ])
  })

  it('creates event and metric data for xhr', async () => {
    await browser.url(await browser.testHandle.assetURL('ajax/xhr-simple.html'))
      .then(() => browser.waitForAgentLoad())
      .then(() => browser.execute(function () {
        window.disableAjaxHashChange = true
      }))

    const [ajaxEventsHarvest, ajaxMetricsHarvest] = await Promise.all([
      ajaxEventsCapture.waitForResult({ timeout: 10000 }),
      ajaxMetricsCapture.waitForResult({ timeout: 10000 }),
      $('#sendAjax').click()
    ])

    ajaxEventsHarvest.forEach(harvest =>
      checkAjaxEvents(harvest.request, { specificPath: '/json' })
    )
    ajaxMetricsHarvest.forEach(harvest =>
      checkAjaxMetrics(harvest.request, { specificPath: '/json', isFetch: true })
    )

    const ajaxEvent = ajaxEventsHarvest
      .flatMap(harvest => harvest.request.body)
      .find(event => event.path === '/json')
    expect(ajaxEvent.end).toBeGreaterThanOrEqual(ajaxEvent.start)
    expect(ajaxEvent.callbackEnd).toEqual(ajaxEvent.end)

    const ajaxMetric = ajaxMetricsHarvest
      .flatMap(harvest => harvest.request.body.xhr)
      .find(metric => metric.params.pathname === '/json')

    // Metric duration is not an exact calculation of `end - start`
    const calculatedDuration = ajaxEvent.end - ajaxEvent.start
    expect(ajaxMetric.metrics.duration.t).toBeWithin(calculatedDuration - 10, calculatedDuration + 11)
  })

  it('creates event and metric data for erred xhr', async () => {
    await browser.url(await browser.testHandle.assetURL('ajax/xhr-404.html'))
      .then(() => browser.waitForAgentLoad())
      .then(() => browser.execute(function () {
        window.disableAjaxHashChange = true
      }))

    const [ajaxEventsHarvest, ajaxMetricsHarvest] = await Promise.all([
      ajaxEventsCapture.waitForResult({ timeout: 10000 }),
      ajaxMetricsCapture.waitForResult({ timeout: 10000 }),
      $('#sendAjax').click()
    ])

    ajaxEventsHarvest.forEach(harvest =>
      checkAjaxEvents(harvest.request, { specificPath: '/paththatdoesnotexist' })
    )
    ajaxMetricsHarvest.forEach(harvest =>
      checkAjaxMetrics(harvest.request, { specificPath: '/paththatdoesnotexist', isFetch: true })
    )

    const ajaxEvent = ajaxEventsHarvest
      .flatMap(harvest => harvest.request.body)
      .find(event => event.path === '/paththatdoesnotexist')
    expect(ajaxEvent.status).toEqual(404)

    const ajaxMetric = ajaxMetricsHarvest
      .flatMap(harvest => harvest.request.body.xhr)
      .find(metric => metric.params.pathname === '/paththatdoesnotexist')
    expect(ajaxMetric.params.status).toEqual(404)
  })

  it('creates event and metric data for xhr with network error', async () => {
    await browser.url(await browser.testHandle.assetURL('ajax/xhr-network-error.html'))
      .then(() => browser.waitForAgentLoad())
      .then(() => browser.execute(function () {
        window.disableAjaxHashChange = true
      }))

    const [ajaxEventsHarvest, ajaxMetricsHarvest] = await Promise.all([
      ajaxEventsCapture.waitForResult({ timeout: 10000 }),
      ajaxMetricsCapture.waitForResult({ timeout: 10000 }),
      $('#sendAjax').click()
    ])

    ajaxEventsHarvest.forEach(harvest =>
      checkAjaxEvents(harvest.request, { specificPath: '/bizbaz' })
    )
    ajaxMetricsHarvest.forEach(harvest =>
      checkAjaxMetrics(harvest.request, { specificPath: '/bizbaz', isFetch: true })
    )

    const ajaxEvent = ajaxEventsHarvest
      .flatMap(harvest => harvest.request.body)
      .find(event => event.path === '/bizbaz')
    expect(ajaxEvent.status).toEqual(0)

    const ajaxMetric = ajaxMetricsHarvest
      .flatMap(harvest => harvest.request.body.xhr)
      .find(metric => metric.params.pathname === '/bizbaz')
    expect(ajaxMetric.params.status).toEqual(0)
  })

  it('only includes load handlers in metric timings', async () => {
    await browser.url(await browser.testHandle.assetURL('ajax/xhr-callback-duration.html'))
      .then(() => browser.waitForAgentLoad())
      .then(() => browser.execute(function () {
        window.disableAjaxHashChange = true
      }))

    const [ajaxEventsHarvest, ajaxMetricsHarvest] = await Promise.all([
      ajaxEventsCapture.waitForResult({ timeout: 10000 }),
      ajaxMetricsCapture.waitForResult({ timeout: 10000 }),
      $('#sendAjax').click()
    ])

    ajaxEventsHarvest.forEach(harvest =>
      checkAjaxEvents(harvest.request, { specificPath: '/bizbaz' })
    )
    ajaxMetricsHarvest.forEach(harvest =>
      checkAjaxMetrics(harvest.request, { specificPath: '/bizbaz', isFetch: true })
    )

    const ajaxEvent = ajaxEventsHarvest
      .flatMap(harvest => harvest.request.body)
      .find(event => event.path === '/json')
    // Ajax event should have a 0 callbackDuration when not picked up by the SPA feature
    expect(ajaxEvent.callbackDuration).toEqual(0)

    const ajaxMetric = ajaxMetricsHarvest
      .flatMap(harvest => harvest.request.body.xhr)
      .find(metric => metric.params.pathname === '/json')
    // Callback duration can be flaky, but we are expecting around 100 milliseconds
    expect(ajaxMetric.metrics.cbTime.t).toBeWithin(75, 126)
  })

  it('produces the correct event and metric timings when xhr times out', async () => {
    await browser.url(await browser.testHandle.assetURL('ajax/xhr-timeout.html'))
      .then(() => browser.waitForAgentLoad())
      .then(() => browser.execute(function () {
        window.disableAjaxHashChange = true
      }))

    const [ajaxEventsHarvest, ajaxMetricsHarvest] = await Promise.all([
      ajaxEventsCapture.waitForResult({ timeout: 10000 }),
      ajaxMetricsCapture.waitForResult({ timeout: 10000 }),
      $('#sendAjax').click()
    ])

    const ajaxEvent = ajaxEventsHarvest
      .flatMap(harvest => harvest.request.body)
      .find(event => event.path === '/delayed')
    // Ajax event should have a 0 callbackDuration when not picked up by the SPA feature
    expect(ajaxEvent.callbackDuration).toEqual(0)
    // Ajax event should have a 0 status when timed out
    expect(ajaxEvent.status).toEqual(0)

    const ajaxMetric = ajaxMetricsHarvest
      .flatMap(harvest => harvest.request.body.xhr)
      .find(metric => metric.params.pathname === '/delayed')
    // Callback duration should be 0 since the xhr timed out and the load handlers should not have ran
    expect(ajaxMetric.metrics.cbTime.t).toEqual(0)
    // Ajax metric should have a 0 status when timed out
    expect(ajaxMetric.params.status).toEqual(0)
  })

  it('produces no event and metric data when xhr is aborted', async () => {
    await browser.url(await browser.testHandle.assetURL('ajax/xhr-abort.html'))
      .then(() => browser.waitForAgentLoad())
      .then(() => browser.execute(function () {
        window.disableAjaxHashChange = true
      }))

    const [ajaxEventsHarvest, ajaxMetricsHarvest] = await Promise.all([
      ajaxEventsCapture.waitForResult({ timeout: 10000 }),
      ajaxMetricsCapture.waitForResult({ timeout: 10000 }),
      $('#sendAjax').click()
    ])

    const ajaxEvent = ajaxEventsHarvest
      .flatMap(harvest => harvest.request.body)
      .find(event => event.path === '/delayed')
    expect(ajaxEvent).toBeUndefined()

    const ajaxMetric = ajaxMetricsHarvest
      .flatMap(harvest => harvest.request.body.xhr)
      .find(metric => metric.params.pathname === '/delayed')
    expect(ajaxMetric).toBeUndefined()
  })

  it('produces event and metric with correct transmit and receive size calculated', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented.html'))
      .then(() => browser.waitForAgentLoad())

    const [ajaxEventsHarvest, ajaxMetricsHarvest] = await Promise.all([
      ajaxEventsCapture.waitForResult({ timeout: 10000 }),
      ajaxMetricsCapture.waitForResult({ timeout: 10000 }),
      browser.execute(function () {
        var xhr = new XMLHttpRequest()
        xhr.open('POST', '/echo')
        xhr.send('foobar-bizbaz')
      })
    ])

    ajaxEventsHarvest.forEach(harvest =>
      checkAjaxEvents(harvest.request, { specificPath: '/echo' })
    )
    ajaxMetricsHarvest.forEach(harvest =>
      checkAjaxMetrics(harvest.request, { specificPath: '/echo', isFetch: true })
    )

    const ajaxEvent = ajaxEventsHarvest
      .flatMap(harvest => harvest.request.body)
      .find(event => event.path === '/echo')
    expect(ajaxEvent.requestBodySize).toEqual(13)
    expect(ajaxEvent.responseBodySize).toEqual(13)

    const ajaxMetric = ajaxMetricsHarvest
      .flatMap(harvest => harvest.request.body.xhr)
      .find(metric => metric.params.pathname === '/echo')
    expect(ajaxMetric.metrics.txSize.t).toEqual(13)
    expect(ajaxMetric.metrics.rxSize.t).toEqual(13)
  })

  it('captures cats header in metric for same-origin xhr', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented.html'))
      .then(() => browser.waitForAgentLoad())

    const [ajaxMetricsHarvest] = await Promise.all([
      ajaxMetricsCapture.waitForResult({ timeout: 10000 }),
      browser.execute(function () {
        var xhr = new XMLHttpRequest()
        xhr.open('GET', '/xhr_with_cat/1')
        xhr.send()
      })
    ])

    const ajaxMetric = ajaxMetricsHarvest
      .flatMap(harvest => harvest.request.body.xhr)
      .find(metric => metric.params.pathname === '/xhr_with_cat/1')
    expect(ajaxMetric.params.cat).toEqual('foo')
  })

  it('does not capture cats header in metric for cross-origin xhr', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented.html'))
      .then(() => browser.waitForAgentLoad())

    const [ajaxMetricsHarvest] = await Promise.all([
      ajaxMetricsCapture.waitForResult({ timeout: 10000 }),
      browser.execute(function (host, port) {
        var xhr = new XMLHttpRequest()
        xhr.open('GET', 'http://' + host + ':' + port + '/xhr_with_cat/1')
        xhr.send()
      }, browser.testHandle.bamServerConfig.host, browser.testHandle.bamServerConfig.port)
    ])

    const ajaxMetric = ajaxMetricsHarvest
      .flatMap(harvest => harvest.request.body.xhr)
      .find(metric => metric.params.pathname === '/xhr_with_cat/1')
    expect(ajaxMetric.params.cat).toBeUndefined()
  })

  it('does not capture cats header in metric for same-origin xhr when header does not exist', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented.html'))
      .then(() => browser.waitForAgentLoad())

    const [ajaxMetricsHarvest] = await Promise.all([
      ajaxMetricsCapture.waitForResult({ timeout: 10000 }),
      browser.execute(function () {
        var xhr = new XMLHttpRequest()
        xhr.open('GET', '/xhr_no_cat')
        xhr.send()
      })
    ])

    const ajaxMetric = ajaxMetricsHarvest
      .flatMap(harvest => harvest.request.body.xhr)
      .find(metric => metric.params.pathname === '/xhr_no_cat')
    expect(ajaxMetric.params.cat).toBeUndefined()
  })

  it('produces event and metric with correct transmit and receive size calculated when using array buffer', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented.html'))
      .then(() => browser.waitForAgentLoad())

    const [ajaxEventsHarvest, ajaxMetricsHarvest] = await Promise.all([
      ajaxEventsCapture.waitForResult({ timeout: 10000 }),
      ajaxMetricsCapture.waitForResult({ timeout: 10000 }),
      browser.execute(function () {
        var xhr = new XMLHttpRequest()
        xhr.open('POST', '/postwithhi/arraybufferxhr')
        xhr.responseType = 'arraybuffer'
        xhr.setRequestHeader('Content-Type', 'text/plain')
        xhr.send((new Int8Array([104, 105, 33])).buffer)
      })
    ])

    const ajaxEvent = ajaxEventsHarvest
      .flatMap(harvest => harvest.request.body)
      .find(event => event.path === '/postwithhi/arraybufferxhr')
    // Firefox is different for some reason
    if (browserMatch(onlyFirefox)) {
      expect(ajaxEvent.requestBodySize).toEqual(2)
    } else {
      expect(ajaxEvent.requestBodySize).toEqual(3)
    }
    expect(ajaxEvent.responseBodySize).toEqual(3)

    const ajaxMetric = ajaxMetricsHarvest
      .flatMap(harvest => harvest.request.body.xhr)
      .find(metric => metric.params.pathname === '/postwithhi/arraybufferxhr')
    // Firefox is different for some reason
    if (browserMatch(onlyFirefox)) {
      expect(ajaxMetric.metrics.txSize.t).toEqual(2)
    } else {
      expect(ajaxMetric.metrics.txSize.t).toEqual(3)
    }
    expect(ajaxMetric.metrics.rxSize.t).toEqual(3)
  })

  it('produces event and metric with correct transmit and receive size calculated when using blob', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented.html'))
      .then(() => browser.waitForAgentLoad())

    const [ajaxEventsHarvest, ajaxMetricsHarvest] = await Promise.all([
      ajaxEventsCapture.waitForResult({ timeout: 10000 }),
      ajaxMetricsCapture.waitForResult({ timeout: 10000 }),
      browser.execute(function () {
        var xhr = new XMLHttpRequest()
        xhr.open('POST', '/postwithhi/blobxhr')
        xhr.responseType = 'blob'
        xhr.setRequestHeader('Content-Type', 'text/plain')
        xhr.send(new Blob(['hi!']))
      })
    ])

    const ajaxEvent = ajaxEventsHarvest
      .flatMap(harvest => harvest.request.body)
      .find(event => event.path === '/postwithhi/blobxhr')
    expect(ajaxEvent.requestBodySize).toEqual(3)
    expect(ajaxEvent.responseBodySize).toEqual(3)

    const ajaxMetric = ajaxMetricsHarvest
      .flatMap(harvest => harvest.request.body.xhr)
      .find(metric => metric.params.pathname === '/postwithhi/blobxhr')
    expect(ajaxMetric.metrics.txSize.t).toEqual(3)
    expect(ajaxMetric.metrics.rxSize.t).toEqual(3)
  })

  it('produces event and metric with correct transmit and receive size calculated when using form data', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented.html'))
      .then(() => browser.waitForAgentLoad())

    const [ajaxEventsHarvest, ajaxMetricsHarvest] = await Promise.all([
      ajaxEventsCapture.waitForResult({ timeout: 10000 }),
      ajaxMetricsCapture.waitForResult({ timeout: 10000 }),
      browser.execute(function () {
        var data = new FormData()
        data.append('name', 'bob')
        data.append('x', 5)

        var xhr = new XMLHttpRequest()
        xhr.open('POST', '/formdata')
        xhr.send(data)
      })
    ])

    const ajaxEvent = ajaxEventsHarvest
      .flatMap(harvest => harvest.request.body)
      .find(event => event.path === '/formdata')
    // We do not attempt to calculate txSize when FormData is used
    expect(ajaxEvent.requestBodySize).toEqual(0)
    expect(ajaxEvent.responseBodySize).toEqual(165)

    const ajaxMetric = ajaxMetricsHarvest
      .flatMap(harvest => harvest.request.body.xhr)
      .find(metric => metric.params.pathname === '/formdata')
    // We do not attempt to calculate txSize when FormData is used
    expect(ajaxMetric.metrics.txSize).toBeUndefined()
    expect(ajaxMetric.metrics.rxSize.t).toEqual(165)
  })

  it('produces event and metric with receive size calculated from the decompressed payload', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented.html'))
      .then(() => browser.waitForAgentLoad())

    const [ajaxEventsHarvest, ajaxMetricsHarvest] = await Promise.all([
      ajaxEventsCapture.waitForResult({ timeout: 10000 }),
      ajaxMetricsCapture.waitForResult({ timeout: 10000 }),
      browser.execute(function () {
        var xhr = new XMLHttpRequest()
        xhr.open('GET', '/gzipped')
        xhr.send()
      })
    ])

    const ajaxEvent = ajaxEventsHarvest
      .flatMap(harvest => harvest.request.body)
      .find(event => event.path === '/gzipped')
    expect(ajaxEvent.responseBodySize).toEqual(10000)

    const ajaxMetric = ajaxMetricsHarvest
      .flatMap(harvest => harvest.request.body.xhr)
      .find(metric => metric.params.pathname === '/gzipped')
    expect(ajaxMetric.metrics.rxSize.t).toEqual(10000)
  })

  it('produces event and metric with receive size calculated from the complete chunked payload', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented.html'))
      .then(() => browser.waitForAgentLoad())

    const [ajaxEventsHarvest, ajaxMetricsHarvest] = await Promise.all([
      ajaxEventsCapture.waitForResult({ timeout: 10000 }),
      ajaxMetricsCapture.waitForResult({ timeout: 10000 }),
      browser.execute(function () {
        var xhr = new XMLHttpRequest()
        xhr.open('GET', '/chunked')
        xhr.send()
      })
    ])

    const ajaxEvent = ajaxEventsHarvest
      .flatMap(harvest => harvest.request.body)
      .find(event => event.path === '/chunked')
    expect(ajaxEvent.responseBodySize).toEqual(10000)

    const ajaxMetric = ajaxMetricsHarvest
      .flatMap(harvest => harvest.request.body.xhr)
      .find(metric => metric.params.pathname === '/chunked')
    expect(ajaxMetric.metrics.rxSize.t).toEqual(10000)
  })

  it('properly wraps onreadystatechange function added before send call', async () => {
    await browser.url(await browser.testHandle.assetURL('ajax/xhr-readystate-before-send.html'))
      .then(() => browser.waitForAgentLoad())
      .then(() => browser.execute(function () {
        window.disableAjaxHashChange = true
      }))

    await Promise.all([
      ajaxEventsCapture.waitForResult({ timeout: 10000 }),
      $('#sendAjax').click()
    ])

    const readyStatesSeen = await browser.execute(function () {
      return window.readyStatesSeen
    })

    expect(readyStatesSeen).toEqual(expect.arrayContaining([
      [1, expect.stringContaining('nr@original')],
      [2, expect.stringContaining('nr@original')],
      [3, expect.stringContaining('nr@original')],
      [4, expect.stringContaining('nr@original')]
    ]))
  })

  it('properly wraps onreadystatechange function added after send call', async () => {
    await browser.url(await browser.testHandle.assetURL('ajax/xhr-readystate-after-send.html'))
      .then(() => browser.waitForAgentLoad())
      .then(() => browser.execute(function () {
        window.disableAjaxHashChange = true
      }))

    await Promise.all([
      ajaxEventsCapture.waitForResult({ timeout: 10000 }),
      $('#sendAjax').click()
    ])

    const readyStatesSeen = await browser.execute(function () {
      return window.readyStatesSeen
    })

    expect(readyStatesSeen).toEqual(expect.arrayContaining([
      [2, expect.stringContaining('nr@original')],
      [3, expect.stringContaining('nr@original')],
      [4, expect.stringContaining('nr@original')]
    ]))
  })

  it('creates event and metric data for xhr with bad 3rd party wrapping after agent', async () => {
    await browser.url(await browser.testHandle.assetURL('ajax/xhr-bad-wrapper-after.html'))
      .then(() => browser.waitForAgentLoad())
      .then(() => browser.execute(function () {
        window.disableAjaxHashChange = true
      }))

    const [ajaxEventsHarvest, ajaxMetricsHarvest] = await Promise.all([
      ajaxEventsCapture.waitForResult({ timeout: 10000 }),
      ajaxMetricsCapture.waitForResult({ timeout: 10000 }),
      $('#sendAjax').click()
    ])

    ajaxEventsHarvest.forEach(harvest =>
      checkAjaxEvents(harvest.request, { specificPath: '/json' })
    )
    ajaxMetricsHarvest.forEach(harvest =>
      checkAjaxMetrics(harvest.request, { specificPath: '/json', isFetch: true })
    )

    const ajaxEvent = ajaxEventsHarvest
      .flatMap(harvest => harvest.request.body)
      .find(event => event.path === '/json')
    expect(ajaxEvent.end).toBeGreaterThanOrEqual(ajaxEvent.start)
    expect(ajaxEvent.callbackEnd).toEqual(ajaxEvent.end)

    const ajaxMetric = ajaxMetricsHarvest
      .flatMap(harvest => harvest.request.body.xhr)
      .find(metric => metric.params.pathname === '/json')
    // Metric duration is not an exact calculation of `end - start`
    const calculatedDuration = ajaxEvent.end - ajaxEvent.start
    expect(ajaxMetric.metrics.duration.t).toBeWithin(calculatedDuration - 10, calculatedDuration + 11)
  })

  it('creates event and metric data for xhr with 3rd party listener patch after agent', async () => {
    await browser.url(await browser.testHandle.assetURL('ajax/xhr-patch-listener-after.html'))
      .then(() => browser.waitForAgentLoad())
      .then(() => browser.execute(function () {
        window.disableAjaxHashChange = true
      }))

    const [ajaxEventsHarvest, ajaxMetricsHarvest] = await Promise.all([
      ajaxEventsCapture.waitForResult({ timeout: 10000 }),
      ajaxMetricsCapture.waitForResult({ timeout: 10000 }),
      $('#sendAjax').click()
    ])

    ajaxEventsHarvest.forEach(harvest =>
      checkAjaxEvents(harvest.request, { specificPath: '/json' })
    )
    ajaxMetricsHarvest.forEach(harvest =>
      checkAjaxMetrics(harvest.request, { specificPath: '/json', isFetch: true })
    )

    const ajaxEvent = ajaxEventsHarvest
      .flatMap(harvest => harvest.request.body)
      .find(event => event.path === '/json')
    expect(ajaxEvent.end).toBeGreaterThanOrEqual(ajaxEvent.start)
    expect(ajaxEvent.callbackEnd).toEqual(ajaxEvent.end)

    const ajaxMetric = ajaxMetricsHarvest
      .flatMap(harvest => harvest.request.body.xhr)
      .find(metric => metric.params.pathname === '/json')
    // Metric duration is not an exact calculation of `end - start`
    const calculatedDuration = ajaxEvent.end - ajaxEvent.start
    expect(ajaxMetric.metrics.duration.t).toBeWithin(calculatedDuration - 10, calculatedDuration + 11)

    await expect(browser.execute(function () {
      return window.wrapperInvoked
    })).resolves.toEqual(true)
  })
})
