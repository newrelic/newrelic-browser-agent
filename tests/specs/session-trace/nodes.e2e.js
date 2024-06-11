import { browserClick, testExpectedTrace } from '../util/helpers'

describe('AJAX', () => {
  afterEach(async () => {
    await browser.destroyAgentSession()
  })

  it('Does not capture XMLHttpRequest nodes when AJAX feature is disabled', async () => {
    await Promise.all([
      browser.testHandle.expectTrace(),
      browser.url(await browser.testHandle.assetURL('stn/ajax-disabled.html', { init: { ajax: { enabled: false } } }))
        .then(() => browser.waitForAgentLoad())
    ])

    const [{ request }] = await Promise.all([
      browser.testHandle.expectTrace(10000),
      browserClick('#trigger')
    ])
    testExpectedTrace({ data: request })
    const loadNodes = request.body.filter(function (node) { return (node.t === 'event' && node.n === 'load') || node.n === 'readystatechange' })
    expect(loadNodes.length).toEqual(0)
  })

  it('Does not capture XMLHttpRequest nodes in AJAX deny list', async () => {
    console.log(`${browser.testHandle.bamServerConfig.host}:${browser.testHandle.bamServerConfig.port}`)
    await Promise.all([
      browser.testHandle.expectTrace(),
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

    const [{ request }] = await Promise.all([
      browser.testHandle.expectTrace(10000),
      browserClick('#trigger')
    ])
    testExpectedTrace({ data: request })
    const loadNodes = request.body.filter(function (node) { return node.t === 'ajax' })
    expect(loadNodes.length).toEqual(0)
  })
})

describe('timings', () => {
  it('No negative timings', async () => {
    const [{ request }] = await Promise.all([
      browser.testHandle.expectTrace(),
      browser.url(await browser.testHandle.assetURL('instrumented.html'))
        .then(() => browser.waitForAgentLoad())
    ])

    testExpectedTrace({ data: request })
    expect(request.body.every(x => x.s >= 0 && x.e >= 0)).toEqual(true)
  })
})
