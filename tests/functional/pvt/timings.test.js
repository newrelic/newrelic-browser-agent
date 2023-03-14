/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')
const querypack = require('@newrelic/nr-querypack')

const supportedFirstPaint = testDriver.Matcher.withFeature('firstPaint')
const supportedFirstContentfulPaint = testDriver.Matcher.withFeature('firstContentfulPaint')
const supportedLcp = testDriver.Matcher.withFeature('largestContentfulPaint')
const supportedCls = testDriver.Matcher.withFeature('cumulativeLayoutShift')
const supportsINP = testDriver.Matcher.withFeature('interactionToNextPaint')
const supportsLT = testDriver.Matcher.withFeature('longTaskTiming')

const isClickInteractionType = type => type === 'pointerdown' || type === 'mousedown' || type === 'click'
function fail (t) {
  return (err) => {
    t.error(err)
    t.end()
  }
}

runPaintTimingsTests('spa')
runPaintTimingsTests('rum')
runFirstInteractionTests('spa')
runFirstInteractionTests('rum')
runLargestContentfulPaintFromInteractionTests('spa')
runLargestContentfulPaintFromInteractionTests('rum')
runWindowUnloadTests('spa')
runWindowUnloadTests('rum')
runWindowLoadTests('spa')
runWindowLoadTests('rum')
runPageHideTests('spa')
runPageHideTests('rum')
runClsTests('spa')
runClsTests('rum')
runCustomAttributeTests('spa')
runCustomAttributeTests('rum')
runLcpTests('rum')
runLcpTests('spa')
runPvtInStnTests('spa')
runLongTasksTest('rum')

testDriver.test('Disabled timings feature', function (t, browser, router) {
  let url = router.assetURL('final-harvest-page-view-timings-disabled.html', { loader: 'rum' })
  let loadPromise = browser.safeGet(url).waitForFeature('loaded')
  let rumPromise = router.expectRum()

  Promise.all([rumPromise, loadPromise])
    .then(() => {
      t.equal(router.requestCounts.bamServer.events, undefined, 'no events harvest yet')

      const eventsPromise = router.expectEvents(8000).then(() => t.error('Events should not have been harvested')).catch(() => {})
      const domPromise = browser
        .elementById('standardBtn')
        .click()
        .get(router.assetURL('/'))

      return Promise.all([eventsPromise, domPromise])
    })
    .then(([results]) => {
      t.equal(router.requestCounts.bamServer.events, undefined, 'no events harvest')
      t.ok(!results, 'no events harvest')
      t.end()
    })
    .catch(fail(t))
})

function runPaintTimingsTests (loader) {
  testDriver.test(`First paint for ${loader} agent`, supportedFirstPaint, function (t, browser, router) {
    t.plan(1)

    const rumPromise = router.expectRum()
    const timingsPromise = router.expectTimings()
    const loadPromise = browser.safeGet(router.assetURL('instrumented.html', { loader: 'spa' })).waitForFeature('loaded')

    Promise.all([timingsPromise, rumPromise, loadPromise])
      .then(([{ request: timingsResult }]) => {
        const { body, query } = timingsResult
        const timings = querypack.decode(body && body.length ? body : query.e)
        let timing = timings.find(t => t.name === 'fp')
        t.ok(timing.value > 0, 'firstPaint is a positive value')
        t.end()
      })
      .catch(fail(t))
  })

  testDriver.test(`First contentful paint for ${loader} agent`, supportedFirstContentfulPaint, function (t, browser, router) {
    t.plan(1)

    const rumPromise = router.expectRum()
    const timingsPromise = router.expectTimings()
    const loadPromise = browser.safeGet(router.assetURL('instrumented.html', { loader: 'spa' })).waitForFeature('loaded')

    Promise.all([timingsPromise, rumPromise, loadPromise])
      .then(([{ request: timingsResult }]) => {
        const { body, query } = timingsResult
        const timings = querypack.decode(body && body.length ? body : query.e)
        let timing = timings.find(t => t.name === 'fcp')
        t.ok(timing.value > 0, 'firstContentfulPaint is a positive value')
        t.end()
      })
      .catch(fail(t))
  })
}

function runFirstInteractionTests (loader) {
  testDriver.test(`First interaction and first input delay for ${loader} agent`, function (t, browser, router) {
    const rumPromise = router.expectRum()
    const loadPromise = browser.safeGet(router.assetURL('basic-click-tracking.html', { loader: loader })).waitForFeature('loaded')

    const start = Date.now()

    Promise.all([rumPromise, loadPromise])
      .then(() => {
        const domPromise = browser.elementById('free_tacos').click()
          .get(router.assetURL('/'))
        const timingsPromise = router.expectTimings()
        return Promise.all([timingsPromise, domPromise])
      })
      .then(([{ request: timingsResult }]) => {
        const { body, query } = timingsResult
        const timings = querypack.decode(body && body.length ? body : query.e)

        var timing = timings.find(item => item.name === 'fi')
        t.ok(timing.value > 0, 'firstInteraction is a positive value')
        t.ok(timing.value < (Date.now() - start), 'firstInteraction should be a reasonable value')

        var attribute = timing.attributes.find(a => a.key === 'type')
        t.ok(isClickInteractionType(attribute.value), 'firstInteraction event type is a mouse event')
        t.equal(attribute.type, 'stringAttribute', 'firstInteraction attribute type is stringAttribute')

        attribute = timing.attributes.find(a => a.key === 'fid')
        if (browser.match('notInternetExplorer') || attribute) { // IE may have unreliable event timestamps so ok to skip, but other browsers should have FID
          t.ok(timing.value > 0, 'firstInputDelay is a non-negative value')
          t.equal(attribute.type, 'doubleAttribute', 'firstInputDelay attribute type is doubleAttribute')
        }

        t.end()
      })
      .catch(fail(t))
  })
}

function runLargestContentfulPaintFromInteractionTests (loader) {
  testDriver.test(`Largest Contentful Paint from first interaction event for ${loader} agent`, supportedLcp, function (t, browser, router) {
    t.plan(9)
    const rumPromise = router.expectRum()
    const loadPromise = browser.safeGet(router.assetURL('basic-click-tracking.html', { loader: loader })).waitForFeature('loaded')

    Promise.all([rumPromise, loadPromise])
      .then(() => {
        const domPromise = browser.elementById('free_tacos').click()
          .get(router.assetURL('/'))
        const timingsPromise = router.expectTimings()
        return Promise.all([timingsPromise, domPromise])
      })
      .then(([{ request: timingsResult }]) => {
        const { body, query } = timingsResult
        const timings = querypack.decode(body && body.length ? body : query.e)

        const timing = timings.find(t => t.name === 'lcp')
        t.ok(timing, 'there is a largestContentfulPaint timing')
        t.ok(timing.value > 0, 'largestContentfulPaint is a positive value')

        var eid = timing.attributes.find(a => a.key === 'eid')
        t.equal(eid.value, 'free_tacos', 'element id is present and correct')
        t.equal(eid.type, 'stringAttribute', 'largestContentfulPaint attribute elementId is stringAttribute')

        var size = timing.attributes.find(a => a.key === 'size')
        t.ok(size.value > 0, 'size is a non-negative value')
        t.equal(size.type, 'doubleAttribute', 'largestContentfulPaint attribute size is doubleAttribute')

        var tagName = timing.attributes.find(a => a.key === 'elTag')
        t.equal(tagName.value, 'BUTTON', 'element.tagName is present and correct')
        t.equal(size.type, 'doubleAttribute', 'largestContentfulPaint attribute elementTagName is stringAttribute')

        t.equal(timing.attributes.length, 7, 'largestContentfulPaint has seven attributes')

        t.end()
      })
      .catch(fail(t))
  })
}

function runWindowLoadTests (loader) {
  testDriver.test(`window load timing for ${loader} agent`, function (t, browser, router) {
    t.plan(4)

    let start = Date.now()
    let url = router.assetURL('instrumented.html', { loader: loader })
    let loadPromise = browser.safeGet(url).waitForFeature('loaded')

    Promise.all([loadPromise, router.expectRum()])
      .then(() => {
        let timingsPromise = router.expectTimings()
        let domPromise = browser.get(router.assetURL('/'))
        return Promise.all([timingsPromise, domPromise]).then(([data]) => {
          return data
        })
      })
      .then(({ request: { body, query } }) => {
        let duration = Date.now() - start

        const timings = querypack.decode(body && body.length ? body : query.e)
        t.ok(timings.length > 0, 'there should be at least one timing metric')

        var timing = timings.find(t => t.name === 'load')
        t.ok(timing, 'there should be load timing')
        t.ok(timing.value > 0, 'value should be a positive number')
        t.ok(timing.value <= duration, 'value should not be larger than time to unload')

        t.end()
      })
      .catch(fail(t))
  })
}

function runWindowUnloadTests (loader) {
  testDriver.test(`unload timing for ${loader} agent`, function (t, browser, router) {
    t.plan(4)

    let start = Date.now()
    let url = router.assetURL('instrumented.html', { loader: loader })
    let loadPromise = browser.safeGet(url).waitForFeature('loaded')

    Promise.all([loadPromise, router.expectRum()])
      .then(() => {
        let timingsPromise = router.expectTimings()
        let domPromise = browser.get(router.assetURL('/'))
        return Promise.all([timingsPromise, domPromise]).then(([data, clicked]) => {
          return data
        })
      })
      .then(({ request: { body, query } }) => {
        let duration = Date.now() - start

        const timings = querypack.decode(body && body.length ? body : query.e)
        t.ok(timings.length > 0, 'there should be at least one timing metric')

        var timing = timings.find(t => t.name === 'unload')
        t.ok(timing, 'there should be unload timing')
        t.ok(timing.value > 0, 'value should be a positive number')
        t.ok(timing.value <= duration, 'value should not be larger than time to unload')

        t.end()
      })
      .catch(fail(t))
  })
}

function runPageHideTests (loader) {
  testDriver.test(`Timings on pagehide for ${loader} agent`, function (t, browser, router) {
    let start = Date.now()
    let url = router.assetURL('pagehide.html', { loader: loader })
    let loadPromise = browser.safeGet(url).waitForFeature('loaded')

    Promise.all([loadPromise, router.expectRum()])
      .then(() => {
        const clickPromise = browser
          .elementById('initial').click() // we do this because of INP's first-input handling which may cause it to not trigger; this way the button click below should guarantee that it fires
          .elementById('btn1').click()
          .get(router.assetURL('/'))
        const timingsPromise = router.expectTimings()
        return Promise.all([timingsPromise, clickPromise])
      })
      .then(([{ request: timingsResult }]) => {
        const { body, query } = timingsResult
        const timings = querypack.decode(body && body.length ? body : query.e)
        let duration = Date.now() - start

        t.ok(timings.length > 0, 'there should be at least one timing metric')

        let timing = timings.find(t => t.name === 'pageHide')
        t.ok(timing, 'there should be pageHide timing')
        t.ok(timing.value > 0, 'value should be a positive number')
        t.ok(timing.value <= duration, 'value should not be larger than time since start of the test')

        if (supportsINP.match(browser)) {
          timing = timings.find(t => t.name === 'inp')
          t.ok(timing, 'there should be an INP timing')
          t.ok(timing.value >= 0, 'value should be a positive number')
          t.ok(timing.value <= duration, 'value should not be larger than time since start of the test')
        }

        t.end()
      })
      .catch(fail(t))
  })
}

function runPvtInStnTests (loader) {
  testDriver.test(`Checking for PVT in STN payload for ${loader} agent`, supportedCls, function (t, browser, router) {
    const rumPromise = router.expectRum()
    const loadPromise = browser
      .safeGet(router.assetURL('cls-lcp.html', { loader: loader }))
      .waitForFeature('loaded')
      .waitForConditionInBrowser('window.contentAdded === true')

    Promise.all([rumPromise, loadPromise])
      .then(() => {
        // click to stop collecting LCP
        const clickPromise = browser
          .elementById('btn1')
          .click()
          .get(router.assetURL('/'))
        const resourcesPromise = router.expectResources()
        return Promise.all([resourcesPromise, clickPromise])
      })
      .then(([{ request: resourcesResult }]) => {
        const expectedPVTItems = ['fi', 'fid', 'lcp', 'pageHide', 'fcp', 'load', 'unload']
        const stnItems = !!resourcesResult && !!resourcesResult.body ? JSON.parse(resourcesResult.body).res : []
        t.ok(stnItems.length, 'STN items were generated')
        const pvtInStn = stnItems.filter(x => !!expectedPVTItems.filter(y => y === x.n && x.o === 'document').length)
        t.equal(pvtInStn.length, expectedPVTItems.length, 'Expected PVT Items are present in STN payload')
        t.end()
      })
      .catch(fail(t))
  })
}

function runClsTests (loader) {
  testDriver.test(`LCP for ${loader} agent collects cls attribute`, supportedCls, function (t, browser, router) {
    const rumPromise = router.expectRum()
    const loadPromise = browser
      .safeGet(router.assetURL('cls-lcp.html', { loader: loader }))
      .waitForFeature('loaded')
      .waitForConditionInBrowser('window.contentAdded === true')

    Promise.all([rumPromise, loadPromise])
      .then(() => {
        // click to stop collecting LCP
        const clickPromise = browser
          .elementById('btn1')
          .click()
          .get(router.assetURL('/'))
        const timingsPromise = router.expectTimings()
        return Promise.all([timingsPromise, clickPromise])
      })
      .then(([{ request: timingsResult }]) => {
        const { body, query } = timingsResult
        const timings = querypack.decode(body && body.length ? body : query.e)

        const timing = timings.find(t => t.name === 'lcp')
        var cls = timing.attributes.find(a => a.key === 'cls')
        t.ok(cls.value >= 0, 'cls is a non-negative value')
        t.equal(cls.type, 'doubleAttribute', 'largestContentfulPaint attribute cls is doubleAttribute')
        t.end()
      })
      .catch(fail(t))
  })

  testDriver.test(`windowUnload for ${loader} agent collects cls attribute`, supportedCls, function (t, browser, router) {
    t.plan(2)

    const rumPromise = router.expectRum()
    const loadPromise = browser
      .safeGet(router.assetURL('cls-basic.html', { loader: loader }))
      .waitForFeature('loaded')
      .waitForConditionInBrowser('window.contentAdded === true')

    Promise.all([rumPromise, loadPromise])
      .then(() => {
        let timingsPromise = router.expectTimings()
        let domPromise = browser.get(router.assetURL('/'))
        return Promise.all([timingsPromise, domPromise])
      })
      .then(([{ request: timingsResult }]) => {
        const { body, query } = timingsResult
        const timings = querypack.decode(body && body.length ? body : query.e)

        const timing = timings.find(t => t.name === 'unload')
        var cls = timing.attributes.find(a => a.key === 'cls')
        t.ok(cls.value >= 0, 'cls is a non-negative value')
        t.equal(cls.type, 'doubleAttribute', 'largestContentfulPaint attribute cls is doubleAttribute')

        t.end()
      })
      .catch(fail(t))
  })

  testDriver.test(`${loader} agent collects cls attribute when cls is 0`, supportedCls, function (t, browser, router) {
    t.plan(2)

    // load page without any expected layout shifts
    let url = router.assetURL('instrumented.html', { loader: loader })
    let loadPromise = browser.safeGet(url).waitForFeature('loaded')

    Promise.all([loadPromise, router.expectRum()])
      .then(() => {
        let timingsPromise = router.expectTimings()
        let domPromise = browser.get(router.assetURL('/'))
        return Promise.all([timingsPromise, domPromise]).then(([data, clicked]) => {
          return data
        })
      })
      .then(({ request: { body, query } }) => {
        const timings = querypack.decode(body && body.length ? body : query.e)

        var unload = timings.find(t => t.name === 'unload')
        var cls = unload.attributes.find(a => a.key === 'cls')

        t.ok(unload, 'there should be an unload timing')
        t.equal(cls.value, 0, 'cls value should be a perfect score of 0')

        t.end()
      })
      .catch(fail(t))
  })

  testDriver.test(`First interaction ${loader} agent collects cls attribute`, supportedCls, function (t, browser, router) {
    t.plan(2)

    const rumPromise = router.expectRum()
    const loadPromise = browser.safeGet(router.assetURL('cls-interaction.html', { loader: loader })).waitForFeature('loaded')

    Promise.all([rumPromise, loadPromise])
      .then(request => {
        const domPromise = browser.elementById('btn1').click()
          .get(router.assetURL('/'))
        const timingsPromise = router.expectTimings()
        return Promise.all([timingsPromise, domPromise])
      })
      .then(([{ request: timingsResult }]) => {
        const { body, query } = timingsResult
        const timings = querypack.decode(body && body.length ? body : query.e)

        let timing = timings.find(t => t.name === 'fi')
        var cls = timing.attributes.find(a => a.key === 'cls')
        t.ok(cls.value >= 0, 'cls is a non-negative value')
        t.equal(cls.type, 'doubleAttribute', 'largestContentfulPaint attribute cls is doubleAttribute')

        t.end()
      })
      .catch(fail(t))
  })

  testDriver.test(`window load for ${loader} agent collects cls attribute`, supportedCls, function (t, browser, router) {
    t.plan(2)

    const rumPromise = router.expectRum()
    const loadPromise = browser
      .safeGet(router.assetURL('cls-load.html', { loader: loader }))
      .waitForFeature('loaded')
      .waitForConditionInBrowser('window.contentAdded === true')

    Promise.all([rumPromise, loadPromise])
      .then(() => {
        let timingsPromise = router.expectTimings()
        let domPromise = browser.get(router.assetURL('/'))
        return Promise.all([timingsPromise, domPromise])
      })
      .then(([{ request: timingsResult }]) => {
        const { body, query } = timingsResult
        const timings = querypack.decode(body && body.length ? body : query.e)

        const timing = timings.find(t => t.name === 'load')
        const cls = timing.attributes.find(a => a.key === 'cls')
        t.ok(cls.value >= 0, 'cls is a non-negative value')
        t.equal(cls.type, 'doubleAttribute', 'cls is doubleAttribute')

        t.end()
      })
      .catch(fail(t))
  })

  testDriver.test(`pageHide event for ${loader} agent collects cls attribute`, supportedCls, function (t, browser, router) {
    t.plan(2)

    const rumPromise = router.expectRum()
    const loadPromise = browser.safeGet(router.assetURL('cls-pagehide.html', { loader: loader })).waitForFeature('loaded')

    Promise.all([rumPromise, loadPromise])
      .then(request => {
        const domPromise = browser
          .elementById('btn1')
          .click()
          .waitForConditionInBrowser('window.contentAdded === true', 10000)
          .get(router.assetURL('/'))

        const timingsPromise = router.expectTimings()
        return Promise.all([timingsPromise, domPromise])
      })
      .then(([{ request: timingsResult }]) => {
        const { body, query } = timingsResult
        const timings = querypack.decode(body && body.length ? body : query.e)

        let timing = timings.find(t => t.name === 'pageHide')
        var cls = timing.attributes.find(a => a.key === 'cls')
        t.ok(cls.value >= 0, 'cls is a non-negative value')
        t.equal(cls.type, 'doubleAttribute', 'cls is doubleAttribute')

        t.end()
      })
      .catch(fail(t))
  })

  testDriver.test('cls only accumulates biggest session (short CLS session followed by long)', supportedCls, function (t, browser, router) {
    const rumPromise = router.expectRum()
    const loadPromise = browser
      .safeGet(router.assetURL('cls-multiple-small-then-big.html', { loader: loader }))
      .waitForFeature('loaded')
      .waitForConditionInBrowser('window.contentAdded === true', 10000)
      .eval('window.allCls')

    Promise.all([rumPromise, loadPromise])
      .then(() => {
        let timingsPromise = router.expectTimings()
        let domPromise = browser.get(router.assetURL('/'))
        return Promise.all([timingsPromise, domPromise, loadPromise])
      })
      .then(([{ request: timingsResult }, domResult, loadResult]) => {
        const { body, query } = timingsResult
        const timings = querypack.decode(body && body.length ? body : query.e)

        const timing = timings.find(t => t.name === 'unload')
        const cls = timing.attributes.find(a => a.key === 'cls')
        t.ok(cls.value >= 0, 'cls is a non-negative value')
        t.ok(cls.value === Math.max(...loadResult), 'CLS is set to the largest CLS session')
        t.equal(cls.type, 'doubleAttribute', 'cls is doubleAttribute')

        t.end()
      })
      .catch(fail(t))
  })

  testDriver.test('cls only accumulates biggest session (long CLS session followed by short)', supportedCls, function (t, browser, router) {
    const rumPromise = router.expectRum()
    const loadPromise = browser
      .safeGet(router.assetURL('cls-multiple-big-then-small.html', { loader: loader }))
      .waitForFeature('loaded')
      .waitForConditionInBrowser('window.contentAdded === true', 10000)
      .eval('window.allCls')

    Promise.all([rumPromise, loadPromise])
      .then(() => {
        let timingsPromise = router.expectTimings()
        let domPromise = browser.get(router.assetURL('/'))
        return Promise.all([timingsPromise, domPromise, loadPromise])
      })
      .then(([{ request: timingsResult }, domResult, loadResult]) => {
        const { body, query } = timingsResult
        const timings = querypack.decode(body && body.length ? body : query.e)

        const load = timings.find(t => t.name === 'load')
        const loadCls = load.attributes.find(a => a.key === 'cls')
        t.ok(loadCls.value === 0, 'initial CLS is 0')
        t.equal(loadCls.type, 'doubleAttribute', 'cls is doubleAttribute')

        const unload = timings.find(t => t.name === 'unload')
        const unloadCls = unload.attributes.find(a => a.key === 'cls')
        t.ok(unloadCls.value >= 0, 'cls is a non-negative value')
        t.ok(unloadCls.value === Math.max(...loadResult), 'CLS is set to the largest CLS session')
        t.equal(unloadCls.type, 'doubleAttribute', 'cls is doubleAttribute')

        t.end()
      })
      .catch(fail(t))
  })
}

function runCustomAttributeTests (loader) {
  testDriver.test(`window load timing for ${loader} agent includes custom attributes`, function (t, browser, router) {
    t.plan(5)

    let url = router.assetURL('instrumented.html', {
      loader: loader,
      scriptString: `newrelic.setCustomAttribute('test', 'testValue')
      // default attributes reserved for PageViewTiming, should be dropped
      newrelic.setCustomAttribute('size', 'invalid')
      newrelic.setCustomAttribute('eid', 'invalid')
      newrelic.setCustomAttribute('cls', 'invalid')
      newrelic.setCustomAttribute('type', 'invalid')
      newrelic.setCustomAttribute('fid', 'invalid')
      newrelic.setCustomAttribute('elTag', 'invalid')
      newrelic.setCustomAttribute('elUrl', 'invalid')
      newrelic.setCustomAttribute('net-type', 'invalid')
      newrelic.setCustomAttribute('net-etype', 'invalid')
      newrelic.setCustomAttribute('net-rtt', 'invalid')
      newrelic.setCustomAttribute('net-dlink', 'invalid')`
    })
    let loadPromise = browser.safeGet(url).waitForFeature('loaded')
    var reservedTimingAttributes = ['size', 'eid', 'cls', 'type', 'fid', 'elUrl', 'elTag',
      'net-type', 'net-etype', 'net-rtt', 'net-dlink']

    Promise.all([loadPromise, router.expectRum()])
      .then(() => {
        let timingsPromise = router.expectTimings()
        let domPromise = browser.get(router.assetURL('/'))
        return Promise.all([timingsPromise, domPromise]).then(([data, clicked]) => {
          return data
        })
      })
      .then(({ request: { body, query } }) => {
        const timings = querypack.decode(body && body.length ? body : query.e)
        t.ok(timings.length > 0, 'there should be at least one timing metric')

        const timing = timings.find(t => t.name === 'load')
        t.ok(timing, 'there should be load timing')

        // attributes are invalid if they have the 'invalid' value set via setCustomAttribute
        const containsReservedAttributes = timing.attributes.some(a => reservedTimingAttributes.includes(a.key) && a.value === 'invalid')
        t.notok(containsReservedAttributes, 'PageViewTiming custom attributes should not contain default attribute keys')

        const expectedAttribute = timing.attributes.find(a => a.key === 'test')
        t.ok(expectedAttribute, 'PageViewTiming event should have a custom attribute')
        t.ok(expectedAttribute.value === 'testValue', 'custom PageViewTiming attribute has the expected value')

        t.end()
      })
      .catch(fail(t))
  })
}

function runLcpTests (loader) {
  testDriver.test(`${loader} loader: LCP is not collected after pageHide`, supportedLcp, function (t, browser, router) {
    // HTML page manually sets maxLCPTimeSeconds to 5
    const assetURL = router.assetURL('lcp-pagehide.html', {
      loader: loader,
      init: {
        page_view_timing: {
          enabled: true,
          harvestTimeSeconds: 15,
          maxLCPTimeSeconds: 2
        }
      }
    })

    const rumPromise = router.expectRum()
    const loadPromise = browser.safeGet(assetURL).waitForFeature('loaded')
    const timingsPromise = router.expectTimings()

    Promise.all([timingsPromise, rumPromise, loadPromise])
      .then(([{ request: timingsResult }]) => {
        const { body, query } = timingsResult
        const timings = querypack.decode(body && body.length ? body : query.e)

        const timing = timings.find(t => t.name === 'lcp')
        t.ok(timing, 'found an LCP timing')
        t.ok(timing.attributes, 'LCP has attributes')
        const elementId = timing.attributes.find(a => a.key === 'eid')

        t.equals(elementId.value, 'initial-content', 'LCP captured the pre-pageHide attribute')

        t.end()
      })
      .catch(fail(t))
  })
  testDriver.test(`${loader} loader: LCP is not collected on hidden page`, supportedLcp, function (t, browser, router) {
    // HTML page manually sets maxLCPTimeSeconds to 5
    const assetURL = router.assetURL('pagehide-beforeload.html', {
      loader: loader,
      init: {
        page_view_timing: {
          enabled: true,
          harvestTimeSeconds: 15,
          maxLCPTimeSeconds: 2
        }
      }
    })

    const rumPromise = router.expectRum()
    const loadPromise = browser.safeGet(assetURL).waitForFeature('loaded')

    Promise.all([rumPromise, loadPromise])
      .then(() => {
        return router.expectTimings()
      })
      .then(({ request: timingsResult }) => {
        const { body, query } = timingsResult
        const timings = querypack.decode(body && body.length ? body : query.e)

        const timing = timings.find(t => t.name === 'lcp')
        t.notOk(timing, 'did NOT find an LCP timing')

        t.end()
      })
      .catch(fail(t))
  })
}

function runLongTasksTest (loader) {
  testDriver.test(`${loader}: emits long task timings when observed`, supportsLT, function (t, browser, router) {
    const rumPromise = router.expectRum()
    const loadPromise = browser.safeGet(router.assetURL('long-tasks.html', { loader: loader, init: { page_view_timing: { long_task: true } } }))
      .waitForConditionInBrowser('window.tasksDone === true')

    Promise.all([rumPromise, loadPromise])
      .then(() => {
        let timingsPromise = router.expectTimings()
        let domPromise = browser.get(router.assetURL('/'))
        return Promise.all([timingsPromise, domPromise])
      })
      .then(([{ request: timingsResult }]) => {
        const { body, query } = timingsResult
        const timings = querypack.decode(body && body.length ? body : query.e)

        const ltEvents = timings.filter(t => t.name === 'lt')
        t.ok(ltEvents.length == 2, 'expected number of long tasks (2) observed')

        ltEvents.forEach((lt) => {
          t.ok(lt.value >= 59, 'task duration is roughly as expected') // defined in some-long-task.js -- duration should be at least that value +/- 1ms
          // Attributes array should start with: [ltFrame, ltStart, ltCtr, (ltCtrSrc, ltCtrId, ltCtrName, )...]
          t.ok(lt.attributes.length >= 3, 'performancelongtasktiming properties are attached')
          t.equal(lt.attributes[1].type, 'doubleAttribute', 'entry startTime is a doubleAttribute')
          if (lt.attributes[2].value !== 'window')
          { t.equal(lt.attributes.length >= 6, 'longtask attribution properties are attached') }
        })

        t.end()
      })
      .catch(fail(t))
  })
}
