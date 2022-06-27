/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// Uncaught exception test.
// Name prefixed with zz- to be the last file
// included in the unit test bundle.
import test from '../../../tools/jil/browser-test'
import {addE} from '../../../packages/browser-agent-core/common/event-listener/add-e'
import { ffVersion } from '../../../packages/browser-agent-core/common/browser-version/firefox-version'
import { setup } from '../utils/setup'
// Should be loaded first
import { Instrument as StnInstrument } from '../../../packages/browser-agent-core/features/session-trace/instrument/index'
import { Instrument as JserrorsInstrument } from '../../../packages/browser-agent-core/features/jserrors/instrument/index'
import { Aggregate as JserrorsAggregate } from '../../../packages/browser-agent-core/features/jserrors/aggregate/index'

const {agentIdentifier, aggregator, baseEE} = setup()

const stnInst = new StnInstrument(agentIdentifier)
const jsErrorsInst = new JserrorsInstrument(agentIdentifier)
const jsErrorsAgg = new JserrorsAggregate(agentIdentifier, aggregator)

const ee = baseEE

var raf = window.requestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.msRequestAnimationFrame

var setTimeoutWrapped = !!(setTimeout['nr@wrapper'])
var shouldExpectXHRErrors = setTimeoutWrapped && (XMLHttpRequest && XMLHttpRequest.prototype && XMLHttpRequest.prototype.addEventListener)

// Old versions of FF don't fire readystatechange on the document
var hasReadyStateChange = !(ffVersion && ffVersion <= 3.6)

var throwsRemaining = 0
throwsRemaining += setupWindowLoadError()
throwsRemaining += setupReadyStateChangeError()
throwsRemaining += setupDOMContentLoadedError()
throwsRemaining += setupCustomEventError()
throwsRemaining += setupTimeoutError()
throwsRemaining += setupIntervalError()
throwsRemaining += setupRAFError()
throwsRemaining += setupXHRError()

// This gets overridden in the test below
window.onAllErrorsThrown = function () { }

function decrementRemainingAndCheckDone (label) {
  throwsRemaining--
  if (throwsRemaining === 0) window.onAllErrorsThrown()
}

function setupCustomEventError () {
  if (typeof (document.addEventListener) !== 'function') return 0

  document.addEventListener('foo', callback, false)
  return 1

  function callback () {
    decrementRemainingAndCheckDone('custom')
    throw new Error('custom event')
  }
}

function setupWindowLoadError () {
  addE('load', windowAddE)
  addE('load', windowAddE)
  return 1

  function windowAddE () {
    decrementRemainingAndCheckDone('Window addE')
    throw new Error('Window addE')
  }
}

function setupReadyStateChangeError () {
  if (!hasReadyStateChange) return 0

  var fired = false

  if (typeof (document.addEventListener) === 'function') {
    document.addEventListener('readystatechange', callback, false)
  } else {
    document.attachEvent('onreadystatechange', callback)
  }

  return 1

  function callback () {
    if (fired) return
    fired = true
    decrementRemainingAndCheckDone('readystatechange')
    throw new Error('document readystatechange')
  }
}

function setupDOMContentLoadedError () {
  if (typeof (document.addEventListener) === 'function') {
    document.addEventListener('DOMContentLoaded', callback, false)
  } else {
    document.attachEvent('onDOMContentLoaded', callback)
  }
  return 1

  function callback (e) {
    decrementRemainingAndCheckDone('DOMContentLoaded')
    throw new Error('DOMContentLoaded error')
  }
}

function setupTimeoutError () {
  setTimeout(function () {
    decrementRemainingAndCheckDone('timeout')
    throw new Error('TO error')
  }, 10)
  return 1
}

function setupIntervalError () {
  var val = setInterval(intervalErrorFunc, 10)
  setTimeout(function () {
    clearInterval(val)
  }, 50)
  return 1
}

var sawIntervalError = false
function intervalErrorFunc () {
  if (!sawIntervalError) decrementRemainingAndCheckDone('interval')
  sawIntervalError = true
  throw new Error('Interval Error')
}

function setupRAFError () {
  if (!raf) return 0

  raf(function (a, b) {
    decrementRemainingAndCheckDone('raf')
    throw new Error('raf error')
  })
  return 1
}

function setupXHRError () {
  if (!shouldExpectXHRErrors) return 0

  var xhr = new XMLHttpRequest()
  xhr.addEventListener('load', function () {
    decrementRemainingAndCheckDone('xhr')
    throw new Error('xhr on load event listener')
  }, false)
  xhr.open('DELETE', '/test-xhr-error')
  xhr.send()
  return 1
}

setTimeout('var shouldUseGlobalContext = 1', 0) // eslint-disable-line

ee.emit('feat-err', [])

if (!setTimeoutWrapped) {
  test('error', function (t) {
    t.skip('requires addEventListener')
    t.end()
  })
} else {
  test('error', function (t) {
    var plan = 1
    var eventsWrapped = false

    try {
      throw new Error()
    } catch (e) {
      if ('stack' in e) eventsWrapped = true
    }

    if (eventsWrapped) plan += 12
    if (shouldExpectXHRErrors) plan += 1
    if (raf) plan += 1
    t.plan(plan)

    if (eventsWrapped) {
      var foo = document.createEvent('HTMLEvents')
      foo.initEvent('foo', true, true)
      document.dispatchEvent(foo)
    }

    if (throwsRemaining <= 0) {
      checkForErrors()
    } else {
      window.onAllErrorsThrown = function () {
        setTimeout(checkForErrors, 100)
      }
    }

    function checkForErrors () {
      var err = agg.take(['err']).err
      var errors = {}

      for (var i in err) {
        errors['' + err[i].params.message] = err[i]
      }

      // uncaught error
      t.ok(
        errors['Script error.'] ||
        errors['Uncaught error with no additional information'] ||
        errors['Uncaught exception: Error: Uncaught Thrown'] ||
        errors['Error: Uncaught Thrown'] ||
        errors['Uncaught Thrown'] ||
        errors['[object Event]']
        , 'got an uncaught error')

      if (!eventsWrapped) return

      // event errors
      t.ok(errors['DOMContentLoaded error'], 'DOMContentLoaded error')
      if (hasReadyStateChange) {
        t.ok(errors['document readystatechange'], 'document readystatechange error')
      } else {
        t.skip('readystatechange not available')
      }
      t.ok(errors['Window addE'], 'Window addE error')
      t.equal(errors['Window addE'].metrics.count, 1, 'Only one Window addE error')

      // custom event error
      // Tested because synthetically fired custom events behave differently than
      // native events in ~ff 5-17
      t.ok(errors['custom event'], 'custom event error fired')

      // timer errors
      t.ok(errors['TO error'], 'TO error')
      t.ok(errors['Interval Error'], 'Interval error >= 1')
      t.equal(typeof shouldUseGlobalContext, 'number', 'Variable assigned inside string passed to setTimeout had its context changed')

      // Request Animation Frame error
      if (raf) {
        t.ok(errors['raf error'], 'raf error')
      }

      if (hasReadyStateChange) {
        try {
          t.equal(errors['document readystatechange'].params.pageview, 1, 'document readystatechange error pageview is 1')
        } catch (e) {
          t.fail('document readystatechange error pageview is 1 (' + e + ')')
        }
      } else {
        t.skip('readystatechange not available')
      }

      // Now fire an error again and ensure stack is not reported but browser stack hash is
      setTimeout(intervalErrorFunc, 0)

      setTimeout(function () {
        err = agg.take(['err']).err
        t.ok(err.length >= 1, 'at least one more error reported again')
        t.equal(err[0].params.stack_trace, undefined, 'timeout error stack not reported again')
        t.ok(err[0].params.browser_stack_hash !== 0, 'timeout error browser stack hash reported')
      }, 100)

      if (shouldExpectXHRErrors) {
        t.ok(errors['xhr on load event listener'], 'xhr on load event listener error')
      }
    }
  })

  throw new Error('Uncaught Thrown')
}
