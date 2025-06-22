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
      expect(insightsHarvest.request.body.ins).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            eventType: 'UserAction',
            targetTag: 'DIV',
            targetId: 'test-area'
          }),
          expect.not.objectContaining({
            eventType: 'UserAction',
            targetTag: 'DIV',
            targetId: 'test-area',
            deadClick: true
          }),
          expect.objectContaining({
            eventType: 'UserAction',
            targetTag: 'SPAN',
            targetId: 'do-nothing-span'
          }),
          expect.not.objectContaining({
            eventType: 'UserAction',
            targetTag: 'SPAN',
            targetId: 'do-nothing-span',
            deadClick: true
          })
        ]))
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
        // // [3] - link with onclick
        document.getElementById('test-link-with-onclick').click()
        // // [4] - link with href but no click handler
        document.getElementById('test-link-with-href').click()
        // // [5] - span inside link with listener
        document.getElementById('span-inside-link-with-listener').click()
        // // [6] - span inside dead link
        document.getElementById('span-inside-dead-link').click()
        // end previous user action
        document.getElementById('test-area').click()
      })

      const [insightsHarvest] = await insightsCapture.waitForResult({ timeout: 10000 })

      expect(insightsHarvest.request.body.ins).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            eventType: 'UserAction',
            targetTag: 'A',
            targetId: 'dead-link',
            deadClick: true
          }),
          expect.objectContaining({
            eventType: 'UserAction',
            targetTag: 'A',
            targetId: 'do-nothing-link',
            deadClick: true
          }),
          expect.objectContaining({
            eventType: 'UserAction',
            targetTag: 'A',
            targetId: 'test-link-with-listener'
          }),
          expect.not.objectContaining({
            eventType: 'UserAction',
            targetTag: 'A',
            targetId: 'test-link-with-listener',
            deadClick: true
          }),
          expect.objectContaining({
            eventType: 'UserAction',
            targetTag: 'A',
            targetId: 'test-link-with-onclick'
          }),
          expect.not.objectContaining({
            eventType: 'UserAction',
            targetTag: 'A',
            targetId: 'test-link-with-onclick',
            deadClick: true
          }),
          expect.objectContaining({
            eventType: 'UserAction',
            targetTag: 'A',
            targetId: 'test-link-with-href'
          }),
          expect.not.objectContaining({
            eventType: 'UserAction',
            targetTag: 'A',
            targetId: 'test-link-with-href',
            deadClick: true
          }),
          expect.objectContaining({
            eventType: 'UserAction',
            targetTag: 'SPAN',
            targetId: 'span-inside-link-with-listener'
          }),
          expect.not.objectContaining({
            eventType: 'UserAction',
            targetTag: 'SPAN',
            targetId: 'span-inside-link-with-listener',
            deadClick: true
          }),
          expect.objectContaining({
            eventType: 'UserAction',
            targetTag: 'SPAN',
            targetId: 'span-inside-dead-link',
            deadClick: true
          })
        ]))
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
    expect(insightsHarvest.request.body.ins).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventType: 'UserAction',
          targetTag: 'INPUT',
          targetId: 'normal-textbox',
          targetType: 'text'
        }),
        expect.not.objectContaining({
          eventType: 'UserAction',
          targetTag: 'INPUT',
          targetId: 'normal-textbox',
          targetType: 'text',
          deadClick: true
        }),
        expect.objectContaining({
          eventType: 'UserAction',
          targetTag: 'INPUT',
          targetId: 'readonly-textbox',
          targetType: 'text',
          deadClick: true
        })
      ]))
  })
})
