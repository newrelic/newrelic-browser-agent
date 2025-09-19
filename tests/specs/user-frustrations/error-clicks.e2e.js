import { testInsRequest } from '../../../tools/testing-server/utils/expect-tests'

const loaderTypes = ['full', 'spa'] // 'rum' is excluded as UserActions is not supported

describe('User Frustrations - Error Clicks', () => {
  loaderTypes.forEach(loaderType => {
    it('should decorate error clicks - ' + loaderType, async () => {
      const [insightsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
        { test: testInsRequest }
      ])
      await browser.url(await browser.testHandle.assetURL('test-builds/vite-react-17-wrapper/index.html'))
        .then(() => browser.waitForAgentLoad())

      await browser.execute(function () {
        const TIMEOUT = 500
        const commands = [
          // [0] - button with error
          () => { document.getElementById('button-with-error').click() },
          // [1] - input button with noticeError
          () => { document.getElementById('input-button-with-notice-error').click() },
          // [2] - link with error
          () => { document.getElementById('link-with-error').click() },
          // [3] - link with noticeError
          () => { document.getElementById('link-with-notice-error').click() },

          // [4] - span with error
          () => { document.getElementById('span-with-error').click() },
          // end previous user action, using two actions to help "pad" UA harvests due to race between events and harvest cycle
          () => { document.getElementById('dummy-span-1').click() },
          () => { document.getElementById('dummy-span-2').click() }
        ]
        const cmdCount = commands.length
        for (let i = 0; i < cmdCount; i++) {
          const buffer = 20 * i

          setTimeout(() => {
            commands[i].call()
          }, TIMEOUT * (i) + buffer)
        }
      })

      const waitConditions = { totalCount: 3, timeout: 10000 }
      const [insightsHarvest] = await insightsCapture.waitForResult(waitConditions)
      const actualInsHarvests = insightsHarvest?.request.body.ins.filter(x => x.action === 'click')
      expect(actualInsHarvests[0]).toMatchObject(expect.objectContaining({
        eventType: 'UserAction',
        targetTag: 'BUTTON',
        targetId: 'button-with-error',
        errorClick: true
      }))
      expect(actualInsHarvests[1]).toMatchObject(expect.objectContaining({
        eventType: 'UserAction',
        targetTag: 'INPUT',
        targetType: 'button',
        targetId: 'input-button-with-notice-error',
        errorClick: true
      }))
      expect(actualInsHarvests[2]).toMatchObject(expect.objectContaining({
        eventType: 'UserAction',
        targetTag: 'A',
        targetId: 'link-with-error',
        errorClick: true
      }))
      expect(actualInsHarvests[3]).toMatchObject(expect.objectContaining({
        eventType: 'UserAction',
        targetTag: 'A',
        targetId: 'link-with-notice-error',
        errorClick: true
      }))
      expect(actualInsHarvests[4]).toMatchObject(expect.objectContaining({
        eventType: 'UserAction',
        targetTag: 'SPAN',
        targetId: 'span-with-error'
      }))
      expect(actualInsHarvests[4]).not.toHaveProperty('errorClick')
    })
  })
})

describe('User Frustrations - Error Clicks - special cases', () => {
  const FRUSTRATION_TIMEOUT = 2000
  const HARVEST_TIMEOUT = 5000

  /* BA loaded after customer scripts can cause this scenario */
  it('should not decorate error clicks if error happened prior to start of UA processing', async () => {
    const [insightsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testInsRequest }
    ])
    await browser.url(await browser.testHandle.assetURL('user-frustrations/error-clicks-before-agent-load.html'))
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
      targetId: 'test-button-with-listener'
    }))
    expect(actualInsHarvests[0]).not.toHaveProperty('errorClick')
  })
})
