// import { testErrorsRequest } from '../../../tools/testing-server/utils/expect-tests'
// import { srConfig } from '../util/helpers'
//
// describe('hasReplay', () => {
//   it('should be true for jserror if session replay was resumed', async () => {
//     const errorsCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testErrorsRequest })
//     const [errors] = await Promise.all([
//       errorsCapture.waitForResult({ totalCount: 2, timeout: 15000 }),
//       browser.url(await browser.testHandle.assetURL('rrweb-hasreplay-after-resume.html',
//         srConfig({ session_replay: { preload: false, sampling_rate: 100 } })))
//         .then(() => browser.waitForSessionReplayRecording())
//     ])
//
//     const error1Params = errors[0].request.body.err[0].params
//     expect(error1Params.message).toBe('after load')
//     expect(error1Params.hasReplay).toBe(true)
//
//     const error2Params = errors[1].request.body.err[0].params
//     expect(error2Params.message).toBe('after resume, should have hasReplay = true')
//     expect(error2Params.hasReplay).toBe(true)
//   })
// })
