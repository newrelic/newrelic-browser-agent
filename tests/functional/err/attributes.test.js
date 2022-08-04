/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')
const { getErrorsFromResponse } = require('./assertion-helpers')

let notSafariWithSeleniumBug = testDriver.Matcher.withFeature('notSafariWithSeleniumBug')
let reliableFinalHarvestFeature = testDriver.Matcher.withFeature('reliableFinalHarvest')
  .and(notSafariWithSeleniumBug)
let eventListenerFeature = testDriver.Matcher.withFeature('addEventListener')
let errorStackFeature = testDriver.Matcher.withFeature('errorStack')
let supportedWithSpa = reliableFinalHarvestFeature.and(eventListenerFeature).and(errorStackFeature)

runTests('full', reliableFinalHarvestFeature)
runTests('spa', supportedWithSpa)

const init = {
  metrics: {
    enabled: false
  },
  jserrors: {
    harvestTimeSeconds: 5
  }
}

function runTests(loader, supported) {
  const opts = {
    loader: loader, init: {
      metrics: {
        enabled: false
      }
    }
  }
  testDriver.test(`set multiple custom attributes after page load with multiple JS errors occurring after page load (${loader})`, supported, function (t, browser, router) {
    let url = router.assetURL('js-error-with-custom-attribute.html', opts)

    let loadPromise = browser.get(url)
    let rumPromise = router.expectRum()

    Promise.all([rumPromise, loadPromise])
      .then(() => {
        var errorsPromise = router.expectErrors()
        var domPromise = browser
          .elementById('trigger')
          .click()
          .click()
          .click()
          .get(url)
        return Promise.all([errorsPromise, domPromise])
      })
      .then(([response]) => {
        const errorsFromPayload = getErrorsFromResponse(response, browser)
        t.equal(errorsFromPayload.length, 3, 'exactly three errors')

        t.equal(errorsFromPayload[0].custom.customParamKey, 0, 'first error should have a custom parameter set with the expected value')
        t.equal(errorsFromPayload[1].custom.customParamKey, 1, 'second error should have a custom parameter set with the expected value')
        t.equal(errorsFromPayload[2].custom.customParamKey, 2, 'third error should have a custom parameter set with the expected value')

        t.end()
      })
      .catch(fail)

    function fail(e) {
      t.error(e)
      t.end()
    }
  })

  testDriver.test(`set single custom attribute before page load with single JS error occurring before page load (${loader})`, supported, function (t, browser, router) {
    let url = router.assetURL('js-error-with-error-before-page-load.html', opts)

    let loadPromise = browser.get(url)
    let rumPromise = router.expectRum()

    Promise.all([rumPromise, loadPromise])
      .then(() => {
        var errorsPromise = router.expectErrors()
        var domPromise = browser.get(url) // forces harvest
        return Promise.all([errorsPromise, domPromise])
      })
      .then(([response]) => {
        const errorsFromPayload = getErrorsFromResponse(response, browser)
        t.equal(errorsFromPayload.length, 1, 'exactly one error')

        t.equal(errorsFromPayload[0].custom.customParamKey, 0, 'first error should have a custom parameter set with the expected value')

        t.end()
      })
      .catch(fail)

    function fail(e) {
      t.error(e)
      t.end()
    }
  })

  testDriver.test(`set multiple custom attributes before page load with multiple JS errors occurring after page load (${loader})`, supported, function (t, browser, router) {
    let url = router.assetURL('js-error-with-error-after-page-load.html', opts)

    let loadPromise = browser.get(url)
    let rumPromise = router.expectRum()

    Promise.all([rumPromise, loadPromise])
      .then(() => {
        var errorsPromise = router.expectErrors()
        var domPromise = browser
          .elementByCssSelector('body')
          .elementById('trigger')
          .click()
          .click()
          .click()
          .get(url) // forces harvest
        return Promise.all([errorsPromise, domPromise])
      })
      .then(([response]) => {
        const errorsFromPayload = getErrorsFromResponse(response, browser)
        t.equal(errorsFromPayload.length, 1, 'exactly one error')
        t.equal(errorsFromPayload[0].custom.customParamKey, 2, 'first error should have a custom parameter set with the expected value')
        t.equal(errorsFromPayload[0].metrics.count, 3, 'first error has a count of 3')

        t.end()
      })
      .catch(fail)

    function fail(e) {
      t.error(e)
      t.end()
    }
  })

  testDriver.test(`noticeError accepts custom attributes in an argument (${loader})`, supported, function (t, browser, router) {
    let url = router.assetURL('js-error-noticeerror-with-custom-attributes.html', opts)

    let loadPromise = browser.get(url)
    let rumPromise = router.expectRum()

    Promise.all([rumPromise, loadPromise])
      .then(() => {
        var errorsPromise = router.expectErrors()
        var domPromise = browser.get(url) // forces harvest
        return Promise.all([errorsPromise, domPromise])
      })
      .then(([response]) => {
        const errorsFromPayload = getErrorsFromResponse(response, browser)
        t.equal(errorsFromPayload.length, 1, 'exactly one error')

        t.equal(errorsFromPayload[0].custom.custom1, 'val1', 'should have first custom attribute')
        t.equal(errorsFromPayload[0].custom.custom2, 'val2', 'should have second custom attribute')

        t.end()
      })
      .catch(fail)

    function fail(e) {
      t.error(e)
      t.end()
    }
  })
}

testDriver.test('initial load interaction: simple case - single error', supportedWithSpa, function (t, browser, router) {
  let url = router.assetURL('js-error-set-attribute-before-load.html', { init, loader: 'spa' })

  let loadPromise = browser.get(url)
  let rumPromise = router.expectRum()

  Promise.all([rumPromise, loadPromise])
    .then(() => {
      var errorsPromise = router.expectErrors()
      var domPromise = browser.get(url) // forces harvest
      return Promise.all([errorsPromise, domPromise])
    })
    .then(([response]) => {
      const errorsFromPayload = getErrorsFromResponse(response, browser)
      t.equal(errorsFromPayload.length, 1, 'exactly one error')

      t.equal(errorsFromPayload[0].custom.customParamKey, 1, 'first error should have a custom parameter set with the expected value')

      t.end()
    })
    .catch(fail)

  function fail(e) {
    t.error(e)
    t.end()
  }
})

testDriver.test('initial load interaction: muliple errors - different attribute values', supportedWithSpa, function (t, browser, router) {
  let url = router.assetURL('js-error-multiple-set-attribute-before-load.html', { init, loader: 'spa' })

  let loadPromise = browser.get(url)
  let rumPromise = router.expectRum()

  Promise.all([rumPromise, loadPromise])
    .then(() => {
      var errorsPromise = router.expectErrors()
      var domPromise = browser.get(url) // forces harvest
      return Promise.all([errorsPromise, domPromise])
    })
    .then(([response]) => {
      const errorsFromPayload = getErrorsFromResponse(response, browser)
      t.equal(errorsFromPayload.length, 3, 'exactly three errors')

      t.equal(errorsFromPayload[0].custom.customParamKey, 3, 'first error should have a custom parameter set with the expected value')
      t.equal(errorsFromPayload[1].custom.customParamKey, 3, 'second error should have a custom parameter set with the expected value')
      t.equal(errorsFromPayload[2].custom.customParamKey, 3, 'third error should have a custom parameter set with the expected value')

      t.end()
    })
    .catch(fail)

  function fail(e) {
    t.error(e)
    t.end()
  }
})

testDriver.test('click interaction: simple case - single error', supportedWithSpa, function (t, browser, router) {
  let url = router.assetURL('js-error-set-attribute-on-click.html', { init, loader: 'spa' })

  let loadPromise = browser.get(url)
  let rumPromise = router.expectRum()

  Promise.all([rumPromise, loadPromise])
    .then(() => {
      var errorsPromise = router.expectErrors()
      var domPromise = browser
        .elementById('trigger')
        .click()
        .get(url) // forces harvest
      return Promise.all([errorsPromise, domPromise])
    })
    .then(([response]) => {
      const errorsFromPayload = getErrorsFromResponse(response, browser)
      t.equal(errorsFromPayload.length, 1, 'exactly one error')

      t.equal(errorsFromPayload[0].custom.customParamKey, 1, 'first error should have a custom parameter set with the expected value')

      t.end()
    })
    .catch(fail)

  function fail(e) {
    t.error(e)
    t.end()
  }
})

testDriver.test('click interaction: multiple errors - different attribute values', supportedWithSpa, function (t, browser, router) {
  let url = router.assetURL('js-error-multiple-set-attribute-on-click.html', { init, loader: 'spa' })

  let loadPromise = browser.get(url)
  let rumPromise = router.expectRum()

  Promise.all([rumPromise, loadPromise])
    .then(() => {
      var errorsPromise = router.expectErrors()
      var domPromise = browser
        .elementById('trigger')
        .click()
        .get(url) // forces harvest
      return Promise.all([errorsPromise, domPromise])
    })
    .then(([response]) => {
      const errorsFromPayload = getErrorsFromResponse(response, browser)
      t.equal(errorsFromPayload.length, 3, 'exactly three errors')

      t.equal(errorsFromPayload[0].custom.customParamKey, 3, 'first error should have a custom parameter set with the expected value')
      t.equal(errorsFromPayload[1].custom.customParamKey, 3, 'second error should have a custom parameter set with the expected value')
      t.equal(errorsFromPayload[2].custom.customParamKey, 3, 'third error should have a custom parameter set with the expected value')

      t.end()
    })
    .catch(fail)

  function fail(e) {
    t.error(e)
    t.end()
  }
})

testDriver.test('click interaction: attributes captured in discarded interaction are still collected', supportedWithSpa, function (t, browser, router) {
  let url = router.assetURL('js-error-set-attribute-on-discarded.html', { init, loader: 'spa' })

  let loadPromise = browser.get(url)
  let rumPromise = router.expectRum()

  Promise.all([rumPromise, loadPromise])
    .then(() => {
      var errorsPromise = router.expectErrors()
      var domPromise = browser
        .elementById('trigger')
        .click()
        .get(url) // forces harvest
      return Promise.all([errorsPromise, domPromise])
    })
    .then(([response]) => {
      const errorsFromPayload = getErrorsFromResponse(response, browser)
      t.equal(errorsFromPayload.length, 1, 'exactly one error')

      t.equal(errorsFromPayload[0].custom.customParamKey, 1, 'first error should have a custom parameter set with the expected value')

      t.end()
    })
    .catch(fail)

  function fail(e) {
    t.error(e)
    t.end()
  }
})

testDriver.test('global and interaction attributes on same error', supportedWithSpa, function (t, browser, router) {
  let url = router.assetURL('js-error-global-and-interaction-attributes-on-same-error.html', { init, loader: 'spa' })

  let loadPromise = browser.get(url)
  let rumPromise = router.expectRum()

  Promise.all([rumPromise, loadPromise])
    .then(() => {
      var errorsPromise = router.expectErrors()
      var domPromise = browser.get(url) // forces harvest
      return Promise.all([errorsPromise, domPromise])
    })
    .then(([response]) => {
      const errorsFromPayload = getErrorsFromResponse(response, browser)
      t.equal(errorsFromPayload.length, 1, 'exactly one error')

      t.equal(errorsFromPayload[0].custom.globalKey, 1, 'first error should have a custom attribute set with the expected value')
      t.equal(errorsFromPayload[0].custom.localKey, 2, 'first error should have an interaction attribute set with the expected value')

      t.end()
    })
    .catch(fail)

  function fail(e) {
    t.error(e)
    t.end()
  }
})

testDriver.test('setAttribute takes precedence over setCustomAttribute', supportedWithSpa, function (t, browser, router) {
  let url = router.assetURL('js-error-attribute-precedence.html', { init, loader: 'spa' })

  let loadPromise = browser.get(url)
  let rumPromise = router.expectRum()

  Promise.all([rumPromise, loadPromise])
    .then(() => {
      var errorsPromise = router.expectErrors()
      var domPromise = browser.get(url) // forces harvest
      return Promise.all([errorsPromise, domPromise])
    })
    .then(([response]) => {
      const errorsFromPayload = getErrorsFromResponse(response, browser)
      t.equal(errorsFromPayload.length, 1, 'exactly one error')

      t.equal(errorsFromPayload[0].custom.localKey, 2, 'first error should have value from setAttribute')

      t.end()
    })
    .catch(fail)

  function fail(e) {
    t.error(e)
    t.end()
  }
})

testDriver.test('noticeError takes precedence over setAttribute', supportedWithSpa, function (t, browser, router) {
  let url = router.assetURL('js-error-noticeerror-precedence.html', { init, loader: 'spa' })

  let loadPromise = browser.get(url)
  let rumPromise = router.expectRum()

  Promise.all([rumPromise, loadPromise])
    .then(() => {
      var errorsPromise = router.expectErrors()
      var domPromise = browser.get(url) // forces harvest
      return Promise.all([errorsPromise, domPromise])
    })
    .then(([response]) => {
      const errorsFromPayload = getErrorsFromResponse(response, browser)
      t.equal(errorsFromPayload.length, 1, 'exactly one error')

      t.equal(errorsFromPayload[0].custom.custom1, 'val2', 'error should have value from noticeError')

      t.end()
    })
    .catch(fail)

  function fail (e) {
    t.error(e)
    t.end()
  }
})

testDriver.test('noticeError takes precedence over setAttribute in discarded interactions', supportedWithSpa, function (t, browser, router) {
  let url = router.assetURL('js-error-noticeerror-precedence-discarded.html', { init, loader: 'spa' })

  let loadPromise = browser.get(url)
  let rumPromise = router.expectRum()

  Promise.all([rumPromise, loadPromise])
    .then(() => {
      var errorsPromise = router.expectErrors()
      var domPromise = browser
        .elementById('trigger')
        .click()
        .get(url) // forces harvest
      return Promise.all([errorsPromise, domPromise])
    })
    .then(([response]) => {
      const errorsFromPayload = getErrorsFromResponse(response, browser)
      t.equal(errorsFromPayload.length, 1, 'exactly one error')

      t.equal(errorsFromPayload[0].custom.custom1, 'val1', 'error should have value val1')

      t.end()
    })
    .catch(fail)

  function fail (e) {
    t.error(e)
    t.end()
  }
})
