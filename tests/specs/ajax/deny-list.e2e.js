import { supportsFetch } from '../../../tools/browser-matcher/common-matchers.mjs'
import { extractAjaxEvents } from '../../util/xhr'

describe('xhr events deny list', () => {
  it('does not capture events when blocked', async () => {
    const [ajaxEvents, interactionEvents] = await Promise.all([
      browser.testHandle.expectAjaxEvents(10000, true),
      browser.testHandle.expectInteractionEvents(),
      browser.url(await browser.testHandle.assetURL('spa/ajax-deny-list.html', { init: { ajax: { block_internal: true } } }))
    ])

    expect(ajaxEvents).toBeUndefined()
    expect(extractAjaxEvents(interactionEvents.request.body)).not.toEqual(expect.arrayContaining([
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
    const [interactionEvents] = await Promise.all([
      browser.testHandle.expectInteractionEvents(),
      browser.url(await browser.testHandle.assetURL('spa/ajax-deny-list.html', { init: { ajax: { block_internal: false } } }))
    ])

    expect(extractAjaxEvents(interactionEvents.request.body)).toEqual(expect.arrayContaining([
      expect.objectContaining({
        domain: expect.stringContaining('bam-test-1.nr-local.net'),
        path: '/json',
        type: 'ajax',
        requestedWith: 'XMLHttpRequest'
      }),
      ...(browserMatch(supportsFetch)
        ? [
            expect.objectContaining({
              domain: expect.stringContaining('bam-test-1.nr-local.net'),
              path: '/json',
              type: 'ajax',
              requestedWith: 'fetch'
            })
          ]
        : [])
    ]))
  })

  it('does not capture metrics when blocked and feature flag is enabled', async () => {
    const [ajaxMetrics] = await Promise.all([
      browser.testHandle.expectAjaxTimeSlices(10000, true),
      browser.url(await browser.testHandle.assetURL('spa/ajax-deny-list.html', { init: { ajax: { block_internal: true }, feature_flags: ['ajax_metrics_deny_list'] } }))
    ])

    expect(ajaxMetrics).toBeUndefined()
  })

  it('captures metrics when feature flag is not present', async () => {
    const [ajaxMetrics] = await Promise.all([
      browser.testHandle.expectAjaxTimeSlices(),
      browser.url(await browser.testHandle.assetURL('spa/ajax-deny-list.html', { init: { ajax: { block_internal: true } } }))
    ])

    expect(ajaxMetrics.request.body.xhr).toEqual(expect.arrayContaining([
      expect.objectContaining({
        params: expect.objectContaining({
          hostname: browser.testHandle.bamServerConfig.host
        })
      })
    ]))
  })

  it.withBrowsersMatching(supportsFetch)('does not capture data URLs (or events with undefined hostname) at all', async () => {
    const url = await browser.testHandle.assetURL('instrumented.html') // has no deny list
    await browser.url(url).then(() => browser.waitForAgentLoad())

    const [ajaxEvents, ajaxMetrics] = await Promise.all([
      browser.testHandle.expectAjaxEvents(),
      browser.testHandle.expectAjaxTimeSlices(),
      browser.execute(function () {
        fetch('data:,Hello%2C%20World%21')
      })
    ])

    const undefinedDomainEvt = ajaxEvents.request.body.find(obj => obj.domain.startsWith('undefined'))
    expect(undefinedDomainEvt).toBeUndefined()
    const undefinedHostMetric = ajaxMetrics.request.body.xhr.find(obj => obj.params.host.startsWith('undefined'))
    expect(undefinedHostMetric).toBeUndefined()
  })
})
