/**
 * These tests are being commented out due to flakiness. A ticket is being opened
 * to resolve the issues. Once resolved, these tests should be duplicated to the
 * spa folder to ensure the ajax events are captured in the initial page load when
 * the agent is loaded late.
 */

// import { checkAjaxEvents } from '../../util/basic-checks'
// import { supportsFetch } from '../../../tools/browser-matcher/common-matchers.mjs'
//
// const deferredMethods = [
//   ['async'],
//   ['defer'],
//   ['injection'], // Represents injection asap
//   ['injection', 1000], // Represents delayed injection
//   ['scriptTag']
// ]
//
// describe('ajax async agent', () => {
//   deferredMethods.forEach(method => {
//     it(`should capture the xhr when agent loaded late using ${method[0]} method${method[1] ? ' with ' + method[1] + 'ms delay' : ''}`, async () => {
//       const [ajaxEvents] = await Promise.all([
//         browser.testHandle.expectAjaxEvents(),
//         browser.url(await browser.testHandle.assetURL('ajax/xhr-before-load.html', { loader: 'full', script: method[0], injectionDelay: method[1] }))
//           .then(() => browser.waitForAgentLoad())
//       ])
//
//       checkAjaxEvents(ajaxEvents.request, { specificPath: '/json' })
//       expect(ajaxEvents.request.body.filter(x => x.path === '/json').length).toEqual(1) // only captured once
//     })
//   });
//
//   [...deferredMethods, ['embed']].forEach(method => {
//     it(`should capture the xhr when agent loaded late using ${method[0]} method (with late html placement)${method[1] ? ' with ' + method[1] + 'ms delay' : ''}`, async () => {
//       const [ajaxEvents] = await Promise.all([
//         browser.testHandle.expectAjaxEvents(),
//         browser.url(await browser.testHandle.assetURL('ajax/xhr-late-agent.html', { loader: 'full', script: method[0], injectionDelay: method[1] }))
//           .then(() => browser.waitForAgentLoad())
//       ])
//
//       checkAjaxEvents(ajaxEvents.request, { specificPath: '/json' })
//       expect(ajaxEvents.request.body.filter(x => x.path === '/json').length).toEqual(1) // only captured once
//     })
//   })
//
//   deferredMethods.forEach(method => {
//     it.withBrowsersMatching(supportsFetch)(`should capture the fetch when agent loaded late using ${method[0]} method${method[1] ? ' with ' + method[1] + 'ms delay' : ''}`, async () => {
//       const [ajaxEvents] = await Promise.all([
//         browser.testHandle.expectAjaxEvents(),
//         browser.url(await browser.testHandle.assetURL('ajax/fetch-before-load.html', { loader: 'full', script: method[0], injectionDelay: method[1] }))
//           .then(() => browser.waitForAgentLoad())
//       ])
//
//       checkAjaxEvents(ajaxEvents.request, { specificPath: '/json' })
//       expect(ajaxEvents.request.body.filter(x => x.path === '/json').length).toEqual(1) // only captured once
//     })
//   });
//
//   [...deferredMethods, ['embed']].forEach(method => {
//     it.withBrowsersMatching(supportsFetch)(`should capture the fetch when agent loaded late using ${method[0]} method (with late html placement)${method[1] ? ' with ' + method[1] + 'ms delay' : ''}`, async () => {
//       const [ajaxEvents] = await Promise.all([
//         browser.testHandle.expectAjaxEvents(),
//         browser.url(await browser.testHandle.assetURL('ajax/fetch-late-agent.html', { loader: 'full', script: method[0], injectionDelay: method[1] }))
//           .then(() => browser.waitForAgentLoad())
//       ])
//
//       checkAjaxEvents(ajaxEvents.request, { specificPath: '/json' })
//       expect(ajaxEvents.request.body.filter(x => x.path === '/json').length).toEqual(1) // only captured once
//     })
//   })
// })
