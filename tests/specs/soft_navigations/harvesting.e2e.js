import { checkSpa } from '../../util/basic-checks'
import { testInteractionEventsRequest } from '../../../tools/testing-server/utils/expect-tests'
import { JSONPath } from 'jsonpath-plus'

describe('spa harvesting', () => {
  const config = { loader: 'spa', init: { feature_flags: ['soft_nav'] } }
  let interactionsCapture

  beforeEach(async () => {
    interactionsCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testInteractionEventsRequest })
  })

  it('should set correct customEnd value on multiple custom interactions', async () => {
    const [interactionHarvests] = await Promise.all([
      interactionsCapture.waitForResult({ timeout: 10000 }),
      browser.url(await browser.testHandle.assetURL('soft_navigations/multiple-custom-interactions.html', config))
    ])

    const customInteractions = JSONPath({ path: '$.[*].request.body.[?(!!@ && @.customName)]', json: interactionHarvests })
    expect(customInteractions.length).toEqual(4)
    expect(customInteractions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        customName: 'interaction1',
        children: expect.arrayContaining([expect.objectContaining({
          type: 'customEnd'
        })])
      }),
      expect.objectContaining({
        customName: 'interaction2',
        children: expect.arrayContaining([expect.objectContaining({
          type: 'customEnd'
        })])
      }),
      expect.objectContaining({
        customName: 'interaction3',
        children: expect.not.arrayContaining([expect.objectContaining({
          type: 'customEnd'
        })])
      }),
      expect.objectContaining({
        customName: 'interaction4',
        children: expect.arrayContaining([expect.objectContaining({
          type: 'customEnd'
        })])
      })
    ]))
    customInteractions
      .filter(interaction => ['interaction1', 'interaction2', 'interaction4'].includes(interaction.customName))
      .forEach(interaction => {
        const customEndTime = interaction.children.find(child => child.type === 'customEnd')
        expect(customEndTime.time).toBeGreaterThanOrEqual(interaction.end)
      })
  })

  it('should not exceed 128 child nodes', async () => {
    await Promise.all([
      interactionsCapture.waitForResult({ totalCount: 1 }),
      browser.url(await browser.testHandle.assetURL('soft_navigations/max-nodes.html', config))
        .then(() => browser.waitForAgentLoad())
    ])

    const [interactionHarvests] = await Promise.all([
      interactionsCapture.waitForResult({ timeout: 20000 }), // It can take a bit of time to get all the XHRs resolved
      $('#sendAjax').click()
    ])

    expect(interactionHarvests.length).toEqual(2)
    checkSpa(interactionHarvests[1].request, { trigger: 'click' })
    const ajaxNodes = interactionHarvests[1].request.body[0].children.filter(node =>
      node.type === 'ajax' && node.path === '/json'
    )
    expect(ajaxNodes.length).toBeBetween(1, 129)
  })

  it('pushstate is followed by a popstate', async () => {
    const url = await browser.testHandle.assetURL('instrumented.html', config)
    await Promise.all([
      interactionsCapture.waitForResult({ totalCount: 1 }),
      browser.url(url).then(() => browser.waitForAgentLoad())
    ])

    const [interactionHarvests] = await Promise.all([
      interactionsCapture.waitForResult({ timeout: 10000 }),
      browser.execute(function () {
        window.history.pushState({}, '', '/newurl')
        window.addEventListener('popstate', function () { setTimeout(newrelic.interaction().createTracer('timer')) })
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
      children: [
        expect.objectContaining({
          type: 'customTracer',
          name: 'timer',
          children: []
        })
      ]
    }))
  })

  it('hashchange is followed by a popstate', async () => {
    const url = await browser.testHandle.assetURL('instrumented.html', config)
    await Promise.all([
      interactionsCapture.waitForResult({ totalCount: 1 }),
      browser.url(url).then(() => browser.waitForAgentLoad())
    ])

    const hashFragment = 'otherurl'
    await Promise.all([
      interactionsCapture.waitForResult({ totalCount: 2 }),
      browser.execute(function (hashFragment) {
        window.location.hash = hashFragment
      }, hashFragment)
    ])

    const [interactionHarvests] = await Promise.all([
      interactionsCapture.waitForResult({ timeout: 10000 }),
      browser.execute(function () {
        window.addEventListener('popstate', function () { setTimeout(newrelic.interaction().createTracer('onPopstate')) })
        window.history.back()
      })
    ])

    const parsedUrl = new URL(url)
    expect(interactionHarvests.length).toEqual(3)
    expect(interactionHarvests[2].request.body[0]).toEqual(expect.objectContaining({
      category: 'Route change',
      type: 'interaction',
      trigger: 'popstate',
      oldURL: parsedUrl.origin + parsedUrl.pathname + '#' + hashFragment,
      newURL: parsedUrl.origin + parsedUrl.pathname, // should be the original asset url
      children: [
        expect.objectContaining({
          type: 'customTracer',
          name: 'onPopstate',
          children: []
        })
      ]
    }))
  })

  it('sends interactions even if end() is called before the window load event', async () => {
    const [interactionHarvests] = await Promise.all([
      interactionsCapture.waitForResult({ totalCount: 1 }),
      browser.url(await browser.testHandle.assetURL('soft_navigations/initial-page-load-with-end-interaction.html', config))
        .then(() => browser.waitForAgentLoad())
    ])

    const ipl = interactionHarvests[0].request.body[0]
    expect(ipl).toEqual(expect.objectContaining({
      trigger: 'initialPageLoad',
      children: [expect.objectContaining({
        type: 'customEnd'
      })]
    }))
  })
})
