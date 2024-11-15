import { onlyFirefox } from '../../../tools/browser-matcher/common-matchers.mjs'
import { checkAjaxEvents, checkAjaxMetrics } from '../../util/basic-checks'
import { testAjaxEventsRequest, testAjaxTimeSlicesRequest } from '../../../tools/testing-server/utils/expect-tests'

describe('Fetch Ajax', () => {
  let ajaxEventsCapture
  let ajaxMetricsCapture

  beforeEach(async () => {
    [ajaxEventsCapture, ajaxMetricsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testAjaxEventsRequest },
      { test: testAjaxTimeSlicesRequest }
    ])
  })

  ;[
    { title: 'fetch', url: 'ajax/fetch-simple.html' },
    { title: 'fetch with url param', url: 'ajax/fetch-url-param.html' },
    { title: 'fetch with request param', url: 'ajax/fetch-request-param.html' }
  ].forEach(({ title, url }) => {
    it(`creates event and metric data for ${title}`, async () => {
      await browser.url(await browser.testHandle.assetURL(url))
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
  })

  it('creates event and metric data for erred fetch', async () => {
    await browser.url(await browser.testHandle.assetURL('ajax/fetch-404.html'))
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

  it('creates event and metric data for fetch with network error', async () => {
    await browser.url(await browser.testHandle.assetURL('ajax/fetch-network-error.html'))
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

  ;[
    { title: 'promise resolved callbacks', url: 'ajax/fetch-promise-resolve.html' },
    { title: 'promise rejected callbacks', url: 'ajax/fetch-promise-reject.html' },
    { title: 'async resolved callbacks', url: 'ajax/fetch-async-resolve.html' },
    { title: 'async rejected callbacks', url: 'ajax/fetch-async-reject.html' }
  ].forEach(({ title, url }) => {
    it(`does not capture fetch ${title} in metric timings`, async () => {
      await browser.url(await browser.testHandle.assetURL(url))
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
      // Callback duration is not captured for fetch calls
      expect(ajaxEvent.callbackDuration).toEqual(0)

      const ajaxMetric = ajaxMetricsHarvest
        .flatMap(harvest => harvest.request.body.xhr)
        .find(metric => metric.params.pathname === '/json')
      // Callback duration is not captured for fetch calls
      expect(ajaxMetric.metrics.cbTime).toBeUndefined()
    })
  })

  it('produces the correct event and metric status when fetch times out or is aborted', async () => {
    await browser.url(await browser.testHandle.assetURL('ajax/fetch-timeout.html'))
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
      checkAjaxEvents(harvest.request, { specificPath: '/delayed' })
    )
    ajaxMetricsHarvest.forEach(harvest =>
      checkAjaxMetrics(harvest.request, { specificPath: '/delayed', isFetch: true })
    )

    const ajaxEvent = ajaxEventsHarvest
      .flatMap(harvest => harvest.request.body)
      .find(event => event.path === '/delayed')
    // Ajax event should have a 0 status when timed out
    expect(ajaxEvent.status).toEqual(0)

    const ajaxMetric = ajaxMetricsHarvest
      .flatMap(harvest => harvest.request.body.xhr)
      .find(metric => metric.params.pathname === '/delayed')
    // Ajax metric should have a 0 status when timed out
    expect(ajaxMetric.params.status).toEqual(0)
  })

  it('produces event and metric with correct transmit size calculated', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented.html'))
      .then(() => browser.waitForAgentLoad())

    const [ajaxEventsHarvest, ajaxMetricsHarvest] = await Promise.all([
      ajaxEventsCapture.waitForResult({ timeout: 10000 }),
      ajaxMetricsCapture.waitForResult({ timeout: 10000 }),
      browser.execute(function () {
        fetch('/echo', {
          method: 'POST',
          body: 'foobar-bizbaz'
        })
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

  it('produces event and metric with correct transmit and receive size calculated when using array buffer', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented.html'))
      .then(() => browser.waitForAgentLoad())

    const [ajaxEventsHarvest, ajaxMetricsHarvest] = await Promise.all([
      ajaxEventsCapture.waitForResult({ timeout: 10000 }),
      ajaxMetricsCapture.waitForResult({ timeout: 10000 }),
      browser.execute(function () {
        fetch('/postwithhi/arraybufferfetch', {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain'
          },
          body: (new Int8Array([104, 105, 33])).buffer
        })
      })
    ])

    const ajaxEvent = ajaxEventsHarvest
      .flatMap(harvest => harvest.request.body)
      .find(event => event.path === '/postwithhi/arraybufferfetch')
    // Firefox is different for some reason
    if (browserMatch(onlyFirefox)) {
      expect(ajaxEvent.requestBodySize).toEqual(2)
    } else {
      expect(ajaxEvent.requestBodySize).toEqual(3)
    }
    expect(ajaxEvent.responseBodySize).toEqual(3)

    const ajaxMetric = ajaxMetricsHarvest
      .flatMap(harvest => harvest.request.body.xhr)
      .find(metric => metric.params.pathname === '/postwithhi/arraybufferfetch')
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
        fetch('/postwithhi/blobfetch', {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain'
          },
          body: new Blob(['hi!'])
        })
      })
    ])

    const ajaxEvent = ajaxEventsHarvest
      .flatMap(harvest => harvest.request.body)
      .find(event => event.path === '/postwithhi/blobfetch')
    expect(ajaxEvent.requestBodySize).toEqual(3)
    expect(ajaxEvent.responseBodySize).toEqual(3)

    const ajaxMetric = ajaxMetricsHarvest
      .flatMap(harvest => harvest.request.body.xhr)
      .find(metric => metric.params.pathname === '/postwithhi/blobfetch')
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

        fetch('/formdata', {
          method: 'POST',
          body: data
        })
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
    expect(ajaxMetric.metrics.txSize.t).toEqual(0)
    expect(ajaxMetric.metrics.rxSize.t).toEqual(165)
  })

  it('produces event and metric with zero receive size due to the use of compression', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented.html'))
      .then(() => browser.waitForAgentLoad())

    const [ajaxEventsHarvest, ajaxMetricsHarvest] = await Promise.all([
      ajaxEventsCapture.waitForResult({ timeout: 10000 }),
      ajaxMetricsCapture.waitForResult({ timeout: 10000 }),
      browser.execute(function () {
        fetch('/gzipped')
      })
    ])

    const ajaxEvent = ajaxEventsHarvest
      .flatMap(harvest => harvest.request.body)
      .find(event => event.path === '/gzipped')
    expect(ajaxEvent.responseBodySize).toEqual(0)

    const ajaxMetric = ajaxMetricsHarvest
      .flatMap(harvest => harvest.request.body.xhr)
      .find(metric => metric.params.pathname === '/gzipped')
    expect(ajaxMetric.metrics.rxSize.t).toBeUndefined()
    expect(ajaxMetric.metrics.rxSize.c).toEqual(1)
  })

  it('produces event and metric with zero receive size due to the use of chunked payload', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented.html'))
      .then(() => browser.waitForAgentLoad())

    const [ajaxEventsHarvest, ajaxMetricsHarvest] = await Promise.all([
      ajaxEventsCapture.waitForResult({ timeout: 10000 }),
      ajaxMetricsCapture.waitForResult({ timeout: 10000 }),
      browser.execute(function () {
        fetch('/chunked')
      })
    ])

    const ajaxEvent = ajaxEventsHarvest
      .flatMap(harvest => harvest.request.body)
      .find(event => event.path === '/chunked')
    expect(ajaxEvent.responseBodySize).toEqual(0)

    const ajaxMetric = ajaxMetricsHarvest
      .flatMap(harvest => harvest.request.body.xhr)
      .find(metric => metric.params.pathname === '/chunked')
    expect(ajaxMetric.metrics.rxSize.t).toBeUndefined()
    expect(ajaxMetric.metrics.rxSize.c).toEqual(1)
  })
})
