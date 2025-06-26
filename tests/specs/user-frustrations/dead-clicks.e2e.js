import { testInsRequest } from '../../../tools/testing-server/utils/expect-tests'

const loaderTypes = ['full', 'spa'] // 'rum' is excluded as UserActions is not supported

describe('User Frustrations - Dead Clicks', () => {
  loaderTypes.forEach(loaderType => {
    it(`should not decorate dead clicks on non-interactive elements for ${loaderType} loader`, async () => {
      const [insightsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
        { test: testInsRequest }
      ])
      await browser.url(await browser.testHandle.assetURL('user-frustrations/instrumented-dead-clicks.html', { loader: loaderType }))
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
      const actuals = insightsHarvest.request.body.ins.filter(x => x.action === 'click')
      expect(actuals[0]).toMatchObject(expect.objectContaining({
        eventType: 'UserAction',
        targetTag: 'DIV',
        targetId: 'test-area'
      }))
      expect(actuals[0]).not.toHaveProperty('deadClick')

      expect(actuals[1]).toMatchObject(expect.objectContaining({
        eventType: 'UserAction',
        targetTag: 'SPAN',
        targetId: 'do-nothing-span'
      }))
      expect(actuals[1]).not.toHaveProperty('deadClick')
    })

    it(`should correctly assess dead clicks on links for ${loaderType} loader`, async () => {
      const [insightsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
        { test: testInsRequest }
      ])
      await browser.url(await browser.testHandle.assetURL('user-frustrations/instrumented-dead-clicks.html', { loader: loaderType }))
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

      const actuals = insightsHarvest.request.body.ins.filter(x => x.action === 'click')
      expect(actuals[0]).toMatchObject(expect.objectContaining({
        eventType: 'UserAction',
        targetTag: 'A',
        targetId: 'dead-link',
        deadClick: true
      }))
      expect(actuals[1]).toMatchObject(expect.objectContaining({
        eventType: 'UserAction',
        targetTag: 'A',
        targetId: 'do-nothing-link',
        deadClick: true
      }))

      expect(actuals[2]).toMatchObject(expect.objectContaining({
        eventType: 'UserAction',
        targetTag: 'A',
        targetId: 'test-link-with-listener'
      }))
      expect(actuals[2]).not.toHaveProperty('deadClick')

      expect(actuals[3]).toMatchObject(expect.objectContaining({
        eventType: 'UserAction',
        targetTag: 'A',
        targetId: 'test-link-with-onclick'
      }))
      expect(actuals[3]).not.toHaveProperty('deadClick')

      expect(actuals[4]).toMatchObject(expect.objectContaining({
        eventType: 'UserAction',
        targetTag: 'A',
        targetId: 'test-link-with-href'
      }))
      expect(actuals[4]).not.toHaveProperty('deadClick')

      expect(actuals[5]).toMatchObject(expect.objectContaining({
        eventType: 'UserAction',
        targetTag: 'SPAN',
        targetId: 'span-inside-link-with-listener'
      }))
      expect(actuals[5]).not.toHaveProperty('deadClick')

      expect(actuals[6]).toMatchObject(expect.objectContaining({
        eventType: 'UserAction',
        targetTag: 'SPAN',
        targetId: 'span-inside-dead-link',
        deadClick: true
      }))
    })
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
    const actuals = insightsHarvest.request.body.ins.filter(x => x.action === 'click')
    expect(actuals[0]).toMatchObject(expect.objectContaining({
      eventType: 'UserAction',
      targetTag: 'INPUT',
      targetId: 'normal-textbox',
      targetType: 'text'
    }))
    expect(actuals[0]).not.toHaveProperty('deadClick')
    expect(actuals[1]).toMatchObject(expect.objectContaining({
      eventType: 'UserAction',
      targetTag: 'INPUT',
      targetId: 'readonly-textbox',
      targetType: 'text',
      deadClick: true
    }))
  })
})
