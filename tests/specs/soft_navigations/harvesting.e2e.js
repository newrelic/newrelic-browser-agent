import { testInteractionEventsRequest } from '../../../tools/testing-server/utils/expect-tests'
import { JSONPath } from 'jsonpath-plus'

describe('spa harvesting', () => {
  let interactionsCapture

  beforeEach(async () => {
    interactionsCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testInteractionEventsRequest })
  })

  it('should set correct start and end values on multiple custom interactions', async () => {
    const [interactionHarvests] = await Promise.all([
      interactionsCapture.waitForResult({ timeout: 10000 }),
      browser.url(await browser.testHandle.assetURL('soft_navigations/multiple-custom-interactions.html'))
    ])

    const customInteractions = JSONPath({ path: '$.[*].request.body.[?(!!@ && @.customName)]', json: interactionHarvests })
    expect(customInteractions.length).toEqual(3)
    expect(customInteractions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        customName: 'interaction1',
        end: expect.any(Number)
      }),
      expect.objectContaining({
        customName: 'interaction2',
        end: expect.any(Number)
      }),
      expect.objectContaining({
        customName: 'interaction4',
        end: expect.any(Number)
      })
    ]))

    expect(customInteractions[0].start).toBeGreaterThanOrEqual(0)
    expect(customInteractions[0].start).toBeLessThanOrEqual(customInteractions[0].end)
    expect(customInteractions[0].end).toBeLessThanOrEqual(customInteractions[1].start)

    expect(customInteractions[1].start).toBeLessThanOrEqual(customInteractions[1].end)
    expect(customInteractions[1].end).toBeLessThanOrEqual(customInteractions[2].start)

    expect(customInteractions[2].start).toBeLessThanOrEqual(customInteractions[2].end)
  })

  it('pushstate is followed by a popstate', async () => {
    const url = await browser.testHandle.assetURL('instrumented.html')
    await Promise.all([
      interactionsCapture.waitForResult({ totalCount: 1 }),
      browser.url(url).then(() => browser.waitForAgentLoad())
    ])

    const [interactionHarvests] = await Promise.all([
      interactionsCapture.waitForResult({ totalCount: 2 }),
      browser.execute(function () {
        window.history.pushState({}, '', '/newurl')
        window.addEventListener('popstate', function () {
          const elem = document.createElement('div')
          elem.innerHTML = 'TEST'
          document.body.appendChild(elem)
        })
        window.history.back()
      })
    ])

    const parsedUrl = new URL(url)
    expect(interactionHarvests.length).toEqual(2)
    expect(interactionHarvests[1].request.body[0]).toEqual(expect.objectContaining({
      category: 'Route change',
      type: 'interaction',
      trigger: 'popstate',
      oldURL: parsedUrl.origin + '/newurl',
      newURL: parsedUrl.origin + parsedUrl.pathname, // should be the original asset url
      children: []
    }))
  })

  it('hashchange is followed by a popstate', async () => {
    const url = await browser.testHandle.assetURL('instrumented.html')
    await Promise.all([
      interactionsCapture.waitForResult({ totalCount: 1 }),
      browser.url(url).then(() => browser.waitForAgentLoad())
    ])

    const hashFragment = 'otherurl'
    await browser.execute(function (hashFragment) {
      window.location.hash = hashFragment
    }, hashFragment)
    await browser.pause(500) // this ensure the window location or url has actually changed first before next browser.execute

    const [interactionHarvests] = await Promise.all([
      interactionsCapture.waitForResult({ totalCount: 2 }),
      browser.execute(function () {
        window.addEventListener('popstate', function () {
          const elem = document.createElement('div')
          elem.innerHTML = 'TEST'
          document.body.appendChild(elem)
        })
        window.history.back()
      })
    ])

    const parsedUrl = new URL(url)
    expect(interactionHarvests.length).toEqual(2)
    expect(interactionHarvests[1].request.body[0]).toEqual(expect.objectContaining({
      category: 'Route change',
      type: 'interaction',
      trigger: 'popstate',
      oldURL: parsedUrl.origin + parsedUrl.pathname + '#' + hashFragment,
      newURL: parsedUrl.origin + parsedUrl.pathname, // should be the original asset url
      children: []
    }))
  })

  it('sends interactions even if end() is called before the window load event', async () => {
    const [interactionHarvests] = await Promise.all([
      interactionsCapture.waitForResult({ totalCount: 1 }),
      browser.url(await browser.testHandle.assetURL('soft_navigations/initial-page-load-with-end-interaction.html'))
        .then(() => browser.waitForAgentLoad())
    ])

    const ipl = interactionHarvests[0].request.body[0]
    expect(ipl).toEqual(expect.objectContaining({
      trigger: 'initialPageLoad',
      end: expect.any(Number),
      children: expect.any(Array)
    }))
    expect(ipl.end).toBeGreaterThanOrEqual(0)
  })
})
