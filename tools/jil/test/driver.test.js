/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const test = require('tape')
const path = require('path')
const Parser = require('tap-parser')

var require = module.require('es6-require')(module, null, path.resolve(__dirname, '..'))

// var Driver = require('../driver/index.es6')
var DefaultDriver = require('../driver/DefaultDriver.es6')
var ParallelDriver = require('../driver/ParallelDriver.es6')
var TestRun = require('../driver/TestRun.es6')
var Output = require('../output').default

// mocks
TestRun.prototype._initializeBrowser = _initializeBrowser
function _initializeBrowser(connectionInfo, browserSpec, rootURL, numberOfRetries, retry) {
  let retVal = Promise.resolve({})
  retVal.sauceJobStatus = () => {}
  retVal.quit = (fn) => {
    fn()
    return Promise.resolve({})
  }
  return retVal
}

runTests('DefaultDriver')
runTests('ParallelDriver')

function runTests(driverClass) {
  test('basic', function (t) {
    // run a fake test so we can assert on the output
    runTest(t, function (driver) {
      driver.test('a test', null, (t, browser, router) => {
        t.ok(true)
        t.end()
      })
    }, (t, result) => {
      t.equal(result.count, result.pass, 'All tests passed')
    }, driverClass)
  })

  test('basic with two browsers', function (t) {
    // run a fake test so we can assert on the output
    runTest(t, function (driver) {
      driver.addBrowser(null, {browserName: 'chrome'})
      driver.addBrowser(null, {browserName: 'firefox'})

      driver.test('a test', null, (t, browser, router) => {
        t.ok(true)
        t.end()
      })
    }, (t, result) => {
      t.equal(result.count, result.pass, 'All tests passed')
    }, driverClass)
  })

  test('pass failed test on final retry run', (t) => {
    // run a fake test so we can assert on the output
    let counter = 0
    runTest(t, function (driver) {
      driver.config.retry = true

      driver.test('a test', null, (t, browser, router) => {
        t.ok(++counter > 3)
        t.end()
      })
    }, (t, result) => {
      t.equal(counter, 4, 'ran test four times')
      t.equal(result.count, result.pass, 'one passed test')
      t.equal(result.failed || 0, 0, 'no failed test')
    }, driverClass)
  })

  test('first two failed attempts are ignored', (t) => {
    // run a fake test so we can assert on the output
    runTest(t, function (driver) {
      driver.config.retry = true

      let counter = 0
      driver.test('a test', null, (t, browser, router) => {
        t.ok(++counter === 3)
        t.end()
      })
    }, (t, result) => {
      t.equal(result.count, result.pass, 'All tests passed')
    }, driverClass)
  })

  test('test fails without retry', (t) => {
    // run a fake test so we can assert on the output
    runTest(t, function (driver) {
      driver.test('a test', null, (t, browser, router) => {
        t.ok(false)
        t.end()
      })
    }, (t, result) => {
      t.notOk(result.pass, 'did not pass')
      t.equal(result.count, result.fail, 'one failed test')
    }, driverClass)
  })

  test('test fails with retry', (t) => {
    // run a fake test so we can assert on the output
    runTest(t, function (driver) {
      driver.config.retry = true
      driver.test('a test', null, (t, browser, router) => {
        t.ok(false)
        t.end()
      })
    }, (t, result) => {
      t.notOk(result.pass, 'did not pass')
      t.equal(result.count, result.fail, 'one failed test')
    }, driverClass)
  })

  test('two tests, first fails, with retry', (t) => {
    // run a fake test so we can assert on the output
    runTest(t, function (driver) {
      driver.config.retry = true

      driver.test('test 1', null, (t, browser, router) => {
        t.ok(false)
        t.end()
      })

      driver.test('test 2', null, (t, browser, router) => {
        t.ok(true)
        t.end()
      })
    }, (t, result) => {
      t.equal(result.count, 2, 'total of two tests')
      t.equal(result.fail, 1, 'one test failed')
      t.equal(result.pass, 1, 'one test passed')
    }, driverClass)
  })

  test('incorrect plan fails test', (t) => {
    // run a fake test so we can assert on the output
    runTest(t, function (driver) {
      driver.test('test with incorrect plan', null, (t, browser, router) => {
        t.plan(2)
        t.ok(true, 'one assert')
        t.end()
      })
    }, (t, result) => {
      t.equal(result.fail, 1, 'one failed assert')
    }, driverClass)
  })

  test('incorrect plan does not fail test on first two attempts', (t) => {
    // run a fake test so we can assert on the output
    runTest(t, function (driver) {
      driver.config.retry = true

      let counter = 0
      driver.test('a test', null, (t, browser, router) => {
        t.plan(2)
        t.ok(true)
        counter++
        if (counter === 3) {
          t.ok(true)
        }
        t.end()
      })
    }, (t, result) => {
      t.equal(result.pass, result.count, 'All tests passed')
    }, driverClass)
  })

  test('timed out test fails test', (t) => {
    // run a fake test so we can assert on the output
    runTest(t, function (driver) {
      driver.config.tapeTimeout = 100
      driver.test('a test', null, (t, browser, router) => {
        setTimeout(() => {
          t.ok(true)
          t.end()
        }, 200)
      })
    }, (t, result) => {
      t.equal(result.fail, 1, 'one failed assert')
    }, driverClass)
  })

  test('timed out test does not fail if on first two attempts', (t) => {
    // run a fake test so we can assert on the output
    runTest(t, function (driver) {
      driver.config.tapeTimeout = 100
      driver.config.retry = true

      let count = 0
      driver.test('a test', null, (t, browser, router) => {
        ++count
        if (count < 3) {
          setTimeout(run, 200)
        } else {
          run()
        }

        function run () {
          t.ok(true)
          t.end()
        }
      })
    }, (t, result) => {
      t.equal(result.pass, result.count)
    }, driverClass)
  })

  test('when plan is met, the test passes', (t) => {
    runTest(t, (driver) => {
      driver.test('test case', (t) => {
        t.plan(1)
        t.ok(true)
        t.end()
      })
    }, (t, result) => {
      t.equal(result.pass, result.count, 'should have seen one assertion')
    }, driverClass)
  })

  test('when plan is not met when test ends, the test fails', (t) => {
    runTest(t, (driver) => {
      driver.test('test case', (t) => {
        t.plan(2)
        t.ok(true)
        t.end()
      })
    }, (t, result) => {
      t.notOk(result.ok, 'test should have failed')
    }, driverClass)
  })

  test('when plan exceeds before ending test, the test fails', (t) => {
    runTest(t, (driver) => {
      driver.test('test case', (t) => {
        t.plan(1)
        t.ok(true)
        t.ok(true)
        t.end()
      })
    }, (t, result) => {
      t.notOk(result.ok, 'test should have failed')
    }, driverClass)
  })

  test('assertion after test ended is ignored', (t) => {
    // run a fake test so we can assert on the output
    runTest(t, function (driver) {
      driver.test('a test', null, (t, browser, router) => {
        t.plan(1)
        t.ok(true)
        t.end()
        t.ok(true)
      })
    }, (t, result) => {
      t.equal(result.pass, result.count)
    }, driverClass)
  })
}

function runTest(t, setup, inspect, driverName) {
  // configs
  const config = {
    host: 'bam-test-1.nr-local.net',
    formatter: 'raw',
    quiet: true
  }

  let output = new Output(config)
  let driver
  if (driverName === 'DefaultDriver') {
    driver = new DefaultDriver(config, output)
  } else if (driverName === 'ParallelDriver') {
    driver = new ParallelDriver(config, output)
  }

  t.test(driverName, t => {
    runDriverTest(driver)
      .then(result => {
        // console.log(result)
        inspect(t, result.parsed)
        t.end()
      })
  })

  function runDriverTest(driver) {
    var mainResolve
    var promise = new Promise((resolve) => {
      mainResolve = resolve
    })

    // capture output
    let raw = ''
    let parser = new Parser(result => {
      mainResolve({ parsed: result, raw: raw })
    })
    parser.on('line', line => { raw += line })
    driver.output.formatter.stream.pipe(parser)

    // add a test
    setup(driver)

    // add one browser if test did not specify
    if (driver.testEnvs.length === 0) {
      driver.addBrowser(null, {browserName: 'chrome'})
    }

    driver.run(function() {
      // t.ok(true)
      // t.end()
    })

    return promise
  }
}
