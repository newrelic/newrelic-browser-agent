import WDIOReporter from '@wdio/reporter'
import path from 'path'
import url from 'url'
import newrelic from 'newrelic'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

export default class NewrelicReporter extends WDIOReporter {
  #runner
  #suite

  onRunnerStart (runner) {
    this.#runner = runner
  }

  onSuiteStart (suite) {
    this.#suite = suite
  }

  onTestPass (testStat) {
    this.#reportTest(testStat)
  }

  onTestFail (testStat) {
    this.#reportTest(testStat)
  }

  #reportTest (testStat) {
    const eventData = {
      browserName:
        this.#runner.config.capabilities.browserName ||
        this.#runner.capabilities.browserName,
      browserVersion:
        this.#runner.config.capabilities.browserVersion ||
        this.#runner.capabilities.browserVersion ||
        null,
      platformName:
        this.#runner.config.capabilities.platformName ||
        this.#runner.capabilities.platformName ||
        null,
      build:
        this.#runner.config.capabilities['jil:buildIdentifier'] ||
        this.#runner.capabilities['jil:buildIdentifier'],
      testSuite: this.#suite.title,
      testName: testStat.title,
      testFileName: path.relative(
        path.resolve(__dirname, '../../../'),
        this.#suite.file
      ),
      retries: testStat.retries,
      passed: testStat.state === 'passed',
      duration:
        new Date(testStat.end).getTime() - new Date(testStat.start).getTime()
    }
    newrelic.recordCustomEvent('JilTestResult', eventData)
  }
}
