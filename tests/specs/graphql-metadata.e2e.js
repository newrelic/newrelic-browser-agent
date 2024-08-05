import { notMobile } from '../../tools/browser-matcher/common-matchers.mjs'

// ios+android with saucelabs does not honor the window load to induce ajax into ixn reliably. omitting from test for now until more elegant solution is reached.
describe.withBrowsersMatching(notMobile)('GraphQL metadata is appended to relevant ajax calls', () => {
  it('adds GQL metadata to both standalone and interation ajax calls', async () => {
    const [ixnEvents] = await Promise.all([
      browser.testHandle.expectInteractionEvents(),
      await browser.url(
        await browser.testHandle.assetURL(
          'test-builds/library-wrapper/apollo-client.html',
          { init: { ajax: { block_internal: false } } })
      )
    ])

    const [ajaxEvents] = await Promise.all([
      browser.testHandle.expectAjaxEvents(),
      browser.execute(function () {
        window.sendGQL()
      })])

    // operationName: `initialPageLoad` is called during page load (page load browser ixn)
    expect(ixnEvents.request.body).toEqual(expect.arrayContaining([expect.objectContaining({
      type: 'interaction',
      trigger: 'initialPageLoad',
      children: expect.arrayContaining([expect.objectContaining({
        type: 'ajax',
        domain: 'flyby-router-demo.herokuapp.com:443',
        children: expect.arrayContaining([
          {
            type: 'stringAttribute',
            key: 'operationName',
            value: 'initialPageLoad'
          },
          { type: 'stringAttribute', key: 'operationType', value: 'query' },
          { type: 'stringAttribute', key: 'operationFramework', value: 'GraphQL' }
        ])
      })])
    })]))

    // operationName: `standalone` is called when we execute `window.sendGQL()` (standalone ajax)
    expect(ajaxEvents.request.body).toEqual(expect.arrayContaining([expect.objectContaining({
      type: 'ajax',
      domain: 'flyby-router-demo.herokuapp.com:443',
      children: expect.arrayContaining([
        {
          type: 'stringAttribute',
          key: 'operationName',
          value: 'standalone'
        },
        { type: 'stringAttribute', key: 'operationType', value: 'query' },
        { type: 'stringAttribute', key: 'operationFramework', value: 'GraphQL' }
      ])
    })]))
  })
})
