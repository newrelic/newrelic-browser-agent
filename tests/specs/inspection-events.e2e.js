import { getDebugLogs } from './util/helpers'

describe('inspection events', () => {
  it('emits all types of inspection events', async () => {
    await browser.url(await browser.testHandle.assetURL('inspection-events.html'))
      .then(() => browser.waitForAgentLoad())
      .then(() => browser.waitUntil(
        () => browser.execute(function () {
          return window?.inspectionEvents?.buffer &&
            window.inspectionEvents.harvest &&
            window.inspectionEvents.api
        }),
        {
          timeout: 30000,
          timeoutMsg: 'Timeout on inspection events'
        }))

    const inspectionEvents = await browser.execute(function () {
      return window.inspectionEvents
    })

    console.log(await getDebugLogs())

    expect(inspectionEvents.initialize).toBe(true)
    expect(inspectionEvents.load).toBe(true)
    expect(inspectionEvents.buffer).toBe(true)
    expect(inspectionEvents.harvest).toBe(true)
    expect(inspectionEvents.api).toBe(true)
  })
})
