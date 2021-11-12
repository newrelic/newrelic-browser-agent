/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../tools/jil/index')
const querypack = require('@newrelic/nr-querypack')

const supportedFirstPaint = testDriver.Matcher.withFeature('firstPaint')
const supportedFirstContentfulPaint = testDriver.Matcher.withFeature('firstContentfulPaint')
const supportedLcp = testDriver.Matcher.withFeature('largestContentfulPaint')
const supportedCls = testDriver.Matcher.withFeature('cumulativeLayoutShift')
const unsupportedCls = testDriver.Matcher.withFeature('unsupportedCumulativeLayoutShift')
const reliableFinalHarvest = testDriver.Matcher.withFeature('reliableFinalHarvest')
const testPageHide = testDriver.Matcher.withFeature('testPageHide')
const badEvtTimestamp = testDriver.Matcher.withFeature('badEvtTimestamp')
const unreliableEvtTimestamp = testDriver.Matcher.withFeature('unreliableEvtTimestamp')
const supportsFirstInteraction = testDriver.Matcher.withFeature('supportsFirstInteraction')

const isClickInteractionType = type => type === 'pointerdown' || type === 'mousedown' || type === 'click'

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

testDriver.test('Disabled timings feature', reliableFinalHarvest, function (t, browser, router) {
  let url = router.assetURL('final-harvest-page-view-timings-disabled.html', { loader: 'rum' })
  let loadPromise = browser.safeGet(url).catch(fail)
  let rumPromise = router.expectRum()

  Promise.all([rumPromise, loadPromise])
    .then(() => {
      t.equal(router.seenRequests.events, 0, 'no events harvest yet')

      let domPromise = browser
        .elementById('standardBtn')
        .click()
        .get(router.assetURL('/'))

      return domPromise
    })
    .then(() => {
      t.equal(router.seenRequests.events, 0, 'no events harvest')
      t.end()
    })
    .catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})

function runPaintTimingsTests(loader) {
  testDriver.test(`First paint for ${loader} agent`, supportedFirstPaint, function (t, browser, router) {
    t.plan(1)

    const rumPromise = router.expectRum()
    const timingsPromise = router.expectTimings()
    const loadPromise = browser.safeGet(router.assetURL('instrumented.html', { loader: 'spa' }))

    Promise.all([timingsPromise, rumPromise, loadPromise])
      .then(([timingsResult]) => {
        const {body, query} = timingsResult
        const timings = querypack.decode(body && body.length ? body : query.e)
        let timing = timings.find(t => t.name === 'fp')
        t.ok(timing.value > 0, 'firstPaint is a positive value')
        t.end()
      })
      .catch(fail)

    function fail (e) {
      t.error(e)
      t.end()
    }
  })

  testDriver.test(`First contentful paint for ${loader} agent`, supportedFirstContentfulPaint, function (t, browser, router) {
    t.plan(1)

    const rumPromise = router.expectRum()
    const timingsPromise = router.expectTimings()
    const loadPromise = browser.safeGet(router.assetURL('instrumented.html', { loader: 'spa' }))

    Promise.all([timingsPromise, rumPromise, loadPromise])
      .then(([timingsResult]) => {
        const {body, query} = timingsResult
        const timings = querypack.decode(body && body.length ? body : query.e)
        let timing = timings.find(t => t.name === 'fcp')
        t.ok(timing.value > 0, 'firstContentfulPaint is a positive value')
        t.end()
      })
      .catch(fail)

    function fail (e) {
      t.error(e)
      t.end()
    }
  })
}

function runFirstInteractionTests(loader) {
  testDriver.test(`First interaction and first input delay for ${loader} agent`, supportsFirstInteraction.and(reliableFinalHarvest), function (t, browser, router) {
    const rumPromise = router.expectRum()
    const loadPromise = browser.safeGet(router.assetURL('basic-click-tracking.html', { loader: loader }))

    const start = Date.now()

    Promise.all([rumPromise, loadPromise])
      .then(request => {
        const domPromise = browser.elementById('free_tacos').click()
          .get(router.assetURL('/'))
        const timingsPromise = router.expectTimings()
        return Promise.all([timingsPromise, domPromise])
      })
      .then(([timingsResult]) => {
        const {body, query} = timingsResult
        const timings = querypack.decode(body && body.length ? body : query.e)

        var timing = timings.find(item => item.name === 'fi')
        t.ok(timing.value > 0, 'firstInteraction is a positive value')
        t.ok(timing.value < (Date.now() - start), 'firstInteraction should be a reasonable value')

        var attribute = timing.attributes.find(a => a.key === 'type')
        t.ok(isClickInteractionType(attribute.value), 'firstInteraction event type is a mouse event')
        t.equal(attribute.type, 'stringAttribute', 'firstInteraction attribute type is stringAttribute')

        if (badEvtTimestamp.match(browser)) {
          t.equal(timing.attributes.length, 1, 'should have one attribute')
        } else if (unreliableEvtTimestamp.match(browser)) {
          attribute = timing.attributes.find(a => a.key === 'fid')
          if (attribute) {
            t.ok(timing.value > 0, 'firstInputDelay is a non-negative value')
            t.equal(attribute.type, 'doubleAttribute', 'firstInputDelay attribute type is doubleAttribute')
          }
        } else {
          attribute = timing.attributes.find(a => a.key === 'fid')
          t.ok(timing.value > 0, 'firstInputDelay is a non-negative value')
          t.equal(attribute.type, 'doubleAttribute', 'firstInputDelay attribute type is doubleAttribute')
        }

        t.end()
      })
      .catch(fail)

    function fail (e) {
      t.error(e)
      t.end()
    }
  })
}

function runLargestContentfulPaintFromInteractionTests(loader) {
  testDriver.test(`Largest Contentful Paint from first interaction event for ${loader} agent`, supportedLcp, function (t, browser, router) {
    t.plan(9)
    const rumPromise = router.expectRum()
    const loadPromise = browser.safeGet(router.assetURL('basic-click-tracking.html', { loader: loader }))

    Promise.all([rumPromise, loadPromise])
      .then(() => {
        const domPromise = browser.elementById('free_tacos').click()
          .get(router.assetURL('/'))
        const timingsPromise = router.expectTimings()
        return Promise.all([timingsPromise, domPromise])
      })
      .then(([timingsResult]) => {
        const {body, query} = timingsResult
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

        var tagName = timing.attributes.find(a => a.key === 'tag')
        t.equal(tagName.value, 'BUTTON', 'element.tagName is present and correct')
        t.equal(size.type, 'doubleAttribute', 'largestContentfulPaint attribute elementTagName is stringAttribute')

        t.equal(timing.attributes.length, 7, 'largestContentfulPaint has seven attributes')

        t.end()
      })
      .catch(fail)

    function fail (e) {
      t.error(e)
      t.end()
    }
  })
}

function runWindowLoadTests(loader) {
  testDriver.test(`window load timing for ${loader} agent`, reliableFinalHarvest, function (t, browser, router) {
    t.plan(4)

    let start = Date.now()
    let url = router.assetURL('instrumented.html', { loader: loader })
    let loadPromise = browser.safeGet(url).catch(fail)

    Promise.all([loadPromise, router.expectRum()])
      .then(() => {
        let timingsPromise = router.expectTimings()
        let domPromise = browser.get(router.assetURL('/'))
        return Promise.all([timingsPromise, domPromise]).then(([data, clicked]) => {
          return data
        })
      })
      .then(({body, query}) => {
        let duration = Date.now() - start

        const timings = querypack.decode(body && body.length ? body : query.e)
        t.ok(timings.length > 0, 'there should be at least one timing metric')

        var timing = timings.find(t => t.name === 'load')
        t.ok(timings, 'there should be load timing')
        t.ok(timing.value > 0, 'value should be a positive number')
        t.ok(timing.value <= duration, 'value should not be larger than time to unload')

        t.end()
      })
      .catch(fail)

    function fail (err) {
      t.error(err)
      t.end()
    }
  })
}

function runWindowUnloadTests(loader) {
  testDriver.test(`unload timing for ${loader} agent`, reliableFinalHarvest, function (t, browser, router) {
    t.plan(4)

    let start = Date.now()
    let url = router.assetURL('instrumented.html', { loader: loader })
    let loadPromise = browser.safeGet(url).catch(fail)

    Promise.all([loadPromise, router.expectRum()])
      .then(() => {
        let timingsPromise = router.expectTimings()
        let domPromise = browser.get(router.assetURL('/'))
        return Promise.all([timingsPromise, domPromise]).then(([data, clicked]) => {
          return data
        })
      })
      .then(({body, query}) => {
        let duration = Date.now() - start

        const timings = querypack.decode(body && body.length ? body : query.e)
        t.ok(timings.length > 0, 'there should be at least one timing metric')

        var timing = timings.find(t => t.name === 'unload')
        t.ok(timings, 'there should be unload timing')
        t.ok(timing.value > 0, 'value should be a positive number')
        t.ok(timing.value <= duration, 'value should not be larger than time to unload')

        t.end()
      })
      .catch(fail)

    function fail (err) {
      t.error(err)
      t.end()
    }
  })
}

function runPageHideTests(loader) {
  testDriver.test(`page hide timing for ${loader} agent`, testPageHide, function (t, browser, router) {
    t.plan(4)

    let start = Date.now()
    let url = router.assetURL('pagehide.html', { loader: loader })
    let loadPromise = browser.safeGet(url).catch(fail)

    Promise.all([loadPromise, router.expectRum()])
      .then(() => {
        const clickPromise = browser
          .elementById('btn1').click()
          .get(router.assetURL('/'))
        const timingsPromise = router.expectTimings()
        return Promise.all([timingsPromise, clickPromise])
      })
      .then(([timingsResult]) => {
        const {body, query} = timingsResult
        const timings = querypack.decode(body && body.length ? body : query.e)
        let duration = Date.now() - start

        t.ok(timings.length > 0, 'there should be at least one timing metric')

        var timing = timings.find(t => t.name === 'pageHide')
        t.ok(timings, 'there should be pageHide timing')
        t.ok(timing.value > 0, 'value should be a positive number')
        t.ok(timing.value <= duration, 'value should not be larger than time since start of the test')

        t.end()
      })
      .catch(fail)

    function fail (err) {
      t.error(err)
      t.end()
    }
  })
}

function runClsTests(loader) {
  testDriver.test(`LCP for ${loader} agent collects cls attribute`, supportedCls, function (t, browser, router) {
    t.plan(2)

    const rumPromise = router.expectRum()
    const loadPromise = browser
      .safeGet(router.assetURL('cls-lcp.html', { loader: loader }))
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
      .then(([timingsResult]) => {
        const {body, query} = timingsResult
        const timings = querypack.decode(body && body.length ? body : query.e)

        const timing = timings.find(t => t.name === 'lcp')
        var cls = timing.attributes.find(a => a.key === 'cls')
        t.ok(cls.value >= 0, 'cls is a non-negative value')
        t.equal(cls.type, 'doubleAttribute', 'largestContentfulPaint attribute cls is doubleAttribute')

        t.end()
      })
      .catch(fail)

    function fail (e) {
      t.error(e)
      t.end()
    }
  })

  testDriver.test(`windowUnload for ${loader} agent collects cls attribute`, supportedCls, function (t, browser, router) {
    t.plan(2)

    const rumPromise = router.expectRum()
    const loadPromise = browser
      .safeGet(router.assetURL('cls-basic.html', { loader: loader }))
      .waitForConditionInBrowser('window.contentAdded === true')

    Promise.all([rumPromise, loadPromise])
      .then(() => {
        let timingsPromise = router.expectTimings()
        let domPromise = browser.get(router.assetURL('/'))
        return Promise.all([timingsPromise, domPromise])
      })
      .then(([timingsResult]) => {
        const {body, query} = timingsResult
        const timings = querypack.decode(body && body.length ? body : query.e)

        const timing = timings.find(t => t.name === 'unload')
        var cls = timing.attributes.find(a => a.key === 'cls')
        t.ok(cls.value >= 0, 'cls is a non-negative value')
        t.equal(cls.type, 'doubleAttribute', 'largestContentfulPaint attribute cls is doubleAttribute')

        t.end()
      })
      .catch(fail)

    function fail (e) {
      t.error(e)
      t.end()
    }
  })

  testDriver.test(`${loader} agent collects cls attribute when cls is 0`, supportedCls, function (t, browser, router) {
    t.plan(2)

    // load page without any expected layout shifts
    let url = router.assetURL('instrumented.html', { loader: loader })
    let loadPromise = browser.safeGet(url).catch(fail)

    Promise.all([loadPromise, router.expectRum()])
      .then(() => {
        let timingsPromise = router.expectTimings()
        let domPromise = browser.get(router.assetURL('/'))
        return Promise.all([timingsPromise, domPromise]).then(([data, clicked]) => {
          return data
        })
      })
      .then(({body, query}) => {
        const timings = querypack.decode(body && body.length ? body : query.e)

        var unload = timings.find(t => t.name === 'unload')
        var cls = unload.attributes.find(a => a.key === 'cls')

        t.ok(unload, 'there should be an unload timing')
        t.equal(cls.value, 0, 'cls value should be a perfect score of 0')

        t.end()
      })
      .catch(fail)

    function fail (err) {
      t.error(err)
      t.end()
    }
  })

  testDriver.test(`${loader} agent does not collect cls attribute on unsupported browser`, unsupportedCls.and(reliableFinalHarvest), function (t, browser, router) {
    t.plan(2)

    const rumPromise = router.expectRum()
    const loadPromise = browser
      // in older browsers, the default timeout appeared to be 0 causing tests to fail instantly
      .setAsyncScriptTimeout(10000)
      .safeGet(router.assetURL('cls-basic.html', { loader: loader }))
      .waitForConditionInBrowser('window.contentAdded === true')

    Promise.all([rumPromise, loadPromise])
      .then(() => {
        let timingsPromise = router.expectTimings()
        let domPromise = browser.get(router.assetURL('/'))
        return Promise.all([timingsPromise, domPromise])
      })
      .then(([timingsResult]) => {
        const {body, query} = timingsResult
        const timings = querypack.decode(body && body.length ? body : query.e)

        const unload = timings.find(t => t.name === 'unload')
        var cls = unload.attributes.find(a => a.key === 'cls')

        t.ok(unload, 'there should be an unload timing')
        t.notok(cls, 'cls should not be recorded on unsupported browser')

        t.end()
      })
      .catch(fail)

    function fail (e) {
      t.error(e)
      t.end()
    }
  })

  testDriver.test(`First interaction ${loader} agent collects cls attribute`, supportedCls, function (t, browser, router) {
    t.plan(2)

    const rumPromise = router.expectRum()
    const loadPromise = browser.safeGet(router.assetURL('cls-interaction.html', { loader: loader }))

    Promise.all([rumPromise, loadPromise])
      .then(request => {
        const domPromise = browser.elementById('btn1').click()
          .get(router.assetURL('/'))
        const timingsPromise = router.expectTimings()
        return Promise.all([timingsPromise, domPromise])
      })
      .then(([timingsResult]) => {
        const {body, query} = timingsResult
        const timings = querypack.decode(body && body.length ? body : query.e)

        let timing = timings.find(t => t.name === 'fi')
        var cls = timing.attributes.find(a => a.key === 'cls')
        t.ok(cls.value >= 0, 'cls is a non-negative value')
        t.equal(cls.type, 'doubleAttribute', 'largestContentfulPaint attribute cls is doubleAttribute')

        t.end()
      })
      .catch(fail)

    function fail (e) {
      t.error(e)
      t.end()
    }
  })

  testDriver.test(`window load for ${loader} agent collects cls attribute`, supportedCls, function (t, browser, router) {
    t.plan(2)

    const rumPromise = router.expectRum()
    const loadPromise = browser
      .safeGet(router.assetURL('cls-load.html', { loader: loader }))
      .waitForConditionInBrowser('window.contentAdded === true')

    Promise.all([rumPromise, loadPromise])
      .then(() => {
        let timingsPromise = router.expectTimings()
        let domPromise = browser.get(router.assetURL('/'))
        return Promise.all([timingsPromise, domPromise])
      })
      .then(([timingsResult]) => {
        const {body, query} = timingsResult
        const timings = querypack.decode(body && body.length ? body : query.e)

        const timing = timings.find(t => t.name === 'load')
        const cls = timing.attributes.find(a => a.key === 'cls')
        t.ok(cls.value >= 0, 'cls is a non-negative value')
        t.equal(cls.type, 'doubleAttribute', 'cls is doubleAttribute')

        t.end()
      })
      .catch(fail)

    function fail (e) {
      t.error(e)
      t.end()
    }
  })

  testDriver.test(`pageHide event for ${loader} agent collects cls attribute`, testPageHide.and(supportedCls), function (t, browser, router) {
    t.plan(2)

    const rumPromise = router.expectRum()
    const loadPromise = browser.safeGet(router.assetURL('cls-pagehide.html', { loader: loader }))

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
      .then(([timingsResult]) => {
        const {body, query} = timingsResult
        const timings = querypack.decode(body && body.length ? body : query.e)

        let timing = timings.find(t => t.name === 'pageHide')
        var cls = timing.attributes.find(a => a.key === 'cls')
        t.ok(cls.value >= 0, 'cls is a non-negative value')
        t.equal(cls.type, 'doubleAttribute', 'cls is doubleAttribute')

        t.end()
      })
      .catch(fail)

    function fail (e) {
      t.error(e)
      t.end()
    }
  })

  testDriver.test('cls only accumulates biggest session (short CLS session followed by long)', supportedCls, function (t, browser, router) {
    const rumPromise = router.expectRum()
    const loadPromise = browser
      .safeGet(router.assetURL('cls-multiple-small-then-big.html', { loader: loader }))
      .waitForConditionInBrowser('window.contentAdded === true', 10000)
      .eval('window.allCls')

    Promise.all([rumPromise, loadPromise])
      .then(() => {
        let timingsPromise = router.expectTimings()
        let domPromise = browser.get(router.assetURL('/'))
        return Promise.all([timingsPromise, domPromise, loadPromise])
      })
      .then(([timingsResult, domResult, loadResult]) => {
        const {body, query} = timingsResult
        const timings = querypack.decode(body && body.length ? body : query.e)

        const timing = timings.find(t => t.name === 'unload')
        const cls = timing.attributes.find(a => a.key === 'cls')
        t.ok(cls.value >= 0, 'cls is a non-negative value')
        t.ok(cls.value === Math.max(...loadResult), 'CLS is set to the largest CLS session')
        t.equal(cls.type, 'doubleAttribute', 'cls is doubleAttribute')

        t.end()
      })
      .catch(fail)

    function fail (e) {
      t.error(e)
      t.end()
    }
  })

  testDriver.test('cls only accumulates biggest session (long CLS session followed by short)', supportedCls, function (t, browser, router) {
    const rumPromise = router.expectRum()
    const loadPromise = browser
      .safeGet(router.assetURL('cls-multiple-big-then-small.html', { loader: loader }))
      .waitForConditionInBrowser('window.contentAdded === true', 10000)
      .eval('window.allCls')

    Promise.all([rumPromise, loadPromise])
      .then(() => {
        let timingsPromise = router.expectTimings()
        let domPromise = browser.get(router.assetURL('/'))
        return Promise.all([timingsPromise, domPromise, loadPromise])
      })
      .then(([timingsResult, domResult, loadResult]) => {
        const {body, query} = timingsResult
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
      .catch(fail)

    function fail (e) {
      t.error(e)
      t.end()
    }
  })
}

function runCustomAttributeTests(loader) {
  testDriver.test(`window load timing for ${loader} agent includes custom attributes`, reliableFinalHarvest, function (t, browser, router) {
    t.plan(5)

    let url = router.assetURL('instrumented-with-custom-attributes.html', { loader: loader })
    let loadPromise = browser.safeGet(url).catch(fail)
    var reservedTimingAttributes = {
      'size': true,
      'eid': true,
      'cls': true,
      'type': true,
      'fid': true
    }

    Promise.all([loadPromise, router.expectRum()])
      .then(() => {
        let timingsPromise = router.expectTimings()
        let domPromise = browser.get(router.assetURL('/'))
        return Promise.all([timingsPromise, domPromise]).then(([data, clicked]) => {
          return data
        })
      })
      .then(({body, query}) => {
        const timings = querypack.decode(body && body.length ? body : query.e)
        t.ok(timings.length > 0, 'there should be at least one timing metric')

        const timing = timings.find(t => t.name === 'load')
        t.ok(timings, 'there should be load timing')

        // attributes are invalid if they have the 'invalid' value set via setCustomAttribute
        const containsReservedAttributes = timing.attributes.some(a => reservedTimingAttributes[a.key] && a.value === 'invalid')
        t.notok(containsReservedAttributes, 'PageViewTiming custom attributes should not contain default attribute keys')

        const expectedAttribute = timing.attributes.find(a => a.key === 'test')
        t.ok(expectedAttribute, 'PageViewTiming event should have a custom attribute')
        t.ok(expectedAttribute.value === 'testValue', 'custom PageViewTiming attribute has the expected value')

        t.end()
      })
      .catch(fail)

    function fail (err) {
      t.error(err)
      t.end()
    }
  })
}

function runLcpTests (loader) {
  testDriver.test(`${loader} loader: LCP is not collected after pageHide`, testPageHide.and(supportedLcp), function (t, browser, router) {
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
    const loadPromise = browser.safeGet(assetURL)

    Promise.all([rumPromise, loadPromise])
      .then(() => {
        return router.expectTimings()
      })
      .then((timingsResult) => {
        const {body, query} = timingsResult
        const timings = querypack.decode(body && body.length ? body : query.e)

        const timing = timings.find(t => t.name === 'lcp')
        t.ok(timing, 'found an LCP timing')
        t.ok(timing.attributes, 'LCP has attributes')
        const elementId = timing.attributes.find(a => a.key === 'eid')

        t.equals(elementId.value, 'initial-content', 'LCP captured the pre-pageHide attribute')

        t.end()
      })
      .catch(fail)

    function fail (e) {
      t.error(e)
      t.end()
    }
  })
}
