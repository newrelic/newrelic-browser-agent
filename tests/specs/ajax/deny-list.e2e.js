import { extractAjaxEvents } from '../../util/xhr'
import { testAjaxEventsRequest, testAjaxTimeSlicesRequest, testInteractionEventsRequest } from '../../../tools/testing-server/utils/expect-tests'

describe('xhr events deny list', () => {
  it('does not capture events when blocked', async () => {
    const [ajaxCapture, spaCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testAjaxEventsRequest },
      { test: testInteractionEventsRequest }
    ])
    const [ajaxEvents, interactionEvents] = await Promise.all([
      ajaxCapture.waitForResult({ timeout: 10000 }),
      spaCapture.waitForResult({ totalCount: 1 }),
      browser.url(await browser.testHandle.assetURL('spa/ajax-deny-list.html', { init: { ajax: { block_internal: true } } }))
    ])

    expect(ajaxEvents.length).toEqual(0)
    expect(extractAjaxEvents(interactionEvents[0].request.body)).not.toEqual(expect.arrayContaining([
      expect.objectContaining({
        domain: expect.stringContaining('bam-test-1.nr-local.net'),
        path: '/json',
        type: 'ajax',
        requestedWith: 'XMLHttpRequest'
      }),
      expect.objectContaining({
        domain: expect.stringContaining('bam-test-1.nr-local.net'),
        path: '/json',
        type: 'ajax',
        requestedWith: 'fetch'
      })
    ]))
  })

  it('captures events when not blocked', async () => {
    const interactionCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testInteractionEventsRequest })

    const [interactionEvents] = await Promise.all([
      interactionCapture.waitForResult({ totalCount: 1 }),
      browser.url(await browser.testHandle.assetURL('spa/ajax-deny-list.html', { init: { ajax: { block_internal: false } } }))
    ])

    expect(extractAjaxEvents(interactionEvents[0].request.body)).toEqual(expect.arrayContaining([
      expect.objectContaining({
        domain: expect.stringContaining('bam-test-1.nr-local.net'),
        path: '/json',
        type: 'ajax',
        requestedWith: 'XMLHttpRequest'
      }),
      expect.objectContaining({
        domain: expect.stringContaining('bam-test-1.nr-local.net'),
        path: '/json',
        type: 'ajax',
        requestedWith: 'fetch'
      })
    ]))
  })

  it('does not capture metrics when blocked and feature flag is enabled', async () => {
    const ajaxCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testAjaxTimeSlicesRequest })

    const [ajaxMetrics] = await Promise.all([
      ajaxCapture.waitForResult({ timeout: 10000 }),
      browser.url(await browser.testHandle.assetURL('spa/ajax-deny-list.html', { init: { ajax: { block_internal: true }, feature_flags: ['ajax_metrics_deny_list'] } }))
    ])

    expect(ajaxMetrics.length).toEqual(0)
  })

  it('captures metrics when feature flag is not present', async () => {
    const ajaxCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testAjaxTimeSlicesRequest })

    const [ajaxMetrics] = await Promise.all([
      ajaxCapture.waitForResult({ totalCount: 1 }),
      browser.url(await browser.testHandle.assetURL('spa/ajax-deny-list.html', { init: { ajax: { block_internal: true } } }))
    ])

    expect(ajaxMetrics[0].request.body.xhr).toEqual(expect.arrayContaining([
      expect.objectContaining({
        params: expect.objectContaining({
          hostname: browser.testHandle.bamServerConfig.host
        })
      })
    ]))
  })

  it('does not capture data URLs (or events with undefined hostname) at all', async () => {
    const [ajaxTimeSliceCapture, ajaxEventsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testAjaxTimeSlicesRequest },
      { test: testAjaxEventsRequest }
    ])

    await browser.url(
      await browser.testHandle.assetURL('instrumented.html')
    ).then(() => browser.waitForAgentLoad())

    const [ajaxMetrics, ajaxEvents] = await Promise.all([
      ajaxTimeSliceCapture.waitForResult({ timeout: 10000 }),
      ajaxEventsCapture.waitForResult({ timeout: 10000 }),
      browser.execute(function () {
        fetch('data:,Hello%2C%20World%21')
      })
    ])

    const undefinedDomainEvt = ajaxEvents
      .flatMap(harvest => harvest.request.body)
      .find(obj => obj.domain.startsWith('undefined'))
    expect(undefinedDomainEvt).toBeUndefined()

    const undefinedHostMetric = ajaxMetrics
      .flatMap(harvest => harvest.request.body)
      .flatMap(harvest => harvest.xhr)
      .find(obj => obj.params.host.startsWith('undefined'))
    expect(undefinedHostMetric).toBeUndefined()
  })
})
