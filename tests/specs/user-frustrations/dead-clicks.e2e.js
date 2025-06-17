import { testInsRequest } from '../../../tools/testing-server/utils/expect-tests'

describe('User Frustrations - Dead Clicks', () => {
  it('should not decorate dead clicks on non-interactive elements', async () => {
    const [insightsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testInsRequest }
    ])
    await browser.url(await browser.testHandle.assetURL('user-frustrations/instrumented-dead-clicks.html'))
      .then(() => browser.waitForAgentLoad())

    await browser.execute(function () {
      // [0] - div
      document.getElementById('test-area').click()
      // [1] - span with no click handler
      document.getElementById('do-nothing-span').click()

      // end previous user action
      document.getElementById('test-area').click()
    })

    const [insightsHarvest] = await insightsCapture.waitForResult({ timeout: 10000 })
    const insHarvest0 = insightsHarvest.request.body.ins[0]
    expect(insHarvest0).toMatchObject(expect.objectContaining({
      eventType: 'UserAction',
      targetTag: 'DIV',
      targetId: 'test-area'
    }))
    expect(insHarvest0).not.toHaveProperty('deadClick')

    const insHarvest1 = insightsHarvest.request.body.ins[1]
    expect(insHarvest1).toMatchObject(expect.objectContaining({
      eventType: 'UserAction',
      targetTag: 'SPAN',
      targetId: 'do-nothing-span'
    }))
    expect(insHarvest1).not.toHaveProperty('deadClick')
  })
  it('should correctly assess dead clicks on links', async () => {
    const [insightsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testInsRequest }
    ])
    await browser.url(await browser.testHandle.assetURL('user-frustrations/instrumented-dead-clicks.html'))
      .then(() => browser.waitForAgentLoad())

    await browser.execute(function () {
      // [0] - link with no href or any handlers
      document.getElementById('dead-link').click()
      // [1] - link with a handler that was added and removed
      document.getElementById('do-nothing-link').click()
      // [2] - link with listener
      document.getElementById('test-link-with-listener').click()
      // [3] - link with onclick
      document.getElementById('test-link-with-onclick').click()
      // [4] - link with href but no click handler
      document.getElementById('test-link-with-href').click()
      // [5] - span inside link with listener
      document.getElementById('span-inside-link-with-listener').click()
      // [6] - span inside dead link
      document.getElementById('span-inside-dead-link').click()
      // end previous user action
      document.getElementById('test-area').click()
    })

    const [insightsHarvest] = await insightsCapture.waitForResult({ timeout: 10000 })

    expect(insightsHarvest.request.body.ins[0]).toMatchObject(expect.objectContaining({
      eventType: 'UserAction',
      targetTag: 'A',
      targetId: 'dead-link',
      deadClick: true
    }))

    expect(insightsHarvest.request.body.ins[1]).toMatchObject(expect.objectContaining({
      eventType: 'UserAction',
      targetTag: 'A',
      targetId: 'do-nothing-link',
      deadClick: true
    }))

    const insHarvest2 = insightsHarvest.request.body.ins[2]
    expect(insHarvest2).toMatchObject(expect.objectContaining({
      eventType: 'UserAction',
      targetTag: 'A',
      targetId: 'test-link-with-listener'
    }))
    expect(insHarvest2).not.toHaveProperty('deadClick')

    const insHarvest3 = insightsHarvest.request.body.ins[3]
    expect(insHarvest3).toMatchObject(expect.objectContaining({
      eventType: 'UserAction',
      targetTag: 'A',
      targetId: 'test-link-with-onclick'
    }))
    expect(insHarvest3).not.toHaveProperty('deadClick')

    const insHarvest4 = insightsHarvest.request.body.ins[4]
    expect(insHarvest4).toMatchObject(expect.objectContaining({
      eventType: 'UserAction',
      targetTag: 'A',
      targetId: 'test-link-with-href'
    }))
    expect(insHarvest4).not.toHaveProperty('deadClick')

    const insHarvest5 = insightsHarvest.request.body.ins[5]
    expect(insHarvest5).toMatchObject(expect.objectContaining({
      eventType: 'UserAction',
      targetTag: 'SPAN',
      targetId: 'span-inside-link-with-listener'
    }))
    expect(insHarvest5).not.toHaveProperty('deadClick')

    const insHarvest6 = insightsHarvest.request.body.ins[6]
    expect(insHarvest6).toMatchObject(expect.objectContaining({
      eventType: 'UserAction',
      targetTag: 'SPAN',
      targetId: 'span-inside-dead-link',
      deadClick: true
    }))
  })
  it('should correctly assess dead clicks on textboxes', async () => {
    const [insightsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testInsRequest }
    ])
    await browser.url(await browser.testHandle.assetURL('user-frustrations/instrumented-dead-clicks.html'))
      .then(() => browser.waitForAgentLoad())

    await browser.execute(function () {
      // [0] - normal textbox
      document.getElementById('normal-textbox').click()
      // [1] - readonly textbox
      document.getElementById('readonly-textbox').click()

      // end previous user action
      document.getElementById('test-area').click()
    })

    const [insightsHarvest] = await insightsCapture.waitForResult({ timeout: 10000 })
    const insHarvest0 = insightsHarvest.request.body.ins[0]
    expect(insHarvest0).toMatchObject(expect.objectContaining({
      eventType: 'UserAction',
      targetTag: 'INPUT',
      targetId: 'normal-textbox',
      targetType: 'text'
    }))
    expect(insHarvest0).not.toHaveProperty('deadClick')

    const insHarvest1 = insightsHarvest.request.body.ins[1]
    expect(insHarvest1).toMatchObject(expect.objectContaining({
      eventType: 'UserAction',
      targetTag: 'INPUT',
      targetId: 'readonly-textbox',
      targetType: 'text',
      deadClick: true
    }))
  })
})
