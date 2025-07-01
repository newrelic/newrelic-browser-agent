import { testInsRequest } from '../../../tools/testing-server/utils/expect-tests'

const loaderTypes = ['full', 'spa'] // 'rum' is excluded as UserActions is not supported
describe('User Frustrations - Error Clicks', () => {
  it('should not decorate error clicks on non-interactive elements', async () => {
    const [insightsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testInsRequest }
    ])
    await browser.url(await browser.testHandle.assetURL('user-frustrations/instrumented-error-clicks.html'))
      .then(() => browser.waitForAgentLoad())

    await browser.execute(function () {
      // [1] - span with listener error
      document.getElementById('span-with-listener-error').click()
      // end previous user action
      document.getElementById('test-area').click()
    })

    const [insightsHarvest] = await insightsCapture.waitForResult({ timeout: 10000 })
    const actuals = insightsHarvest.request.body.ins.filter(x => x.action === 'click')
    expect(actuals[0]).toMatchObject(expect.objectContaining({
      eventType: 'UserAction',
      targetTag: 'SPAN',
      targetId: 'span-with-listener-error'
    }))
    expect(actuals[0]).not.toHaveProperty('errorClick')
  })

  loaderTypes.forEach(loaderType => {
    it('should correctly assess error clicks for links', async () => {
      const [insightsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
        { test: testInsRequest }
      ])
      await browser.url(await browser.testHandle.assetURL('user-frustrations/instrumented-error-clicks.html'))
        .then(() => browser.waitForAgentLoad())

      await browser.execute(function () {
        // [0] - link with listener, no error
        document.getElementById('link-with-listener').click()
        // [1] - link with listener error
        document.getElementById('link-with-listener-error').click()
        // [2] - link with onclick, no error
        document.getElementById('link-with-onclick').click()
        // [3] - link with onclick error
        document.getElementById('link-with-onclick-error').click()
        // [4] - span inside link with listener, no error
        document.getElementById('span-inside-link-with-listener').click()
        // [5] - span inside link with listener error
        document.getElementById('span-inside-link-with-listener-error').click()
        // end previous user action
        document.getElementById('test-area').click()
      })

      const [insightsHarvest] = await insightsCapture.waitForResult({ timeout: 10000 })
      const actuals = insightsHarvest.request.body.ins.filter(x => x.action === 'click')
      expect(actuals[0]).toMatchObject(expect.objectContaining({
        eventType: 'UserAction',
        targetTag: 'A',
        targetId: 'link-with-listener'
      }))
      expect(actuals[0]).not.toHaveProperty('errorClick')
      expect(actuals[1]).toMatchObject(expect.objectContaining({
        eventType: 'UserAction',
        targetTag: 'A',
        targetId: 'link-with-listener-error',
        errorClick: true
      }))
      expect(actuals[2]).toMatchObject(expect.objectContaining({
        eventType: 'UserAction',
        targetTag: 'A',
        targetId: 'link-with-onclick'
      }))
      expect(actuals[2]).not.toHaveProperty('errorClick')
      // currently unable to tie errors from onclick with click event/user action
      expect(actuals[3]).toMatchObject(expect.objectContaining({
        eventType: 'UserAction',
        targetTag: 'A',
        targetId: 'link-with-onclick-error'
      }))
      expect(actuals[3]).not.toHaveProperty('errorClick')
      expect(actuals[4]).toMatchObject(expect.objectContaining({
        eventType: 'UserAction',
        targetTag: 'SPAN',
        targetId: 'span-inside-link-with-listener'
      }))
      expect(actuals[4]).not.toHaveProperty('errorClick')
      expect(actuals[5]).toMatchObject(expect.objectContaining({
        eventType: 'UserAction',
        targetTag: 'SPAN',
        targetId: 'span-inside-link-with-listener-error',
        errorClick: true
      }))
    })
  })

  it('should correctly assess error clicks for buttons', async () => {
    const [insightsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testInsRequest }
    ])
    await browser.url(await browser.testHandle.assetURL('user-frustrations/instrumented-error-clicks.html'))
      .then(() => browser.waitForAgentLoad())

    await browser.execute(function () {
      // [0] - button with listener, no error
      document.getElementById('button-with-listener').click()
      // [1] - button with listener error
      document.getElementById('button-with-listener-error').click()
      // [2] - button with onclick, no error
      document.getElementById('button-with-onclick').click()
      // [3] - button with onclick error
      document.getElementById('button-with-onclick-error').click()
      // [4] - span inside button with listener, no error
      document.getElementById('span-inside-button-with-listener').click()
      // [5] - span inside button with listener error
      document.getElementById('span-inside-button-with-listener-error').click()
      // [6] - span inside button with onclick, no error
      document.getElementById('span-inside-button-with-onclick').click()
      // [7] - span inside button with onclick error
      document.getElementById('span-inside-button-with-onclick-error').click()
      // end previous user action
      document.getElementById('test-area').click()
    })

    const [insightsHarvest] = await insightsCapture.waitForResult({ timeout: 10000 })
    const actuals = insightsHarvest.request.body.ins.filter(x => x.action === 'click')
    expect(actuals[0]).toMatchObject(expect.objectContaining({
      eventType: 'UserAction',
      targetTag: 'BUTTON',
      targetId: 'button-with-listener'
    }))
    expect(actuals[0]).not.toHaveProperty('errorClick')
    expect(actuals[1]).toMatchObject(expect.objectContaining({
      eventType: 'UserAction',
      targetTag: 'BUTTON',
      targetId: 'button-with-listener-error',
      errorClick: true
    }))
    expect(actuals[2]).toMatchObject(expect.objectContaining({
      eventType: 'UserAction',
      targetTag: 'BUTTON',
      targetId: 'button-with-onclick'
    }))
    expect(actuals[2]).not.toHaveProperty('errorClick')
    // currently unable to tie errors from onclick with click event/user action
    expect(actuals[3]).toMatchObject(expect.objectContaining({
      eventType: 'UserAction',
      targetTag: 'BUTTON',
      targetId: 'button-with-onclick-error'
    }))
    expect(actuals[3]).not.toHaveProperty('errorClick')
    expect(actuals[4]).toMatchObject(expect.objectContaining({
      eventType: 'UserAction',
      targetTag: 'SPAN',
      targetId: 'span-inside-button-with-listener'
    }))
    expect(actuals[4]).not.toHaveProperty('errorClick')
    expect(actuals[5]).toMatchObject(expect.objectContaining({
      eventType: 'UserAction',
      targetTag: 'SPAN',
      targetId: 'span-inside-button-with-listener-error',
      errorClick: true
    }))
    expect(actuals[6]).toMatchObject(expect.objectContaining({
      eventType: 'UserAction',
      targetTag: 'SPAN',
      targetId: 'span-inside-button-with-onclick'
    }))
    expect(actuals[6]).not.toHaveProperty('errorClick')
    // currently unable to tie errors from onclick with click event/user action
    expect(actuals[7]).toMatchObject(expect.objectContaining({
      eventType: 'UserAction',
      targetTag: 'SPAN',
      targetId: 'span-inside-button-with-onclick-error'
    }))
    expect(actuals[7]).not.toHaveProperty('errorClick')
  })
  it('should correctly assess error clicks for input buttons', async () => {
    const [insightsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testInsRequest }
    ])
    await browser.url(await browser.testHandle.assetURL('user-frustrations/instrumented-error-clicks.html'))
      .then(() => browser.waitForAgentLoad())

    await browser.execute(function () {
      // [0] - input button with listener, no error
      document.getElementById('input-button-with-listener').click()
      // [1] - button with listener error
      document.getElementById('input-button-with-listener-error').click()
      // [2] - button with onclick, no error
      document.getElementById('input-button-with-onclick').click()
      // [3] - button with onclick error
      document.getElementById('input-button-with-onclick-error').click()
      // end previous user action
      document.getElementById('test-area').click()
    })

    const [insightsHarvest] = await insightsCapture.waitForResult({ timeout: 10000 })
    const actuals = insightsHarvest.request.body.ins.filter(x => x.action === 'click')
    expect(actuals[0]).toMatchObject(expect.objectContaining({
      eventType: 'UserAction',
      targetTag: 'INPUT',
      targetType: 'button',
      targetId: 'input-button-with-listener'
    }))
    expect(actuals[0]).not.toHaveProperty('errorClick')
    expect(actuals[1]).toMatchObject(expect.objectContaining({
      eventType: 'UserAction',
      targetTag: 'INPUT',
      targetId: 'input-button-with-listener-error',
      targetType: 'button',
      errorClick: true
    }))
    expect(actuals[2]).toMatchObject(expect.objectContaining({
      eventType: 'UserAction',
      targetTag: 'INPUT',
      targetType: 'button',
      targetId: 'input-button-with-onclick'
    }))
    expect(actuals[2]).not.toHaveProperty('errorClick')
    // currently unable to tie errors from onclick with click event/user action
    expect(actuals[3]).toMatchObject(expect.objectContaining({
      eventType: 'UserAction',
      targetTag: 'INPUT',
      targetType: 'button',
      targetId: 'input-button-with-onclick-error'
    }))
    expect(actuals[3]).not.toHaveProperty('errorClick')
  })
})
