import { testInsRequest } from '../../../tools/testing-server/utils/expect-tests'

const loaderTypes = ['full', 'spa'] // 'rum' is excluded as UserActions is not supported

describe('User Frustrations - Dead Clicks', () => {
  const FRUSTRATION_TIMEOUT = 2000
  const HARVEST_TIMEOUT = 5000

  loaderTypes.forEach(loaderType => {
    it('should decorate dead clicks - ' + loaderType, async () => {
      const [insightsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
        { test: testInsRequest }
      ])
      await browser.url(await browser.testHandle.assetURL('test-builds/vite-react-17-wrapper/index.html'), { loader: loaderType })
        .then(() => browser.waitForAgentLoad())

      await browser.execute(function () {
        // button with no click handler
        document.getElementById('do-nothing-button').click()
      })

      await browser.pause(FRUSTRATION_TIMEOUT)
      await browser.execute(function () {
        document.getElementById('dummy-span-1').click()
      })

      const [insightsHarvest] = await insightsCapture.waitForResult({ timeout: HARVEST_TIMEOUT })
      const actualInsHarvests = insightsHarvest?.request.body.ins.filter(x => x.action === 'click')
      expect(actualInsHarvests.length).toBeGreaterThanOrEqual(1)
      expect(actualInsHarvests[0]).toMatchObject(expect.objectContaining({
        eventType: 'UserAction',
        targetTag: 'BUTTON',
        targetId: 'do-nothing-button',
        deadClick: true
      }))
    })
  })

  it('should not decorate dead clicks when DOM mutation present', async () => {
    const [insightsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testInsRequest }
    ])
    await browser.url(await browser.testHandle.assetURL('test-builds/vite-react-17-wrapper/index.html'))
      .then(() => browser.waitForAgentLoad())

    await browser.execute(function () {
      // DOM mutation as a result of handlers fired via event delegation for a button
      document.getElementById('sample-trigger').click()
    })

    await browser.pause(FRUSTRATION_TIMEOUT)
    await browser.execute(function () {
      document.getElementById('dummy-span-1').click()
    })

    const [insightsHarvest] = await insightsCapture.waitForResult({ timeout: HARVEST_TIMEOUT })
    const actualInsHarvests = insightsHarvest?.request.body.ins.filter(x => x.action === 'click')
    expect(actualInsHarvests.length).toBeGreaterThanOrEqual(1)
    expect(actualInsHarvests[0]).toMatchObject(expect.objectContaining({
      eventType: 'UserAction',
      targetTag: 'BUTTON',
      targetId: 'sample-trigger'
    }))
    expect(actualInsHarvests[0]).not.toHaveProperty('deadClick')
  })

  it('should not decorate dead clicks when non-agent xhr is present', async () => {
    const [insightsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testInsRequest }
    ])
    await browser.url(await browser.testHandle.assetURL('user-frustrations/instrumented-dead-clicks.html'))
      .then(() => browser.waitForAgentLoad())

    await browser.execute(function () {
      document.getElementById('button-send-xhr').click()
    })

    await browser.pause(FRUSTRATION_TIMEOUT)
    await browser.execute(function () {
      document.getElementById('dummy-span').click()
    })

    const [insightsHarvest] = await insightsCapture.waitForResult({ timeout: HARVEST_TIMEOUT })
    const actualInsHarvests = insightsHarvest?.request.body.ins.filter(x => x.action === 'click')
    expect(actualInsHarvests.length).toBeGreaterThanOrEqual(1)
    expect(actualInsHarvests[0]).toMatchObject(expect.objectContaining({
      eventType: 'UserAction',
      targetTag: 'BUTTON',
      targetId: 'button-send-xhr'
    }))
    expect(actualInsHarvests[0]).not.toHaveProperty('deadClick')
  })

  it('should not decorate dead clicks when non-agent fetch is present', async () => {
    const [insightsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testInsRequest }
    ])
    await browser.url(await browser.testHandle.assetURL('user-frustrations/instrumented-dead-clicks.html'))
      .then(() => browser.waitForAgentLoad())

    await browser.execute(function () {
      document.getElementById('link-fetch').click()
    })

    await browser.pause(FRUSTRATION_TIMEOUT)
    await browser.execute(function () {
      document.getElementById('dummy-span').click()
    })

    const [insightsHarvest] = await insightsCapture.waitForResult({ timeout: HARVEST_TIMEOUT })
    const actualInsHarvests = insightsHarvest?.request.body.ins.filter(x => x.action === 'click')
    expect(actualInsHarvests.length).toBeGreaterThanOrEqual(1)
    expect(actualInsHarvests[0]).toMatchObject(expect.objectContaining({
      eventType: 'UserAction',
      targetTag: 'A',
      targetId: 'link-fetch'
    }))
    expect(actualInsHarvests[0]).not.toHaveProperty('deadClick')
  })

  it('should not decorate dead clicks when window location is changed', async () => {
    const [insightsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testInsRequest }
    ])
    await browser.url(await browser.testHandle.assetURL('user-frustrations/instrumented-dead-clicks.html'))
      .then(() => browser.waitForAgentLoad())

    await browser.execute(function () {
      document.getElementById('test-link-updates-window-location').click()
    })

    const [insightsHarvest] = await insightsCapture.waitForResult({ timeout: HARVEST_TIMEOUT })
    const actualInsHarvests = insightsHarvest?.request.body.ins.filter(x => x.action === 'click')
    expect(actualInsHarvests.length).toBeGreaterThanOrEqual(1)
    expect(actualInsHarvests[0]).toMatchObject(expect.objectContaining({
      eventType: 'UserAction',
      targetTag: 'A',
      targetId: 'test-link-updates-window-location'
    }))
    expect(actualInsHarvests[0]).not.toHaveProperty('deadClick')
  })

  it('should not decorate dead clicks when navigating via history.pushstate', async () => {
    const [insightsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testInsRequest }
    ])
    await browser.url(await browser.testHandle.assetURL('user-frustrations/instrumented-dead-clicks.html'))
      .then(() => browser.waitForAgentLoad())

    await browser.execute(function () {
      document.getElementById('test-link-history-pushstate').click()
    })

    await browser.pause(FRUSTRATION_TIMEOUT)
    await browser.execute(function () {
      document.getElementById('dummy-span').click()
    })

    const [insightsHarvest] = await insightsCapture.waitForResult({ totalCount: 1, timeout: HARVEST_TIMEOUT })
    const actualInsHarvests = insightsHarvest?.request.body.ins.filter(x => x.action === 'click')
    expect(actualInsHarvests[0]).toMatchObject(expect.objectContaining({
      eventType: 'UserAction',
      targetTag: 'A',
      targetId: 'test-link-history-pushstate'
    }))
    expect(actualInsHarvests[0]).not.toHaveProperty('deadClick')
  })

  it('should not decorate dead clicks when navigating via history.replacestate', async () => {
    const [insightsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testInsRequest }
    ])
    await browser.url(await browser.testHandle.assetURL('user-frustrations/instrumented-dead-clicks.html'))
      .then(() => browser.waitForAgentLoad())

    await browser.execute(function () {
      document.getElementById('test-link-history-replacestate').click()
    })

    await browser.pause(FRUSTRATION_TIMEOUT)
    await browser.execute(function () {
      document.getElementById('dummy-span').click()
    })

    const [insightsHarvest] = await insightsCapture.waitForResult({ totalCount: 1, timeout: HARVEST_TIMEOUT })
    const actualInsHarvests = insightsHarvest?.request.body.ins.filter(x => x.action === 'click')
    expect(actualInsHarvests[0]).toMatchObject(expect.objectContaining({
      eventType: 'UserAction',
      targetTag: 'A',
      targetId: 'test-link-history-replacestate'
    }))
    expect(actualInsHarvests[0]).not.toHaveProperty('deadClick')
  })

  it('should decorate dead click as appropriate when navigating via history .back + .forward', async () => {
    const [insightsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testInsRequest }
    ])
    await browser.url(await browser.testHandle.assetURL('user-frustrations/instrumented-dead-clicks.html'), { loader: 'full' })
      .then(() => browser.waitForAgentLoad())

    await browser.execute(function () {
      const FRUSTRATION_TIMEOUT = 2000
      const commands = [
        () => document.getElementById('test-link-goes-forward-in-history').click(),
        () => document.getElementById('test-link-history-pushstate').click(),
        () => document.getElementById('test-link-goes-back-in-history').click(),
        () => document.getElementById('test-link-goes-forward-in-history').click(),
        () => document.getElementById('dummy-span').click()
      ]

      let i = 0
      commands.forEach(command => {
        const buffer = 20 * i
        setTimeout(() => {
          command.call()
        }, FRUSTRATION_TIMEOUT * i++ + buffer)
      })
    })

    const insightsHarvests = await insightsCapture.waitForResult({ totalCount: 2, timeout: HARVEST_TIMEOUT * 2 })
    const actualInsHarvests = insightsHarvests.map(harvest => harvest.request.body.ins).flat().filter(x => x.action === 'click')

    expect(actualInsHarvests.length).toBeGreaterThanOrEqual(4)
    expect(actualInsHarvests[0]).toMatchObject(expect.objectContaining({
      eventType: 'UserAction',
      targetTag: 'A',
      targetId: 'test-link-goes-forward-in-history',
      deadClick: true
    }))
    expect(actualInsHarvests[2]).toMatchObject(expect.objectContaining({
      eventType: 'UserAction',
      targetTag: 'A',
      targetId: 'test-link-goes-back-in-history'
    }))
    expect(actualInsHarvests[2]).not.toHaveProperty('deadClick')
    expect(actualInsHarvests[3]).toMatchObject(expect.objectContaining({
      eventType: 'UserAction',
      targetTag: 'A',
      targetId: 'test-link-goes-forward-in-history'
    }))
    expect(actualInsHarvests[3]).not.toHaveProperty('deadClick')
  })

  /* BA loaded after customer scripts can cause this scenario */
  it('should decorate as dead click if DOM mutation happened prior to start of UA processing', async () => {
    const [insightsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testInsRequest }
    ])
    await browser.url(await browser.testHandle.assetURL('user-frustrations/dead-clicks-before-agent-load.html'))
      .then(() => browser.waitForAgentLoad())

    await browser.execute(function () {
      document.getElementById('test-button-with-listener').click()
    })

    await browser.pause(FRUSTRATION_TIMEOUT)
    await browser.execute(function () {
      document.getElementById('dummy-span').click()
    })

    const [insightsHarvest] = await insightsCapture.waitForResult({ timeout: HARVEST_TIMEOUT })
    const actualInsHarvests = insightsHarvest?.request.body.ins.filter(x => x.action === 'click')
    expect(actualInsHarvests.length).toBeGreaterThanOrEqual(1)
    expect(actualInsHarvests[0]).toMatchObject(expect.objectContaining({
      eventType: 'UserAction',
      targetTag: 'BUTTON',
      targetId: 'test-button-with-listener',
      deadClick: true
    }))
  })
})
