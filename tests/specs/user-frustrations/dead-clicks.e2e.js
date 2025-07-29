import { testInsRequest } from '../../../tools/testing-server/utils/expect-tests'

const loaderTypes = ['full', 'spa'] // 'rum' is excluded as UserActions is not supported

describe('User Frustrations - Dead Clicks', () => {
  loaderTypes.forEach(loaderType => {
    it('should decorate dead clicks - ' + loaderType, async () => {
      const [insightsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
        { test: testInsRequest }
      ])
      await browser.url(await browser.testHandle.assetURL('test-builds/vite-react-wrapper/index.html'))
        .then(() => browser.waitForAgentLoad())

      await browser.execute(function () {
        const USER_TIMEOUT = 2000
        const commands = [
          // [0] - span with no click handler
          () => { document.getElementById('do-nothing-span').click() },
          // [1] - DOM mutation as a result of handlers fired via event delegation
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
          }, USER_TIMEOUT * (i) + buffer)
        }
      })

      const [insightsHarvest] = await insightsCapture.waitForResult({ totalCount: 3, timeout: 20000 })
      const actualInsHarvests = insightsHarvest?.request.body.ins.filter(x => x.action === 'click')
      expect(actualInsHarvests[0]).toMatchObject(expect.objectContaining({
        eventType: 'UserAction',
        targetTag: 'SPAN',
        targetId: 'do-nothing-span',
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
