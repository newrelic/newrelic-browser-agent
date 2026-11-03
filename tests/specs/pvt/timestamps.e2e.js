import { supportsCumulativeLayoutShift, supportsInteractionToNextPaint } from '../../../tools/browser-matcher/common-matchers.mjs'
import { testTimingEventsRequest } from '../../../tools/testing-server/utils/expect-tests'

/* Timestamps are derived from the server-corrected clock, so they're compared against the test runner's wall clock.
Padding absorbs the harvest/navigation latency and any residual skew between the runner and the browser. */
const CLOCK_PADDING_MS = 5000

const getTimestamp = (timing) => timing?.attributes.find(attr => attr.key === 'timestamp')?.value

describe('pvt timestamp attribute', () => {
  let timingsCapture

  beforeEach(async () => {
    timingsCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testTimingEventsRequest })
  })

  const findTiming = (harvests, name) => harvests
    .find(harvest => harvest.request.body.find(t => t.name === name))
    ?.request.body.find(timing => timing.name === name)

  it('is an absolute server-corrected time on each timing node', async () => {
    const start = Date.now()
    await browser.url(await browser.testHandle.assetURL('instrumented.html'))
      .then(() => browser.waitForAgentLoad())

    const [timingsHarvests] = await Promise.all([
      timingsCapture.waitForResult({ timeout: 10000 }),
      browser.url(await browser.testHandle.assetURL('/'))
    ])
    const end = Date.now()

    const nodes = ['fcp', 'load', 'unload', 'pageHide']
    nodes.forEach(name => {
      const timestamp = getTimestamp(findTiming(timingsHarvests, name))
      expect(timestamp).toBeBetween(start - CLOCK_PADDING_MS, end + CLOCK_PADDING_MS)
    })
  })

  it.withBrowsersMatching(supportsCumulativeLayoutShift)('on the cls node is an absolute time, not the unitless score', async () => {
    const start = Date.now()
    await browser.url(await browser.testHandle.assetURL('instrumented.html'))
      .then(() => browser.waitForAgentLoad())

    const [timingsHarvests] = await Promise.all([
      timingsCapture.waitForResult({ timeout: 10000 }),
      browser.url(await browser.testHandle.assetURL('/'))
    ])
    const end = Date.now()

    const cls = findTiming(timingsHarvests, 'cls')
    expect(cls).toBeTruthy()
    // with no layout shift there's no largestShiftTime, so the observation time is used instead
    expect(getTimestamp(cls)).toBeBetween(start - CLOCK_PADDING_MS, end + CLOCK_PADDING_MS)
  })

  it.withBrowsersMatching(supportsInteractionToNextPaint)('on the inp node is the interaction time, not its duration', async () => {
    const start = Date.now()
    await browser.url(await browser.testHandle.assetURL('basic-click-tracking.html'))
      .then(() => browser.waitForAgentLoad())

    const [timingsHarvests] = await Promise.all([
      timingsCapture.waitForResult({ timeout: 10000 }),
      $('#free_tacos').click()
        .then(() => browser.pause(1000))
        .then(async () => browser.url(await browser.testHandle.assetURL('/')))
    ])
    const end = Date.now()

    const inp = findTiming(timingsHarvests, 'inp')
    expect(inp).toBeTruthy()
    expect(getTimestamp(inp)).toBeBetween(start - CLOCK_PADDING_MS, end + CLOCK_PADDING_MS)
  })
})
