const { testSupportMetricsRequest } = require('../../../tools/testing-server/utils/expect-tests')

describe('WebSocket supportability metrics', () => {
  it('should capture expected SMs', async () => {
    const supportabilityMetricsRequest = await browser.testHandle.createNetworkCaptures('bamServer', { test: testSupportMetricsRequest })
    const url = await browser.testHandle.assetURL('websockets.html')

    await browser.url(url)
      .then(() => browser.waitForAgentLoad())
      .then(() => browser.refresh())

    const [sms] = await supportabilityMetricsRequest.waitForResult({ totalCount: 1 })
    const smPayload = sms.request.body.sm
    const preLoadSMs = ['New']
    const postLoadSMs = ['Open', 'Send', 'Message', 'Close-Method', 'Close-Event']
    preLoadSMs.forEach(expectedSm => {
      const ms = smPayload.find(sm => sm.params.name === `WebSocket/${expectedSm}/PreLoad/Ms`)
      const msSinceClassInit = smPayload.find(sm => sm.params.name === `WebSocket/${expectedSm}/PreLoad/MsSinceClassInit`)

      expect(ms).toBeTruthy()
      expect(ms.stats.t).toBeGreaterThan(0)

      expect(msSinceClassInit).toBeTruthy()
      expect(msSinceClassInit.stats.t).toBeLessThanOrEqual(1) // shouldnt take more than 1 ms to call `new`
    })

    postLoadSMs.forEach(expectedSm => {
      const ms = smPayload.find(sm => sm.params.name === `WebSocket/${expectedSm}/PostLoad/Ms`)
      const msSinceClassInit = smPayload.find(sm => sm.params.name === `WebSocket/${expectedSm}/PostLoad/MsSinceClassInit`)
      const bytes = smPayload.find(sm => sm.params.name === `WebSocket/${expectedSm}/PostLoad/Bytes`)

      expect(ms).toBeTruthy()
      expect(ms.stats.t).toBeGreaterThan(0)
      expect(ms.stats.c).toEqual(2)

      expect(msSinceClassInit).toBeTruthy()
      expect(msSinceClassInit.stats.t).toBeGreaterThan(0)
      expect(msSinceClassInit.stats.c).toEqual(2)

      if (['Send', 'Message'].includes(expectedSm)) {
        expect(bytes).toBeTruthy()
        if (expectedSm === 'Send') expect(bytes.stats.t / bytes.stats.c).toBeGreaterThanOrEqual(8) // we are sending about 8 bytes from client to server
        if (expectedSm === 'Message') expect(bytes.stats.t / bytes.stats.c).toBeGreaterThanOrEqual(40) // we are sending about 40 bytes from server to client
      } else expect(bytes).toBeFalsy()
    })
  })
})
