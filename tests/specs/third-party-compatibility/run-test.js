export default async function runTest ({
  browser,
  testAsset,
  afterLoadCallback = () => { /* noop */ },
  afterUnloadCallback = () => { /* noop */ }
}) {
  const url = await browser.testHandle.assetURL(testAsset)

  const [rumResults, resourcesResults, eventsResults, ajaxResults] = await Promise.all([
    browser.testHandle.expectRum(),
    browser.testHandle.expectResources(),
    browser.testHandle.expectEvents(),
    browser.testHandle.expectAjaxTimeSlices(),
    browser.url(url) // Setup expects before loading the page
  ])

  expect(rumResults.request.query.a).toEqual(expect.any(String))
  expect(rumResults.request.query.a.length).toBeGreaterThan(0)
  expect(rumResults.request.query.ref).toEqual(url.split('?')[0])

  expect(Array.isArray(resourcesResults.request.body.res)).toEqual(true)
  expect(resourcesResults.request.body.res.length).toBeGreaterThan(0)

  expect(Array.isArray(eventsResults.request.body)).toEqual(true)
  expect(eventsResults.request.body.length).toEqual(1)
  expect(eventsResults.request.body[0].trigger).toEqual('initialPageLoad')

  expect(Array.isArray(ajaxResults.request.body.xhr)).toEqual(true)
  expect(Array.isArray(ajaxResults.request.body.err)).toEqual(false)
  expect(ajaxResults.request.body.xhr.length).toBeGreaterThan(0)

  await afterLoadCallback({ rumResults, resourcesResults, eventsResults, ajaxResults })

  const [unloadEventsResults, unloadMetricsResults] = await Promise.all([
    browser.testHandle.expectEvents(),
    browser.testHandle.expectMetrics(),
    await browser.url(
      await browser.testHandle.assetURL('/')
    ) // Setup expects before navigating
  ])

  expect(Array.isArray(unloadEventsResults.request.body)).toEqual(true)
  expect(unloadEventsResults.request.body.findIndex(e => e.name === 'unload')).toBeGreaterThan(-1)
  expect(unloadEventsResults.request.body.findIndex(e => e.name === 'pageHide')).toBeGreaterThan(-1)

  expect(Array.isArray(unloadMetricsResults.request.body.sm)).toEqual(true)
  expect(unloadMetricsResults.request.body.sm.length).toBeGreaterThan(0)

  await afterUnloadCallback({ unloadEventsResults, unloadMetricsResults })
}
