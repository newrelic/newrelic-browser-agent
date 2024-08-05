/* globals errorFn, noticeErrorFn */

const { Key } = require('webdriverio')
const { notSafari, notIOS, notAndroid } = require('../../../tools/browser-matcher/common-matchers.mjs')
const { srConfig } = require('../util/helpers')
const { checkJsErrors } = require('../../util/basic-checks')
const { testErrorsRequest, testAnyJseXhrRequest } = require('../../../tools/testing-server/utils/expect-tests')

describe('error payloads', () => {
  let errorsCapture

  beforeEach(async () => {
    errorsCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testErrorsRequest })
  })

  afterEach(async () => {
    await browser.destroyAgentSession()
  })

  it('simultaneous errors - should set a timestamp, tied to the FIRST error seen - noticeError', async () => {
    const [errorsResults, [relativeTimestamp, absoluteTimestamp]] = await Promise.all([
      errorsCapture.waitForResult({ totalCount: 1 }),
      browser.url(await browser.testHandle.assetURL('instrumented.html')) // Setup expects before loading the page
        .then(() => browser.waitForAgentLoad())
        .then(() => browser.execute(function () {
          var timeKeeper = Object.values(newrelic.initializedAgents)[0].config.runtime.timeKeeper
          var start = performance.now()
          for (var i = 0; i < 20; i++) { newrelic.noticeError(new Error('test')) }
          return [start, timeKeeper.convertRelativeTimestamp(start)]
        }))
    ])

    const { request: { body: { err } } } = errorsResults[0]

    expect(relativeTimestamp).toBeWithin(err[0].metrics.time.min - 1, err[0].metrics.time.max + 1)
    expect(err[0].params.firstOccurrenceTimestamp).toBeWithin(Math.floor(absoluteTimestamp), Math.floor(absoluteTimestamp + 100))
    expect(err[0].params.timestamp).toBeWithin(Math.floor(absoluteTimestamp), Math.floor(absoluteTimestamp + 100))
  })

  it('simultaneous errors - should set a timestamp, tied to the FIRST error seen - thrown errors', async () => {
    const [errorsResults, correctedOriginTime] = await Promise.all([
      errorsCapture.waitForResult({ totalCount: 1 }),
      browser.url(await browser.testHandle.assetURL('duplicate-errors.html')) // Setup expects before loading the page
        .then(() => browser.waitForAgentLoad())
        .then(() => browser.execute(function () {
          var timeKeeper = Object.values(newrelic.initializedAgents)[0].config.runtime.timeKeeper
          for (var i = 0; i < 2; i++) { errorFn() }
          return timeKeeper.correctedOriginTime
        }))
    ])

    const { request: { body: { err } } } = errorsResults[0]

    const [firstTime, secondTime] = await browser.execute(function () {
      return [window['error-0'], window['error-1']]
    })

    expect(err[0].params.firstOccurrenceTimestamp).toBeWithin(Math.floor(correctedOriginTime + firstTime), Math.floor(correctedOriginTime + secondTime + 10))
  })

  it('subsequent errors - should set a timestamp, tied to the FIRST error seen - noticeError', async () => {
    const [errorsResults] = await Promise.all([
      errorsCapture.waitForResult({ totalCount: 1 }),
      browser.url(await browser.testHandle.assetURL('duplicate-errors.html')) // Setup expects before loading the page
        .then(() => browser.waitForFeatureAggregate('jserrors'))
        .then(() => browser.execute(function () {
          noticeErrorFn()
        }))
    ])

    const { request: { body: { err: err1 } } } = errorsResults[0]

    const [errorsResults2] = await Promise.all([
      errorsCapture.waitForResult({ totalCount: 2 }),
      browser.execute(function () {
        noticeErrorFn()
      })
    ])

    const { request: { body: { err: err2 } } } = errorsResults2[1]

    expect(err2[0].params.firstOccurrenceTimestamp).toEqual(err1[0].params.firstOccurrenceTimestamp)
    expect(err2[0].params.timestamp).not.toEqual(err1[0].params.timestamp)
  })

  it('subsequent errors - should set a timestamp, tied to the FIRST error seen - thrown errors', async () => {
    const [errorsResults] = await Promise.all([
      errorsCapture.waitForResult({ totalCount: 1 }),
      browser.url(await browser.testHandle.assetURL('duplicate-errors.html')) // Setup expects before loading the page
        .then(() => browser.waitForFeatureAggregate('jserrors'))
        .then(() => browser.execute(function () {
          errorFn()
        }))
    ])

    const { request: { body: { err: err1 } } } = errorsResults[0]

    const [errorsResults2] = await Promise.all([
      errorsCapture.waitForResult({ totalCount: 2 }),
      browser.execute(function () {
        errorFn()
      })
    ])

    const { request: { body: { err: err2 } } } = errorsResults2[1]

    expect(err2[0].params.firstOccurrenceTimestamp).toEqual(err1[0].params.firstOccurrenceTimestamp)
    expect(err2[0].params.timestamp).not.toEqual(err1[0].params.timestamp)
  })

  it('errors without a stack trace still get line and col when present', async () => {
    const [[{ request: { body: { err } } }]] = await Promise.all([
      errorsCapture.waitForResult({ totalCount: 1 }),
      browser.url(await browser.testHandle.assetURL('js-error-no-stack.html')) // Setup expects before loading the page
        .then(() => browser.waitForFeatureAggregate('jserrors'))
    ])

    expect(err[0].params.stack_trace.match(/<inline>:[0-9]+:[0-9]+/).length).toEqual(1)
  })

  it('noticeError called with no arguments does not throw or capture any error', async () => {
    const [errorResults] = await Promise.all([
      errorsCapture.waitForResult({ timeout: 10000 }), // should not harvest an error (neither the noticeError call or an error from calling the API with no arg)
      browser.url(await browser.testHandle.assetURL('instrumented.html')) // Setup expects before loading the page
        .then(() => browser.waitForFeatureAggregate('jserrors'))
        .then(() => browser.execute(function () { newrelic.noticeError() }))
    ])

    expect(errorResults).toEqual([])
  })

  /**
   * This is a specific bug observed in rrweb for specific browsers tied to contenteditable divs.
   * This serves a purpose of checking that rrweb errors are not reported as `err`
   * **/
  it.withBrowsersMatching([notSafari, notAndroid, notIOS])('should collect rrweb errors only as internal errors', async () => {
    const anyJseXhrCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testAnyJseXhrRequest })
    await browser.enableSessionReplay()
    const [[{ request }]] = await Promise.all([
      anyJseXhrCapture.waitForResult({ timeout: 10000 }),
      browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig()))
        .then(() => browser.waitForSessionReplayRecording())
        .then(() => $('#content-editable-div'))
        .then((elem) => elem.click())
        .then(() => browser.keys([Key.Ctrl, Key.Backspace]))
    ])

    checkJsErrors(request, ['Cannot read properties of null (reading \'tagName\')'], 'ierr')
    expect(request.body.err).toBeUndefined()
  })
})
