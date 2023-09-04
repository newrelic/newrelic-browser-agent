import { faker } from '@faker-js/faker'
import { testResourcesRequest } from '../../../tools/testing-server/utils/expect-tests'

describe('harvesting', () => {
  it('should include the base query parameters', async () => {
    const testURL = await browser.testHandle.assetURL('obfuscate-pii.html', {
      config: {
        sa: 1
      },
      init: {
        privacy: {
          cookies_enabled: true
        }
      }
    })

    const [
      rumResults,
      resourcesResults,
      interactionResults,
      timingsResults,
      ajaxSliceResults,
      ajaxEventsResults,
      insResults
    ] = await Promise.all([
      browser.testHandle.expectRum(),
      browser.testHandle.expectResources(),
      browser.testHandle.expectInteractionEvents(),
      browser.testHandle.expectTimings(),
      browser.testHandle.expectAjaxTimeSlices(),
      browser.testHandle.expectAjaxEvents(),
      browser.testHandle.expectIns(),
      browser.url(testURL)
        .then(() => browser.waitForAgentLoad())
        .then(() => $('a').click())
    ])

    const expectedURL = testURL.split('?')[0]
    verifyBaseQueryParameters(rumResults.request.query, expectedURL)
    verifyBaseQueryParameters(resourcesResults.request.query, expectedURL, 'session_trace')
    verifyBaseQueryParameters(interactionResults.request.query, expectedURL)
    verifyBaseQueryParameters(timingsResults.request.query, expectedURL)
    verifyBaseQueryParameters(ajaxSliceResults.request.query, expectedURL)
    verifyBaseQueryParameters(ajaxEventsResults.request.query, expectedURL)
    verifyBaseQueryParameters(insResults.request.query, expectedURL)
  })

  it('should include the ptid query parameter on requests after the first session trace harvest', async () => {
    const ptid = faker.datatype.uuid()
    browser.testHandle.scheduleReply('bamServer', {
      test: testResourcesRequest,
      body: ptid
    })

    await Promise.all([
      browser.testHandle.expectRum(),
      browser.testHandle.expectResources(),
      browser.url(await browser.testHandle.assetURL('obfuscate-pii.html'))
        .then(() => browser.waitForAgentLoad())
    ])

    const [
      resourcesResults,
      timingsResults,
      ajaxSliceResults,
      ajaxEventsResults
    ] = await Promise.all([
      browser.testHandle.expectResources(),
      browser.testHandle.expectTimings(),
      browser.testHandle.expectAjaxTimeSlices(),
      browser.testHandle.expectAjaxEvents()
    ])

    expect(timingsResults.request.query.ptid).toEqual(ptid)
    expect(ajaxSliceResults.request.query.ptid).toEqual(ptid)
    expect(ajaxEventsResults.request.query.ptid).toEqual(ptid)
    expect(resourcesResults.request.query.ptid).toEqual(ptid)
  })

  it('should include the transaction name (transactionName) passed in the info block in the query parameters', async () => {
    const transactionName = faker.datatype.uuid()
    const testURL = await browser.testHandle.assetURL('obfuscate-pii.html', {
      config: {
        transactionName
      }
    })

    const [
      rumResults,
      resourcesResults,
      interactionResults,
      timingsResults,
      ajaxSliceResults,
      ajaxEventsResults,
      insResults
    ] = await Promise.all([
      browser.testHandle.expectRum(),
      browser.testHandle.expectResources(),
      browser.testHandle.expectInteractionEvents(),
      browser.testHandle.expectTimings(),
      browser.testHandle.expectAjaxTimeSlices(),
      browser.testHandle.expectAjaxEvents(),
      browser.testHandle.expectIns(),
      browser.url(testURL)
        .then(() => browser.waitForAgentLoad())
        .then(() => $('a').click())
    ])

    expect(rumResults.request.query.to).toEqual(transactionName)
    expect(resourcesResults.request.query.to).toEqual(transactionName)
    expect(interactionResults.request.query.to).toEqual(transactionName)
    expect(timingsResults.request.query.to).toEqual(transactionName)
    expect(ajaxSliceResults.request.query.to).toEqual(transactionName)
    expect(ajaxEventsResults.request.query.to).toEqual(transactionName)
    expect(insResults.request.query.to).toEqual(transactionName)
  })

  it('should include the transaction name (tNamePlain) passed in the info block in the query parameters', async () => {
    const transactionName = faker.datatype.uuid()
    const testURL = await browser.testHandle.assetURL('obfuscate-pii.html', {
      config: {
        tNamePlain: transactionName
      }
    })
    const [
      rumResults,
      resourcesResults,
      interactionResults,
      timingsResults,
      ajaxSliceResults,
      ajaxEventsResults,
      insResults
    ] = await Promise.all([
      browser.testHandle.expectRum(),
      browser.testHandle.expectResources(),
      browser.testHandle.expectInteractionEvents(),
      browser.testHandle.expectTimings(),
      browser.testHandle.expectAjaxTimeSlices(),
      browser.testHandle.expectAjaxEvents(),
      browser.testHandle.expectIns(),
      browser.url(testURL)
        .then(() => browser.waitForAgentLoad())
        .then(() => $('a').click())
    ])

    expect(rumResults.request.query.t).toEqual(transactionName)
    expect(rumResults.request.query.to).toBeUndefined()
    expect(resourcesResults.request.query.t).toEqual(transactionName)
    expect(resourcesResults.request.query.to).toBeUndefined()
    expect(interactionResults.request.query.t).toEqual(transactionName)
    expect(interactionResults.request.query.to).toBeUndefined()
    expect(timingsResults.request.query.t).toEqual(transactionName)
    expect(timingsResults.request.query.to).toBeUndefined()
    expect(ajaxSliceResults.request.query.t).toEqual(transactionName)
    expect(ajaxSliceResults.request.query.to).toBeUndefined()
    expect(ajaxEventsResults.request.query.t).toEqual(transactionName)
    expect(ajaxEventsResults.request.query.to).toBeUndefined()
    expect(insResults.request.query.t).toEqual(transactionName)
    expect(insResults.request.query.to).toBeUndefined()
  })

  it('should always take the transactionName info parameter over the tNamePlan info parameter for the transaction name query parameter', async () => {
    const transactionName = faker.datatype.uuid()
    const testURL = await browser.testHandle.assetURL('obfuscate-pii.html', {
      config: {
        tNamePlain: faker.datatype.uuid(),
        transactionName
      }
    })

    const [
      rumResults,
      resourcesResults,
      interactionResults,
      timingsResults,
      ajaxSliceResults,
      ajaxEventsResults,
      insResults
    ] = await Promise.all([
      browser.testHandle.expectRum(),
      browser.testHandle.expectResources(),
      browser.testHandle.expectInteractionEvents(),
      browser.testHandle.expectTimings(),
      browser.testHandle.expectAjaxTimeSlices(),
      browser.testHandle.expectAjaxEvents(),
      browser.testHandle.expectIns(),
      browser.url(testURL)
        .then(() => browser.waitForAgentLoad())
        .then(() => $('a').click())
    ])

    expect(rumResults.request.query.to).toEqual(transactionName)
    expect(rumResults.request.query.t).toBeUndefined()
    expect(resourcesResults.request.query.to).toEqual(transactionName)
    expect(resourcesResults.request.query.t).toBeUndefined()
    expect(interactionResults.request.query.to).toEqual(transactionName)
    expect(interactionResults.request.query.t).toBeUndefined()
    expect(timingsResults.request.query.to).toEqual(transactionName)
    expect(timingsResults.request.query.t).toBeUndefined()
    expect(ajaxSliceResults.request.query.to).toEqual(transactionName)
    expect(ajaxSliceResults.request.query.t).toBeUndefined()
    expect(ajaxEventsResults.request.query.to).toEqual(transactionName)
    expect(ajaxEventsResults.request.query.t).toBeUndefined()
    expect(insResults.request.query.to).toEqual(transactionName)
    expect(insResults.request.query.t).toBeUndefined()
  })

  it('should update the ref query parameter when url is changes using pushState during load', async () => {
    const originalURL = await browser.testHandle.assetURL('referrer-pushstate.html')
    const redirectURL = await browser.testHandle.assetURL('instrumented.html')

    const [
      rumResults,
      resourcesResults,
      interactionResults,
      timingsResults,
      ajaxSliceResults,
      ajaxEventsResults
    ] = await Promise.all([
      browser.testHandle.expectRum(),
      browser.testHandle.expectResources(),
      browser.testHandle.expectInteractionEvents(),
      browser.testHandle.expectTimings(),
      browser.testHandle.expectAjaxTimeSlices(),
      browser.testHandle.expectAjaxEvents(),
      browser.url(originalURL)
        .then(() => browser.waitForAgentLoad())
    ])

    const expectedURL = redirectURL.split('?')[0]
    expect(rumResults.request.query.ref).toEqual(expectedURL)
    expect(resourcesResults.request.query.ref).toEqual(expectedURL)
    expect(interactionResults.request.query.ref).toEqual(expectedURL)
    expect(timingsResults.request.query.ref).toEqual(expectedURL)
    expect(ajaxSliceResults.request.query.ref).toEqual(expectedURL)
    expect(ajaxEventsResults.request.query.ref).toEqual(expectedURL)
  })

  it('should update the ref query parameter when url is changes using replaceState during load', async () => {
    const originalURL = await browser.testHandle.assetURL('referrer-replacestate.html')
    const redirectURL = await browser.testHandle.assetURL('instrumented.html')

    const [
      rumResults,
      resourcesResults,
      interactionResults,
      timingsResults,
      ajaxSliceResults,
      ajaxEventsResults
    ] = await Promise.all([
      browser.testHandle.expectRum(),
      browser.testHandle.expectResources(),
      browser.testHandle.expectInteractionEvents(),
      browser.testHandle.expectTimings(),
      browser.testHandle.expectAjaxTimeSlices(),
      browser.testHandle.expectAjaxEvents(),
      browser.url(originalURL)
        .then(() => browser.waitForAgentLoad())
    ])

    const expectedURL = redirectURL.split('?')[0]
    expect(rumResults.request.query.ref).toEqual(expectedURL)
    expect(resourcesResults.request.query.ref).toEqual(expectedURL)
    expect(interactionResults.request.query.ref).toEqual(expectedURL)
    expect(timingsResults.request.query.ref).toEqual(expectedURL)
    expect(ajaxSliceResults.request.query.ref).toEqual(expectedURL)
    expect(ajaxEventsResults.request.query.ref).toEqual(expectedURL)
  })

  it('should set session query parameter to 0 when cookies_enabled is false', async () => {
    const testURL = await browser.testHandle.assetURL('obfuscate-pii.html', {
      init: {
        privacy: {
          cookies_enabled: false
        }
      }
    })

    const [
      rumResults,
      resourcesResults,
      interactionResults,
      timingsResults,
      ajaxSliceResults,
      ajaxEventsResults
    ] = await Promise.all([
      browser.testHandle.expectRum(),
      browser.testHandle.expectResources(),
      browser.testHandle.expectInteractionEvents(),
      browser.testHandle.expectTimings(),
      browser.testHandle.expectAjaxTimeSlices(),
      browser.testHandle.expectAjaxEvents(),
      browser.url(testURL)
        .then(() => browser.waitForAgentLoad())
    ])

    expect(rumResults.request.query.s).toEqual('0')
    expect(resourcesResults.request.query.s).toEqual('0')
    expect(interactionResults.request.query.s).toEqual('0')
    expect(timingsResults.request.query.s).toEqual('0')
    expect(ajaxSliceResults.request.query.s).toEqual('0')
    expect(ajaxEventsResults.request.query.s).toEqual('0')
  })

  it('should not harvest features when there is no data', async () => {
    const [
      errorsResults,
      insResults
    ] = await Promise.all([
      browser.testHandle.expectErrors(10000, true),
      browser.testHandle.expectIns(10000, true),
      browser.url(await browser.testHandle.assetURL('instrumented.html'))
        .then(() => browser.waitForAgentLoad())
    ])

    expect(errorsResults).toBeUndefined()
    expect(insResults).toBeUndefined()
  })
})

function verifyBaseQueryParameters (queryParams, expectedURL, featureName) {
  const extraParams = {
    session_trace: {
      fts: val => expect(Number(val)).toBeGreaterThanOrEqual(0) && expect(val.length).toBeGreaterThan(0),
      n: val => expect(Number(val)).toBeGreaterThan(0) && expect(val.length).toBeGreaterThan(0)
    }
  }
  expect(queryParams.a).toEqual('42')
  expect(queryParams.sa).toEqual('1')
  expect(queryParams.v).toMatch(/^\d{1,3}\.\d{1,3}\.\d{1,3}$/)
  expect(queryParams.t).toEqual('Unnamed Transaction')
  expect(queryParams.rst).toMatch(/^\d{1,5}$/)
  expect(queryParams.s).toMatch(/^[A-F\d]{16}$/i)
  expect(queryParams.ref).toEqual(expectedURL)

  if (featureName && extraParams[featureName]) {
    Object.entries(extraParams[featureName]).forEach(([key, test]) => {
      test(queryParams[key])
    })
  }
}
