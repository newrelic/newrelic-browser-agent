// const { notIOS, notSafari } = require('../../../tools/browser-matcher/common-matchers.mjs')
// const { testSupportMetricsRequest, testErrorsRequest } = require('../../../tools/testing-server/utils/expect-tests')

/** NOTE: Safari and iOS safari are blocked from connecting to the websocket protocol (on LT!), which throws socket errors instead of connecting and capturing the expected payloads.
   *  validated that this works locally for these envs.  Any websocket changes must be validated manually for these envs */
// describe.withBrowsersMatching([notSafari, notIOS])('WebSocket supportability metrics', () => {
//   it('should capture expected SMs', async () => {
//     const supportabilityMetricsRequest = await browser.testHandle.createNetworkCaptures('bamServer', { test: testSupportMetricsRequest })
//     const url = await browser.testHandle.assetURL('websockets.html')

//     await browser.url(url)
//       .then(() => browser.waitForAgentLoad())
//       .then(() => browser.refresh())

//     const [sms] = await supportabilityMetricsRequest.waitForResult({ totalCount: 1 })
//     const smPayload = sms.request.body.sm
//     const smTags = ['New', 'Open', 'Send', 'Message', 'Close-Clean']

//     smTags.forEach(expectedSm => {
//       const ms = smPayload.find(sm => sm.params.name === `WebSocket/${expectedSm}/Ms`)
//       const msSinceClassInit = smPayload.find(sm => sm.params.name === `WebSocket/${expectedSm}/MsSinceClassInit`)
//       const bytes = smPayload.find(sm => sm.params.name === `WebSocket/${expectedSm}/Bytes`)

//       expect(ms).toBeTruthy()
//       expect(ms.stats.t).toBeGreaterThan(0)
//       expect(ms.stats.c).toEqual(2)

//       expect(msSinceClassInit).toBeTruthy()
//       if (expectedSm === 'New') expect(msSinceClassInit.stats.t).toBeLessThanOrEqual(1)
//       else expect(msSinceClassInit.stats.t).toBeGreaterThan(0)
//       expect(msSinceClassInit.stats.c).toEqual(2)

//       if (['Send', 'Message'].includes(expectedSm)) {
//         expect(bytes).toBeTruthy()
//         if (expectedSm === 'Send') expect(bytes.stats.t / bytes.stats.c).toBeGreaterThanOrEqual(8) // we are sending about 8 bytes from client to server
//         if (expectedSm === 'Message') expect(bytes.stats.t / bytes.stats.c).toBeGreaterThanOrEqual(40) // we are sending about 40 bytes from server to client
//       } else expect(bytes).toBeFalsy()
//     })
//   })

//   ;['robust-websocket', 'reconnecting-websocket'].forEach((thirdPartyWSWrapper) => {
//     it('should work with known third-party WS wrapper - ' + thirdPartyWSWrapper, async () => {
//       const [supportabilityMetricsRequest, errorsRequest] =
//         await browser.testHandle.createNetworkCaptures('bamServer', [
//           { test: testSupportMetricsRequest },
//           { test: testErrorsRequest }
//         ])
//       const url = await browser.testHandle.assetURL(`test-builds/library-wrapper/${thirdPartyWSWrapper}.html`)

//       await browser.url(url)

//       const [errors, [sms]] = await Promise.all([
//         errorsRequest.waitForResult({ timeout: 10000 }),
//         supportabilityMetricsRequest.waitForResult({ totalCount: 1 })
//       ])
//       // should not have thrown errors
//       expect(errors.length).toEqual(0)

//       const smPayload = sms.request.body.sm
//       const smTags = ['New', 'Open', 'Send', 'Message', 'Close-Clean']

//       smTags.forEach(expectedSm => {
//         const ms = smPayload.find(sm => sm.params.name === `WebSocket/${expectedSm}/Ms`)
//         const msSinceClassInit = smPayload.find(sm => sm.params.name === `WebSocket/${expectedSm}/MsSinceClassInit`)
//         const bytes = smPayload.find(sm => sm.params.name === `WebSocket/${expectedSm}/Bytes`)
//         expect(ms).toBeTruthy()
//         expect(msSinceClassInit).toBeTruthy()
//         if (['Send', 'Message'].includes(expectedSm))expect(bytes).toBeTruthy()
//       })
//     })
//   })
// })
