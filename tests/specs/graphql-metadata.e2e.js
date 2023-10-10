import { notIE, notIOS } from '../../tools/browser-matcher/common-matchers.mjs'

// ios with saucelabs does not honor the window load to induce ajax into ixn reliably. omitting from test for now until more elegant solution is reached.
describe.withBrowsersMatching([notIE, notIOS])('GraphQL metadata is appended to relevant ajax calls', () => {
  it('adds GQL metadata to both standalone and interation ajax calls', async () => {
    await browser.url(await browser.testHandle.assetURL('test-builds/library-wrapper/apollo-client.html', { init: { ajax: { block_internal: false } } })) // Setup expects before loading the page

    const [ixnEvents] = await Promise.all([
      browser.testHandle.expectInteractionEvents(),
      browser.waitForAgentLoad()
    ])

    const [ajaxEvents] = await Promise.all([
      browser.testHandle.expectAjaxEvents(),
      browser.execute(function () {
        window.sendGQL()
      })])

    const ixnJson = ixnEvents.request.body[0].children.find(x => x.domain.includes('flyby-router'))
    const ajaxJson = ajaxEvents.request.body.find(x => x.domain.includes('flyby-router')) // apollo's test server

    // operationName: `initialPageLoad` is called during page load (page load browser ixn)
    expect(ixnJson.children).toEqual(expect.arrayContaining([
      {
        type: 'stringAttribute',
        key: 'operationName',
        value: 'initialPageLoad'
      },
      { type: 'stringAttribute', key: 'operationType', value: 'query' },
      { type: 'stringAttribute', key: 'operationFramework', value: 'GraphQL' }
    ]))

    // operationName: `standalone` is called when we execute `window.sendGQL()` (standalone ajax)
    expect(ajaxJson.children).toEqual(expect.arrayContaining([
      {
        type: 'stringAttribute',
        key: 'operationName',
        value: 'standalone'
      },
      { type: 'stringAttribute', key: 'operationType', value: 'query' },
      { type: 'stringAttribute', key: 'operationFramework', value: 'GraphQL' }
    ]))
  })
})
