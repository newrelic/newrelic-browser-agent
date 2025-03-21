import { testInsRequest } from '../../../tools/testing-server/utils/expect-tests'
import { onlyFirefox } from '../../../tools/browser-matcher/common-matchers.mjs'

const init = {
  user_actions: { enabled: true },
  page_actions: { enabled: false },
  performance: {
    capture_marks: false,
    capture_measures: false,
    resources: { enabled: false, ignore_newrelic: true, asset_types: [], first_party_domains: [] }
  }
}

describe('UserAction events', () => {
  let insightsCapture
  beforeEach(async () => {
    insightsCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testInsRequest })
  })

  it('are sent when enabled', async () => {
    const testUrl = await browser.testHandle.assetURL('user-actions.html', { init })
    await browser.url(testUrl).then(() => browser.waitForAgentLoad())

    const [insHarvests] = await Promise.all([
      insightsCapture.waitForResult({ timeout: 7500 }),
      $('#textbox').click().then(async () => {
        // rage click
        await browser.execute(function () {
          for (let i = 0; i < 5; i++) {
            document.querySelector('span').click()
          }
        })
        // stop aggregating clicks
        await $('body').click()
      })
    ])

    const userActionsHarvest = insHarvests.flatMap(harvest => harvest.request.body.ins) // firefox sends a window focus event on load, so we may end up with 2 harvests
    const clickUAs = userActionsHarvest.filter(ua => ua.action === 'click')
    expect(clickUAs.length).toBeGreaterThanOrEqual(2)
    expect(clickUAs[0]).toMatchObject({
      eventType: 'UserAction',
      action: 'click',
      actionCount: 1,
      actionDuration: 0,
      actionMs: '[0]',
      target: 'html>body>div>input#textbox:nth-of-type(1)',
      targetId: 'textbox',
      targetTag: 'INPUT',
      targetType: 'text',
      pageUrl: expect.any(String),
      timestamp: expect.any(Number)
    })
    expect(clickUAs[1]).toMatchObject({
      eventType: 'UserAction',
      action: 'click',
      actionCount: 5,
      actionDuration: expect.any(Number),
      actionMs: expect.any(String),
      nearestId: 'pay-btn',
      nearestTag: 'SPAN',
      nearestType: 'submit',
      nearestClass: 'btn-cart-add flex-grow container',
      rageClick: true,
      target: 'html>body>div>button#pay-btn>span:nth-of-type(1)',
      targetTag: 'SPAN',
      pageUrl: expect.any(String),
      timestamp: expect.any(Number)
    })
    expect(clickUAs[1].actionDuration).toBeGreaterThanOrEqual(0)
    expect(clickUAs[1].actionMs).toEqual(expect.stringMatching(/^\[\d+(,\d+){4}\]$/))
  })

  // firefox generates a focus event when the page loads, which makes testing this easier
  it.withBrowsersMatching(onlyFirefox)('ignore attributes on window blur and focus', async () => {
    const testUrl = await browser.testHandle.assetURL('user-actions-modified-window.html', { init })
    await browser.url(testUrl).then(() => browser.waitForAgentLoad())

    const [insHarvests] = await Promise.all([
      insightsCapture.waitForResult({ timeout: 7500 }),
      $('#pay-btn').click().then(async () => {
        // rage click
        await browser.execute(function () {
          for (let i = 0; i < 5; i++) {
            document.querySelector('#textbox').click()
          }
        })
        // stop aggregating textbox clicks
        await $('body').click()
      })
    ])

    const userActionsHarvest = insHarvests.flatMap(harvest => harvest.request.body.ins) // firefox sends a window focus event on load, so we may end up with 2 harvests
    const focusBlurUAs = userActionsHarvest.filter(ua => ua.action === 'focus' || ua.action === 'blur')
    expect(focusBlurUAs.length).toBeGreaterThan(0)
    expect(focusBlurUAs[0].targetType).toBeUndefined()
  })

  it('report duplicative focus and blur events once', async () => {
    const testUrl = await browser.testHandle.assetURL('user-actions.html', { init })
    await browser.url(testUrl).then(() => browser.pause(2000))

    const [insHarvests] = await Promise.all([
      insightsCapture.waitForResult({ timeout: 5000 }),
      browser.execute(function () {
        let i = 0; while (i++ < 10) {
          window.dispatchEvent(new Event('focus'))
          window.dispatchEvent(new Event('blur'))
        }
      }).then(() => $('body').click()) //  stop aggregating the blur events
    ])

    const userActionsHarvest = insHarvests.flatMap(harvest => harvest.request.body.ins) // firefox sends a window focus event on load, so we may end up with 2 harvests
    const focusEvents = userActionsHarvest.filter(ua => ua.action === 'focus')
    const blurEvents = userActionsHarvest.filter(ua => ua.action === 'blur')

    // firefox generates a focus event when the page loads, which is reported within the time gap between the page load and the first user action. This
    // leads to two focus events for firefox and one for the others, but very inconsistently since it could be triggered in the time it takes to debounce
    const isFirefox = browserMatch(onlyFirefox)
    if (isFirefox) {
      expect(focusEvents.length).toBeLessThanOrEqual(2)
      expect(JSON.parse(focusEvents[0].actionMs).length).toBeLessThanOrEqual(2)
      expect(focusEvents[0].actionCount).toBeLessThanOrEqual(2)
    } else {
      expect(focusEvents.length).toEqual(1)
      expect(JSON.parse(focusEvents[0].actionMs).length).toEqual(1)
      expect(focusEvents[0].actionCount).toEqual(1)
    }
    expect(blurEvents.length).toEqual(1)
    expect(JSON.parse(blurEvents[0].actionMs).length).toEqual(1)
    expect(blurEvents[0].actionCount).toEqual(1)
  })

  it('detect when agent is running inside iframe', async () => {
    const testUrl = await browser.testHandle.assetURL('iframe/same-origin.html', { init })
    await browser.url(testUrl).then(() => browser.pause(2000))

    const [insHarvests] = await Promise.all([
      insightsCapture.waitForResult({ timeout: 5000 }),
      browser.execute(function () {
        const frame = document.querySelector('iframe')
        const frameBody = frame.contentWindow.document.querySelector('body')
        frame.focus()
        frameBody.click()
        window.focus()
        window.location.reload()
      })

    ])

    const userActionsHarvest = insHarvests.flatMap(harvest => harvest.request.body.ins) // firefox sends a window focus event on load, so we may end up with 2 harvests
    expect(userActionsHarvest.length).toBeGreaterThanOrEqual(3) // 3 page events above, plus the occasional window focus event mentioned above
    userActionsHarvest.forEach(ua => {
      expect(ua.eventType).toEqual('UserAction')
      expect(ua.iframe).toEqual(true)
    })
  })

  it('have string classNames for SVG elements', async () => {
    const testUrl = await browser.testHandle.assetURL('svg.html', { init })
    await browser.url(testUrl).then(() => browser.waitForAgentLoad())

    const [insHarvests] = await Promise.all([
      insightsCapture.waitForResult({ timeout: 6000 }),
      $('#testRect').click().then(() => $('body').click())
    ])

    const userActionsHarvest = insHarvests.flatMap(harvest => harvest.request.body.ins)
    const clickUAs = userActionsHarvest.filter(ua => ua.action === 'click')
    expect(clickUAs[0]).toMatchObject({
      eventType: 'UserAction',
      action: 'click',
      actionCount: 1,
      target: 'html>body>svg>rect#testRect:nth-of-type(1)',
      nearestId: 'testRect',
      nearestClass: 'test-class',
      nearestTag: 'rect'
    })
  })
})
