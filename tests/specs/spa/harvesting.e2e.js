import { checkSpa } from '../../util/basic-checks'

describe('spa harvesting', () => {
  it('should set correct customEnd value on multiple custom interactions', async () => {
    // interaction3 will eventually be harvested so we need to capture two harvests here

    const [interactionResults1, interactionResults2] = await Promise.all([
      browser.testHandle.expectInteractionEvents(),
      browser.testHandle.expectInteractionEvents(),
      browser.url(await browser.testHandle.assetURL('spa/multiple-custom-interactions.html'))
    ])

    const interactions = [
      ...interactionResults1.request.body,
      ...interactionResults2.request.body
    ]
    expect(interactions.length).toEqual(4)
    expect(interactions).toEqual(expect.arrayContaining([
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
    interactions
      .filter(interaction => ['interaction1', 'interaction2', 'interaction4'].includes(interaction.customName))
      .forEach(interaction => {
        const customEndTime = interaction.children.find(child => child.type === 'customEnd')
        expect(customEndTime.time).toBeGreaterThanOrEqual(interaction.end)
      })
  })

  it('should not exceed 128 child nodes', async () => {
    await browser.url(
      await browser.testHandle.assetURL('spa/max-nodes.html')
    ).then(() => browser.waitForAgentLoad())

    const [interactionResults] = await Promise.all([
      browser.testHandle.expectInteractionEvents(10000),
      $('#sendAjax').click()
    ])

    checkSpa(interactionResults.request, { trigger: 'click' })
    const ajaxNodes = interactionResults.request.body[0].children.filter(node =>
      node.type === 'ajax' && node.path === '/json'
    )
    expect(ajaxNodes.length).toBeBetween(1, 129)
  })

  it('hashchange fires after finish', async () => {
    const url = await browser.testHandle.assetURL('spa/hashchange-onclick.html')
    await Promise.all([
      browser.testHandle.expectInteractionEvents(), // Discard the initial page load interaction
      browser.url(url).then(() => browser.waitForAgentLoad())
    ])

    const [clickInteractionResults] = await Promise.all([
      browser.testHandle.expectInteractionEvents(),
      $('body').click()
    ])

    expect(clickInteractionResults.request.body).toEqual(expect.arrayContaining([
      expect.objectContaining({
        category: 'Route change',
        type: 'interaction',
        trigger: 'click',
        initialPageURL: url.slice(0, url.indexOf('?')),
        oldURL: url.slice(0, url.indexOf('?')),
        newURL: expect.stringMatching(new RegExp(url.slice(0, url.indexOf('?')) + '#[\\d\\.]*$')),
        children: expect.arrayContaining([
          {
            key: 'after-hashchange',
            type: 'trueAttribute'
          }
        ])
      })
    ]))
  })

  it('pushstate is followed by a popstate', async () => {
    const url = await browser.testHandle.assetURL('instrumented.html')
    await Promise.all([
      browser.testHandle.expectInteractionEvents(), // Discard the initial page load interaction
      browser.url(url).then(() => browser.waitForAgentLoad())
    ])

    const [popstateIxnPayload] = await Promise.all([
      browser.testHandle.expectInteractionEvents(),
      browser.execute(function () {
        window.history.pushState({}, '', '/newurl')
        window.addEventListener('popstate', function () { setTimeout(newrelic.interaction().createTracer('timer')) })
        window.history.back()
      })
    ])

    const parsedUrl = new URL(url)
    expect(popstateIxnPayload.request.body[0]).toEqual(expect.objectContaining({
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
})
