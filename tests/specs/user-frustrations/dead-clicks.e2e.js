import { testInsRequest } from '../../../tools/testing-server/utils/expect-tests'

const loaderTypes = ['full', 'spa'] // 'rum' is excluded as UserActions is not supported

describe('User Frustrations - Dead Clicks', () => {
  loaderTypes.forEach(loaderType => {
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

  it('should correctly assess dead clicks on input buttons', async () => {
    const [insightsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testInsRequest }
    ])
    await browser.url(await browser.testHandle.assetURL('user-frustrations/instrumented-dead-clicks.html'))
      .then(() => browser.waitForAgentLoad())

    await browser.execute(function () {
      // [0] - input button with click listener
      document.getElementById('test-input-button-with-listener').click()
      // [1] - input button with onclick
      document.getElementById('test-input-button-with-onclick').click()
      // [2] - input button with a handler that was added and removed
      document.getElementById('do-nothing-input-button').click()
      // [3] - input button with no handlers and not part of any form
      document.getElementById('dead-input-button').click()
      // end previous user action
      document.getElementById('test-area').click()
    })

    const [insightsHarvest] = await insightsCapture.waitForResult({ timeout: 10000 })

    const actuals = insightsHarvest.request.body.ins.filter(x => x.action === 'click')
    expect(actuals[0]).toMatchObject(expect.objectContaining({
      eventType: 'UserAction',
      targetTag: 'INPUT',
      targetId: 'test-input-button-with-listener',
      targetType: 'button'
    }))
    expect(actuals[0]).not.toHaveProperty('deadClick')

    expect(actuals[1]).toMatchObject(expect.objectContaining({
      eventType: 'UserAction',
      targetTag: 'INPUT',
      targetId: 'test-input-button-with-onclick',
      targetType: 'button'
    }))
    expect(actuals[1]).not.toHaveProperty('deadClick')

    expect(actuals[2]).toMatchObject(expect.objectContaining({
      eventType: 'UserAction',
      targetTag: 'INPUT',
      targetId: 'do-nothing-input-button',
      targetType: 'button',
      deadClick: true
    }))

    expect(actuals[3]).toMatchObject(expect.objectContaining({
      eventType: 'UserAction',
      targetTag: 'INPUT',
      targetId: 'dead-input-button',
      targetType: 'button',
      deadClick: true
    }))
  })

  it('should correctly assess dead clicks on button elements', async () => {
    const [insightsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testInsRequest }
    ])
    await browser.url(await browser.testHandle.assetURL('user-frustrations/instrumented-dead-clicks.html'))
      .then(() => browser.waitForAgentLoad())

    await browser.execute(function () {
      // [0] - button with click listener
      document.getElementById('test-button-with-listener').click()
      // [1] - button with onclick
      document.getElementById('test-button-with-onclick').click()
      // [2] - button with a handler that was added and removed
      document.getElementById('do-nothing-button').click()
      // [3] - button with no handlers and not part of any form
      document.getElementById('dead-button').click()
      // [4] - span inside button with listener
      document.getElementById('span-inside-button-with-listener').click()
      // [5] - span inside dead button
      document.getElementById('span-inside-dead-button').click()
      // end previous user action
      document.getElementById('test-area').click()
    })

    const [insightsHarvest] = await insightsCapture.waitForResult({ timeout: 10000 })

    const actuals = insightsHarvest.request.body.ins.filter(x => x.action === 'click')
    expect(actuals[0]).toMatchObject(expect.objectContaining({
      eventType: 'UserAction',
      targetTag: 'BUTTON',
      targetId: 'test-button-with-listener'
    }))
    expect(actuals[0]).not.toHaveProperty('deadClick')

    expect(actuals[1]).toMatchObject(expect.objectContaining({
      eventType: 'UserAction',
      targetTag: 'BUTTON',
      targetId: 'test-button-with-onclick'
    }))
    expect(actuals[1]).not.toHaveProperty('deadClick')

    expect(actuals[2]).toMatchObject(expect.objectContaining({
      eventType: 'UserAction',
      targetTag: 'BUTTON',
      targetId: 'do-nothing-button',
      deadClick: true
    }))

    expect(actuals[3]).toMatchObject(expect.objectContaining({
      eventType: 'UserAction',
      targetTag: 'BUTTON',
      targetId: 'dead-button',
      deadClick: true
    }))

    expect(actuals[4]).toMatchObject(expect.objectContaining({
      eventType: 'UserAction',
      targetTag: 'SPAN',
      targetId: 'span-inside-button-with-listener'
    }))
    expect(actuals[4]).not.toHaveProperty('deadClick')

    expect(actuals[5]).toMatchObject(expect.objectContaining({
      eventType: 'UserAction',
      targetTag: 'SPAN',
      targetId: 'span-inside-dead-button',
      deadClick: true
    }))
  })

  it('should correctly assess dead clicks on button elements with forms', async () => {
    const [insightsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testInsRequest }
    ])
    await browser.url(await browser.testHandle.assetURL('user-frustrations/instrumented-dead-clicks.html'))
      .then(() => browser.waitForAgentLoad())

    await browser.execute(function () {
      // [0] - button with form ancestor
      document.getElementById('button-with-form-ancestor').click()
      // [1] - button with a related form
      document.getElementById('button-with-related-form').click()
      // [2] - button with an invalid form, overriding form ancestor
      document.getElementById('button-with-invalid-form').click()
      // end previous user action
      document.getElementById('test-area').click()
    })

    const [insightsHarvest] = await insightsCapture.waitForResult({ timeout: 10000 })

    const actuals = insightsHarvest.request.body.ins.filter(x => x.action === 'click')
    expect(actuals[0]).toMatchObject(expect.objectContaining({
      eventType: 'UserAction',
      targetTag: 'BUTTON',
      targetId: 'button-with-form-ancestor'
    }))
    expect(actuals[0]).not.toHaveProperty('deadClick')

    expect(actuals[1]).toMatchObject(expect.objectContaining({
      eventType: 'UserAction',
      targetTag: 'BUTTON',
      targetId: 'button-with-related-form'
    }))
    expect(actuals[1]).not.toHaveProperty('deadClick')

    expect(actuals[2]).toMatchObject(expect.objectContaining({
      eventType: 'UserAction',
      targetTag: 'BUTTON',
      targetId: 'button-with-invalid-form',
      deadClick: true
    }))
  })

  it('should correctly assess dead clicks on popover buttons', async () => {
    const [insightsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testInsRequest }
    ])
    await browser.url(await browser.testHandle.assetURL('user-frustrations/instrumented-dead-clicks.html'))
      .then(() => browser.waitForAgentLoad())

    await browser.execute(function () {
      // [0] - button to toggle popover
      document.getElementById('button-for-popover').click() // toggles and opens popover
      // [1] - button to hide popover that is currently visible
      document.getElementById('button-for-popover-hide').click() // closes popover
      // [2] - button to show popover that is currently hidden
      document.getElementById('button-for-popover-show').click() // opens popover
      // [3] - button to toggle popover
      document.getElementById('button-for-popover').click() // toggles and closes popover
      // [4] - button to hide popover that is already closed
      document.getElementById('button-for-popover-hide').click() // does nothing = dead click

      // the following clicks will be processed together as one user action
      // [5] - button first opens popover, then does nothing
      document.getElementById('button-for-popover-show').click() // opens popover
      document.getElementById('button-for-popover-show').click() // does nothing = dead click

      // [6] - button with invalid popover command will toggle popover
      document.getElementById('button-for-popover-invalid-command').click() // toggles and closes popover

      // [7] - button with invalid popover target
      document.getElementById('button-for-popover-invalid-target').click() // does nothing
      // end previous user action
      document.getElementById('test-area').click()
    })

    const [insightsHarvest] = await insightsCapture.waitForResult({ timeout: 10000 })

    const actuals = insightsHarvest.request.body.ins.filter(x => x.action === 'click')
    expect(actuals[0]).toMatchObject(expect.objectContaining({
      eventType: 'UserAction',
      targetTag: 'BUTTON',
      targetId: 'button-for-popover'
    }))
    expect(actuals[0]).not.toHaveProperty('deadClick')

    expect(actuals[1]).toMatchObject(expect.objectContaining({
      eventType: 'UserAction',
      targetTag: 'BUTTON',
      targetId: 'button-for-popover-hide'
    }))
    expect(actuals[1]).not.toHaveProperty('deadClick')

    expect(actuals[2]).toMatchObject(expect.objectContaining({
      eventType: 'UserAction',
      targetTag: 'BUTTON',
      targetId: 'button-for-popover-show'
    }))
    expect(actuals[2]).not.toHaveProperty('deadClick')

    expect(actuals[3]).toMatchObject(expect.objectContaining({
      eventType: 'UserAction',
      targetTag: 'BUTTON',
      targetId: 'button-for-popover'
    }))
    expect(actuals[3]).not.toHaveProperty('deadClick')

    // popover is already closed = dead click
    expect(actuals[4]).toMatchObject(expect.objectContaining({
      eventType: 'UserAction',
      targetTag: 'BUTTON',
      targetId: 'button-for-popover-hide',
      deadClick: true
    }))

    // first click opens popover, second click does nothing = dead click
    expect(actuals[5]).toMatchObject(expect.objectContaining({
      eventType: 'UserAction',
      targetTag: 'BUTTON',
      targetId: 'button-for-popover-show',
      deadClick: true
    }))

    expect(actuals[6]).toMatchObject(expect.objectContaining({
      eventType: 'UserAction',
      targetTag: 'BUTTON',
      targetId: 'button-for-popover-invalid-command'
    }))
    expect(actuals[6]).not.toHaveProperty('deadClick')

    // invalid popover target = dead click
    expect(actuals[7]).toMatchObject(expect.objectContaining({
      eventType: 'UserAction',
      targetTag: 'BUTTON',
      targetId: 'button-for-popover-invalid-target',
      deadClick: true
    }))
  })

  it('should ignore buttons with command attribute for dead click detection', async () => {
    const [insightsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testInsRequest }
    ])
    await browser.url(await browser.testHandle.assetURL('user-frustrations/instrumented-dead-clicks.html'))
      .then(() => browser.waitForAgentLoad())

    await browser.execute(function () {
      // [0] - button with command attribute
      document.getElementById('button-for-show-modal-command').click()
      // end previous user action
      document.getElementById('test-area').click()
    })

    const [insightsHarvest] = await insightsCapture.waitForResult({ timeout: 10000 })
    const actuals = insightsHarvest.request.body.ins.filter(x => x.action === 'click')
    expect(actuals[0]).toMatchObject(expect.objectContaining({
      eventType: 'UserAction',
      targetTag: 'BUTTON',
      targetId: 'button-for-show-modal-command'
    }))
    expect(actuals[0]).not.toHaveProperty('deadClick')
  })
})
