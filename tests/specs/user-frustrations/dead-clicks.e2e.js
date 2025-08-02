import { testInsRequest } from '../../../tools/testing-server/utils/expect-tests'

const loaderTypes = ['full', 'spa'] // 'rum' is excluded as UserActions is not supported

describe('User Frustrations - Dead Clicks', () => {
  loaderTypes.forEach(loaderType => {
    it('should decorate dead clicks - ' + loaderType, async () => {
      const [insightsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
        { test: testInsRequest }
      ])
      await browser.url(await browser.testHandle.assetURL('test-builds/vite-react-17-wrapper/index.html'))
        .then(() => browser.waitForAgentLoad())

      await browser.execute(function () {
        const FRUSTRATION_TIMEOUT = 2000
        const commands = [
          // [0] - button with no click handler
          () => { document.getElementById('do-nothing-button').click() },
          // [1] - DOM mutation as a result of handlers fired via event delegation for a button
          () => { document.getElementById('sample-trigger').click() },
          // end previous user action, using two actions to help "pad" UA harvests due to race between events and harvest cycle
          () => { document.getElementById('dummy-span-1').click() },
          () => { document.getElementById('dummy-span-2').click() }
        ]
        const cmdCount = commands.length
        for (let i = 0; i < cmdCount; i++) {
          const buffer = 20 * i

          setTimeout(() => {
            commands[i].call()
          }, FRUSTRATION_TIMEOUT * (i) + buffer)
        }
      })

      const waitConditions = { totalCount: 2, timeout: 10000 } // forcing a longer wait to cut down flakiness
      const [insightsHarvest] = await insightsCapture.waitForResult(waitConditions)
      const actualInsHarvests = insightsHarvest?.request.body.ins.filter(x => x.action === 'click')
      expect(actualInsHarvests[0]).toMatchObject(expect.objectContaining({
        eventType: 'UserAction',
        targetTag: 'BUTTON',
        targetId: 'do-nothing-button',
        deadClick: true
      }))
      expect(actualInsHarvests[1]).toMatchObject(expect.objectContaining({
        eventType: 'UserAction',
        targetTag: 'BUTTON',
        targetId: 'sample-trigger'
      }))
      expect(actualInsHarvests[1]).not.toHaveProperty('deadClick')
    })
  })
})
