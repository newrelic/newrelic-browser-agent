/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var newrelic = require('newrelic')
const Driver = require('./Driver')
const TestRun = require('./TestRun')
const DeviceTest = require('./DeviceTest')

class ParallelDriver extends Driver {
  run (cb) {
    const driver = this
    const maxConcurrentRuns = driver.concurrent || this.testEnvs.length
    const limitToStartNewSession = this.config.sessionTestThreshold || 10

    var numberOfAttempts = 3
    if (!this.config.retry) {
      numberOfAttempts = 1
    }

    // create device tests for all environments
    var testsMap = [] // this could be a Map, but we want it to be sortable
    for (let testEnv of this.testEnvs) {
      let envTests = [testEnv, []]
      for (let test of this.tests) {
        if (!test.spec || test.spec.match(testEnv.browserSpec)) {
          envTests[1].push(new DeviceTest(test, testEnv.browserSpec))
        }
      }
      testsMap.push(envTests)
    }

    let testRuns = new Set()
    check()

    function check () {
      if (testRuns.size >= maxConcurrentRuns) return

      let env = getEnvNotStarted()
      if (env) {
        startEnv(env)
        check()
        return
      }

      env = getEnvToParallelize()
      if (env) {
        startEnv(env)
        check()
        return
      }

      if (testRuns.size === 0) {
        if (driver.failedTests.length > 0) {
          // re-run failed tests
          driver.runDeviceTests(driver.failedTests, (err) => {
            newrelic.noticeError(err)
            shutdown()
          })
        } else {
          shutdown()
        }
      }
    }

    // find an environment that has not been started yet
    function getEnvNotStarted () {
      for (let [env, tests] of testsMap) {
        if (tests.length > 0 && getEnvSessionCount(env) === 0) {
          return env
        }
      }
      return null
    }

    // find an environment that can be parallelized
    function getEnvToParallelize () {
      // sort by number of remaining tests
      testsMap.sort((a, b) => b[1].length - a[1].length)
      for (let [env] of testsMap) {
        if (canParallelize(env)) {
          return env
        }
      }
      return null
    }

    function getEnvSessionCount (env) {
      let count = 0
      for (let testRun of testRuns.values()) {
        if (testRun.browserSpec.same(env.browserSpec)) {
          count++
        }
      }
      return count
    }

    function canParallelize (env) {
      let tests = getEnvTests(env)
      let sessionCount = getEnvSessionCount(env)
      let hasEnoughTests = enoughTests(tests)

      let otherMobileExist = false
      for (let [key, value] of testsMap) {
        if (key !== env && isMobile(key) && enoughTests(value)) {
          otherMobileExist = true
        }
      }

      if (!hasEnoughTests) {
        return false
      } else if (isMobile(env)) {
        return true
      } else if (otherMobileExist) {
        return false
      } else {
        return true
      }

      function isMobile (env) {
        return env.browserSpec.platformName === 'ios' || env.browserSpec.platformName === 'android'
      }

      function enoughTests (tests) {
        return (tests.length / sessionCount) > limitToStartNewSession
      }
    }

    function startEnv (env) {
      driver.output.log(`# starting ${env.toString()}`)
      let testRun = new TestRun(env, driver)

      testRun.on('testFinished', onTestFinished)
      testRun.on('closed', onClosed)

      driver.output.addChild(testRun.browserSpec.toString(), testRun.stream)
      testRuns.add(testRun)

      driver.ready(() => {
        testRun.initialize(driver.assetServer.urlFor('/'), (err) => {
          if (err) {
            return cb(err)
          }
          testRun.run()
          runNextTest(testRun)
        })
      })
    }

    function onTestFinished (testRun, test, result) {
      let browserSpec = testRun.browserSpec
      var eventData = {
        browserName: browserSpec.desired.browserName,
        browserVersion: browserSpec.desired.version || null,
        platformName: browserSpec.desired.platform || browserSpec.desired.platformName,
        platformVersion: browserSpec.desired.platformVersion || null,
        build: browserSpec.desired.build,
        testName: test.name,
        retry: result.retry,
        passed: result.passed,
        duration: result.duration,
        remaining: getRemaining(testRun.env)
      }
      newrelic.recordCustomEvent('JilTest', eventData)

      if (result.passed) {
        runNextTest(testRun)
      } else if (result.retry === (numberOfAttempts - 1)) {
        if (driver.config.retry) {
          testRun.harness.clear()
          driver.output.log(`# storing failed test for later retry: ${testRun.browserSpec.toString()} - ${test.name}`)
          driver.failedTests.push(new DeviceTest(test, testRun.browserSpec))
        }
        testRun.harness.resume()
        runNextTest(testRun)
      }
    }

    function runNextTest (testRun) {
      let tests = getEnvTests(testRun.env)
      if (tests.length > 0) {
        let test = tests.shift()
        testRun.addTest(test)
      } else {
        testRun.close()
      }
    }

    function getRemaining (env) {
      return getEnvTests(env).length
    }

    function getEnvTests (env) {
      for (let [key, tests] of testsMap) {
        if (key === env) {
          return tests
        }
      }
      return null
    }

    function onClosed (testRun) {
      driver.output.log(`# closed ${testRun.env.toString()}`)
      testRuns.delete(testRun)
      check()
    }

    function shutdown () {
      driver.output.log('# stopping asset server')
      driver.assetServer.stop()
      driver.output.finish()
      newrelic.shutdown({ collectPendingData: true, timeout: 3000 }, cb)
    }
  }
}

module.exports = ParallelDriver
