import { testExpectedTrace } from '../util/helpers'
import { testBlobTraceRequest } from '../../../tools/testing-server/utils/expect-tests'

let traceCapture

beforeEach(async () => {
  traceCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testBlobTraceRequest })
})

describe('AJAX', () => {
  afterEach(async () => {
    await browser.destroyAgentSession()
  })

  it('Does not capture XMLHttpRequest nodes when AJAX feature is disabled', async () => {
    await Promise.all([
      traceCapture.waitForResult({ totalCount: 1 }),
      browser.url(await browser.testHandle.assetURL('stn/ajax-disabled.html', { init: { ajax: { enabled: false } } }))
        .then(() => browser.waitForAgentLoad())
    ])

    const [traceHarvests] = await Promise.all([
      traceCapture.waitForResult({ timeout: 10000 }),
      browser.execute(function () {
        document.querySelector('#trigger').click()
      })
    ])

    traceHarvests.forEach(harvest => {
      testExpectedTrace({ data: harvest.request })
      const loadNodes = harvest.request.body.filter(function (node) { return node.t === 'ajax' })
      expect(loadNodes.length).toEqual(0)
    })
  })

  it('Does not capture XMLHttpRequest nodes in AJAX deny list', async () => {
    console.log(`${browser.testHandle.bamServerConfig.host}:${browser.testHandle.bamServerConfig.port}`)
    await Promise.all([
      traceCapture.waitForResult({ totalCount: 1 }),
      browser.url(await browser.testHandle.assetURL('stn/ajax-disabled.html', {
        init: {
          ajax: {
            deny_list: [
        `${browser.testHandle.bamServerConfig.host}:${browser.testHandle.bamServerConfig.port}`
            ]
          }
        }
      }))
        .then(() => browser.waitForAgentLoad())
    ])

    const [traceHarvests] = await Promise.all([
      traceCapture.waitForResult({ timeout: 10000 }),
      browser.execute(function () {
        document.querySelector('#trigger').click()
      })
    ])

    traceHarvests.forEach(harvest => {
      testExpectedTrace({ data: harvest.request })
      const loadNodes = harvest.request.body.filter(function (node) { return node.t === 'ajax' })
      expect(loadNodes.length).toEqual(0)
    })
  })
})

describe('timings', () => {
  it('No negative timings', async () => {
    const [traceHarvests] = await Promise.all([
      traceCapture.waitForResult({ totalCount: 1 }),
      browser.url(await browser.testHandle.assetURL('instrumented.html'))
        .then(() => browser.waitForAgentLoad())
    ])

    traceHarvests.forEach(harvest => {
      testExpectedTrace({ data: harvest.request })
      expect(harvest.request.body.every(x => x.s >= 0 && x.e >= 0)).toEqual(true)
    })
  })

  it('should capture all timings in relative timestamp values', async () => {
    const [traceHarvests] = await Promise.all([
      traceCapture.waitForResult({ totalCount: 1 }),
      browser.url(await browser.testHandle.assetURL('instrumented.html'))
        .then(() => browser.waitForAgentLoad())
    ])

    traceHarvests.forEach(harvest => {
      testExpectedTrace({ data: harvest.request })
      expect(harvest.request.body.every(x => x.s < 60000 && x.e < 60000)).toEqual(true)
    })
  })
})
