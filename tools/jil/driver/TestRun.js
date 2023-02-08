/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var newrelic = require("newrelic");
const wd = require("wd");
const through = require("through");
const { EventEmitter } = require("events");
const TestHarness = require("./harness");
const { isSauceConnected } = require("../util/external-services");
const observeTapeTest = require("./TapeTestObserver");

/**
 * Runs tests on a specific browser session (represented by TestRun instance)
 */
class TestRun extends EventEmitter {
  /**
   * @param {string}  Selenium server URL
   * @param {Object}  Object representing the browser and platform
   */
  constructor(env, router, config) {
    super();

    this.env = env;
    this.router = router;
    this.config = config;
    this.connectionInfo = env.connectionInfo;
    this.browserSpec = env.browserSpec;
    this.stream = through();
    this.browser = null; // browser connection

    this.initialized = false;
    this.currentTest = null;
    this.allOk = true;
  }

  initialize(rootUrl, cb) {
    let self = this;
    let browserSpec = this.browserSpec;
    let numberOfRetries = 4;

    let browser = this._initializeBrowser(this.connectionInfo, this.browserSpec, rootUrl, numberOfRetries);

    browser.browserSpec = this.browserSpec;
    browser.stream = this.stream;

    browser
      .then(() => {
        browser.match = (spec) => browserSpec.match(spec);
        browser.hasFeature = (feature) => browserSpec.hasFeature(feature);
        self.browser = browser;

        self.harness = new TestHarness(false);
        self.harness.stream.pipe(self.browser.stream);

        self.initialized = true;
        cb(null);
      })
      .catch((err) => {
        newrelic.noticeError(err, self.browserSpec.desired);
        cb(err);
      });
  }

  run() {
    if (!this.initialized) {
      throw new Error("Not initialized");
    }

    if (!this.harness.started) {
      this.harness.run();
    }
  }

  _queueTest(deviceTest, attempt) {
    let self = this;
    let harness = this.harness;
    let browser = this.browser;
    let browserSpec = this.browserSpec;
    let router = this.router;

    let test = deviceTest.test;
    let name = test.name;
    let fn = test.fn;

    var numberOfAttempts = 3;
    if (!this.config.retry) {
      numberOfAttempts = 1;
    }

    if (!attempt) {
      attempt = 1;
    }

    let opts = {
      timeout: this.config.tapeTimeout || 85000,
    };

    let testName = name;
    if (attempt > 1) {
      testName += ` (retry ${attempt - 1})`;
    }

    harness.addTest(testName, opts, (t) => {
      let startTime = Date.now();

      harness.pause();
      observeTapeTest(t, onTestFinished, onTestResult);

      function onTestFinished(passed) {
        self.allOk = self.allOk && (passed || attempt < numberOfAttempts);
        self.currentTest = null;
        let endTime = Date.now();

        if (passed) {
          harness.resume();
        } else {
          scheduleRetry();
        }
        notifyTestFinished(passed, endTime - startTime);
      }

      function onTestResult(result) {
        if (!result.ok) {
          var eventData = {
            browserName: browserSpec.desired.browserName,
            browserVersion: browserSpec.desired.version || null,
            platformName: browserSpec.desired.platform || browserSpec.desired.platformName,
            platformVersion: browserSpec.desired.platformVersion || null,
            build: browserSpec.desired.build,
            testName: name,
            retry: attempt - 1,
            name: result.name,
            ok: result.ok,
            operator: result.operator,
            file: result.file || null,
            line: result.line || null,
            column: result.column || null,
            functionName: result.functionName || null,
          };
          newrelic.recordCustomEvent("JilTestResult", eventData);
        }
      }

      function notifyTestFinished(passed, duration) {
        self.emit("testFinished", self, test, {
          passed: passed,
          retry: attempt - 1,
          duration: duration,
        });
      }

      function scheduleRetry() {
        if (attempt < numberOfAttempts) {
          harness.clear();
          self._queueTest(deviceTest, attempt + 1);
        }
      }

      let id = self._generateID();
      try {
        fn(t, browser, router.handle(id, false, browser));
      } catch (e) {
        newrelic.noticeError(e);
        t.error(e);
        t.end();
      }
    });
  }

  addTest(test) {
    this._queueTest(test);
  }

  close(done) {
    let self = this;

    self.harness.close();

    if (isSauceConnected()) {
      self.browser.sauceJobStatus(self.allOk);
    }
    self.browser
      .quit(() => {
        self.emit("closed", self);
        if (done) done();
      })
      .catch((err) => {
        self.emit("closed", self);
        if (done) done(err);
      });
  }

  _initializeBrowser(connectionInfo, browserSpec, rootURL, numberOfRetries, retry) {
    if (!retry) retry = 0;
    return wd
      .promiseChainRemote(connectionInfo)
      .init(browserSpec.desired)
      .initNewSession(browserSpec, this)
      .get(rootURL)
      .catch((err) => {
        retry++;
        if (retry > numberOfRetries) {
          throw err;
        }

        return this._initializeBrowser(connectionInfo, browserSpec, rootURL, numberOfRetries, retry);
      });
  }

  _generateID() {
    return Math.random().toString(36).slice(2);
  }
}

module.exports = TestRun;
