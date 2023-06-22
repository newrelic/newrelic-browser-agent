import fs from 'fs-extra'
import path from 'path'
import url from 'url'
import istanbulCoverage from 'istanbul-lib-coverage'
import istanbulReport from 'istanbul-lib-report'
import reports from 'istanbul-reports'
import logger from '@wdio/logger'
import { v4 as UUIDv4 } from 'uuid'
import { getBrowserName, getBrowserVersion } from '../../browsers-lists/utils.mjs'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))
const log = logger('istanbul-coverage')

export default class IstanbulCoverage {
  #coverageDir = path.join(
    path.resolve(__dirname, '../../../'),
    'coverage-e2e'
  )

  #coverageCache = istanbulCoverage.createCoverageMap({})

  #browserName

  #browserVersion

  #enabled = false

  constructor (options) {
    if (options.coverage) {
      this.#enabled = options.coverage
    }
  }

  /**
   * Runs in the scope of the main WDIO process before testing starts. This is used to
   * ensure the coverage directory is empty before the tests are ran.
   */
  async onPrepare () {
    if (!this.#enabled) return

    await fs.emptyDir(this.#coverageDir)
  }

  /**
   * Runs in the scope of a WDIO worker process. This defines the custom collectCoverage command
   * that will be used to collect coverage information from the browser. This command can be used
   * to collect coverage within a test before a navigation is performed and/or at the end of a
   * test in an `afterEach()`.
   */
  async before () {
    this.#browserName = getBrowserName(browser.capabilities)
    this.#browserVersion = getBrowserVersion(browser.capabilities)

    /**
     * Used to collect coverage information from the currently loaded page.
     */
    browser.addCommand('collectCoverage', async () => {
      if (!this.#enabled) return

      const coverage = await browser.execute(function () {
        if (typeof window !== 'undefined' && window.__coverage__) {
          return window.__coverage__
        } else if (typeof WorkerGlobalScope !== 'undefined' && WorkerGlobalScope.__coverage__) {
          return WorkerGlobalScope.__coverage__
        } else if (typeof global !== 'undefined' && global.__coverage__) {
          return global.__coverage__
        } else if (typeof self !== 'undefined' && self.__coverage__) {
          return self.__coverage__
        }

        return null
      })

      if (coverage) {
        this.#coverageCache.merge(coverage)
      }
    })
  }

  /**
   * Runs in the scope of a WDIO worker process before a WebdriverIO command is executed.
   * This attempts to ensure we capture coverage before the browser navigates away from the
   * current page.
   */
  async beforeCommand (commandName) {
    if (!this.#enabled) return

    if (commandName === 'navigateTo') {
      await browser.collectCoverage()
    }
  }

  /**
   * Runs in the scope of a WDIO worker process after all tests in that worker have completed
   * and before the worker is shutdown. Used to aggregate all the coverage results for the current spec file.
   */
  async after () {
    if (!this.#enabled) return

    const outputFile = path.join(
      this.#coverageDir,
      `raw/${this.#browserName}_${this.#browserVersion}/${UUIDv4()}.json`
    )

    await fs.ensureDir(path.dirname(outputFile))

    await fs.writeJSON(outputFile, this.#coverageCache.toJSON())
  }

  /**
   * Runs in the scope of the main WDIO process after all testing has completed. This aggregates
   * all the coverage files into a single report.
   */
  async onComplete () {
    const coverageStart = performance.now()

    if (!this.#enabled) return

    const coverageFiles = await this.#findCoverageFiles(path.join(this.#coverageDir, 'raw'))
    for (const coverageFile of coverageFiles) {
      this.#coverageCache.merge(
        await fs.readJSON(coverageFile)
      )
    }

    const lcovContext = istanbulReport.createContext({
      dir: this.#coverageDir,
      coverageMap: this.#coverageCache
    })
    const lcovReport = reports.create('lcov')
    lcovReport.execute(lcovContext)

    log.info(`Coverage generated in ${Math.round(performance.now() - coverageStart)}ms`)
  }

  async #findCoverageFiles (dirPath) {
    let coverageFiles = await fs.readdir(dirPath, { withFileTypes: true })

    for (let index = 0; index < coverageFiles.length; index++) {
      const entry = coverageFiles[index]

      if (typeof entry === 'string') {
        break
      }

      if (entry.isDirectory()) {
        coverageFiles.splice(index, 1)
        index--
        coverageFiles = coverageFiles.concat(await this.#findCoverageFiles(path.join(dirPath, entry.name)))
      } else if (!entry.isFile() || !entry.name.endsWith('.json')) {
        coverageFiles.splice(index, 1)
        index--
      }
    }

    return coverageFiles.map(entry => {
      if (typeof entry === 'string') {
        return entry
      } else {
        return path.join(dirPath, entry.name)
      }
    })
  }
}
export const launcher = IstanbulCoverage
