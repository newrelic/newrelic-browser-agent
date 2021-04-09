import testDriver from '../../tools/jil/index.es6'
import querypack from '@newrelic/nr-querypack'

const supportedFirstPaint = testDriver.Matcher.withFeature('firstPaint')
const supportedFirstContentfulPaint = testDriver.Matcher.withFeature('firstContentfulPaint')
const supportedLcp = testDriver.Matcher.withFeature('largestContentfulPaint')
const supportedCls = testDriver.Matcher.withFeature('cumulativeLayoutShift')
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

testDriver.test('Disabled timings feature', reliableFinalHarvest, function (t, browser, router) {
  let url = router.assetURL('final-harvest-page-view-timings-disabled.html', { loader: 'rum' })
  let loadPromise = browser.safeGet(url).catch(fail)
  let rumPromise = router.expectRum()

  Promise.all([rumPromise, loadPromise])
  .then(() => {
    t.equal(router.seenRequests.events, 0, 'no events harvest yet')

    let domPromise = browser
      .setAsyncScriptTimeout(10000) // the default is too low for IE
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
          t.equal(timing.attributes.length, 2, 'should have two attributes')
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
    t.plan(7)
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
        t.equal(timing.attributes.length, 2, 'largestContentfulPaint has two attributes')

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
          .waitForConditionInBrowser('window.contentAdded === true')
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
}

function runCustomAttributeTests(loader) {
  testDriver.test(`window load timing for ${loader} agent includes custom attributes`, reliableFinalHarvest, function (t, browser, router) {
    t.plan(5)

    let url = router.assetURL('instrumented-with-custom-attributes.html', { loader: loader })
    let loadPromise = browser.safeGet(url).catch(fail)
    var reservedTimingAttributes = {
      'size': true,
      'eid': true,
      'cls': true
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

      const containsReservedAttributes = timing.attributes.some(a => reservedTimingAttributes[a.key])
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
