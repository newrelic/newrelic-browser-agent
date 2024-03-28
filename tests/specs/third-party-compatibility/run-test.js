export default async function runTest ({
  browser,
  testAsset,
  afterLoadCallback = () => { /* noop */ },
  afterUnloadCallback = () => { /* noop */ }
}) {
  const url = await browser.testHandle.assetURL(testAsset)

  const [rumResults, resourcesResults, eventsResults, ajaxResults] = await Promise.all([
    browser.testHandle.expectRum(),
    browser.testHandle.expectTrace(),
    browser.testHandle.expectEvents(),
    browser.testHandle.expectAjaxTimeSlices(),
    browser.url(url) // Setup expects before loading the page
      .then(() => browser.waitForAgentLoad())
  ])

  expect(rumResults.request.query.a).toEqual(expect.any(String))
  expect(rumResults.request.query.a.length).toBeGreaterThan(0)
  expect(rumResults.request.query.ref).toEqual(url.split('?')[0])

  expect(Array.isArray(resourcesResults.request.body)).toEqual(true)
  expect(resourcesResults.request.body.length).toBeGreaterThan(0)

  expect(Array.isArray(eventsResults.request.body)).toEqual(true)
  expect(eventsResults.request.body.length).toEqual(1)
  expect(eventsResults.request.body[0].trigger).toEqual('initialPageLoad')

  expect(Array.isArray(ajaxResults.request.body.xhr)).toEqual(true)
  expect(Array.isArray(ajaxResults.request.body.err)).toEqual(false)
  expect(ajaxResults.request.body.xhr.length).toBeGreaterThan(0)

  await afterLoadCallback({ rumResults, resourcesResults, eventsResults, ajaxResults })
  await browser.collectCoverage()
}
