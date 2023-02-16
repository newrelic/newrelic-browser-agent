/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const Driver = require('./Driver')
const TestRun = require('./TestRun')
var newrelic = require('newrelic')

class DefaultDriver extends Driver {
  run (done) {
    let testRuns = []
    for (let testEnv of this.testEnvs) {
      let testRun = new TestRun(testEnv, this)
      this.output.addChild(testRun.browserSpec.toString(), testRun.stream)
      testRuns.push(testRun)
    }

    var driver = this
    let remaining = testRuns.length
    if (!this.concurrent) {
      this.concurrent = remaining
    }

    var queue = []
    var running = new Set()
    for (let run of testRuns) {
      queue.push(run)
    }

    if (queue.length > 0) {
      dequeue()
    } else {
      shutdown()
    }

    function dequeue () {
      while (running.size < driver.concurrent && queue.length > 0) {
        let testRun = queue.pop()
        running.add(testRun)
        driver.runTestRun(testRun, driver.tests, false, onBrowserFinished)
      }
    }

    function onBrowserFinished (err, testRun) {
      if (err) {
        driver.output.log(`# got error while running tests (${testRun.browserSpec.toString()})`)
        newrelic.noticeError(err)
      }

      running.delete(testRun)
      driver.output.log(`# finished a browser, ${running.size} remaining`)

      if (running.size === 0 && queue.length === 0) {
        if (driver.failedTests.length > 0) {
          // re-run failed tests
          driver.runDeviceTests(driver.failedTests, (err) => {
            newrelic.noticeError(err)
            shutdown()
          })
        } else {
          shutdown()
        }
      } else {
        dequeue()
      }
    }

    function shutdown () {
      driver.output.log('# stopping asset server')
      driver.assetServer.stop()
      driver.output.finish()
      newrelic.shutdown({ collectPendingData: true, timeout: 3000 }, done)
    }
  }
}

module.exports = DefaultDriver
