describe('Ajax events to beacon endpoint', () => {
  it('not captured when blocked', async () => {
    let url = await browser.testHandle.assetURL('spa/ajax-deny-list.html', { init: { ajax: { block_internal: true } } })
    let nextAjaxReq = browser.testHandle.expectAjaxEvents(10000, true)
    await browser.url(url)

    await expect(nextAjaxReq).resolves.toBeUndefined()
  })

  it('captured when allowed', async () => {
    let url = await browser.testHandle.assetURL('spa/ajax-deny-list.html', { init: { ajax: { block_internal: false } } })
    let nextAjaxReq = browser.testHandle.expectAjaxEvents(10000)
    await browser.url(url)

    let correctXhrEvent = (await nextAjaxReq)?.request.body.some(ajaxNode => ajaxNode.domain.startsWith('bam-test-1.nr-local.net') && ajaxNode.path === '/json')
    expect(correctXhrEvent).toEqual(true)
  })
})
