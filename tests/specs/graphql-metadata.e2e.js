import { testAjaxEventsRequest, testInteractionEventsRequest } from '../../tools/testing-server/utils/expect-tests'

describe('GraphQL metadata is appended to relevant ajax calls', () => {
  it('adds GQL metadata to both standalone and interaction ajax calls', async () => {
    const [transactionEventsCapture, ajaxEventsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testInteractionEventsRequest },
      { test: testAjaxEventsRequest }
    ])

    const [transactionEventsHarvests] = await Promise.all([
      transactionEventsCapture.waitForResult({ totalCount: 1 }),
      await browser.url(
        await browser.testHandle.assetURL(
          'test-builds/library-wrapper/apollo-client.html',
          { init: { ajax: { block_internal: false } } })
      )
    ])

    const [ajaxEventsHarvests] = await Promise.all([
      ajaxEventsCapture.waitForResult({ timeout: 10000 }),
      browser.execute(function () {
        window.sendGQL()
      })])

    // operationName: `initialPageLoad` is called during page load (page load browser ixn)
    expect(transactionEventsHarvests[0].request.body).toEqual(expect.arrayContaining([expect.objectContaining({
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
    const gqlHarvest = ajaxEventsHarvests.find(harvest =>
      harvest.request.body.some(event => event.children.some(child => child.key === 'operationName' && child.value === 'standalone'))
    )
    expect(gqlHarvest.request.body).toEqual(expect.arrayContaining([expect.objectContaining({
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
