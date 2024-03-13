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
})
