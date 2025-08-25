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
      await browser.url(await browser.testHandle.assetURL('test-builds/vite-react-17-wrapper/index.html'))
        .then(() => browser.waitForAgentLoad())

      await browser.execute(function () {
        // button with no click handler
        document.getElementById('do-nothing-button').click()
      })

      await browser.pause(FRUSTRATION_TIMEOUT)
      await browser.execute(function () {
        document.getElementById('dummy-span-1').click()
      })

      const waitConditions = { timeout: 5000 }
      const [insightsHarvest] = await insightsCapture.waitForResult(waitConditions)
      const actualInsHarvests = insightsHarvest?.request.body.ins.filter(x => x.action === 'click')
      expect(actualInsHarvests.length > 0).toBeTruthy()
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

    const waitConditions = { timeout: HARVEST_TIMEOUT }
    const [insightsHarvest] = await insightsCapture.waitForResult(waitConditions)
    const actualInsHarvests = insightsHarvest?.request.body.ins.filter(x => x.action === 'click')
    expect(actualInsHarvests.length > 0).toBeTruthy()
    expect(actualInsHarvests[0]).toMatchObject(expect.objectContaining({
      eventType: 'UserAction',
      targetTag: 'BUTTON',
      targetId: 'sample-trigger'
    }))
    expect(actualInsHarvests[0]).not.toHaveProperty('deadClick')
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

    const waitConditions = { timeout: HARVEST_TIMEOUT }
    const [insightsHarvest] = await insightsCapture.waitForResult(waitConditions)
    const actualInsHarvests = insightsHarvest?.request.body.ins.filter(x => x.action === 'click')
    expect(actualInsHarvests.length > 0).toBeTruthy()
    expect(actualInsHarvests[0]).toMatchObject(expect.objectContaining({
      eventType: 'UserAction',
      targetTag: 'BUTTON',
      targetId: 'test-button-with-listener',
      deadClick: true
    }))
  })
})
